// Connect / disconnect / check accounts, and keep the Instagram token fresh.
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { accounts } from './schema.ts';
import { deleteSecret, getSecret, setSecret } from './keychain.ts';
import { claude, elevenlabs, instagram, type Verified } from './providers.ts';

export const PROVIDERS = ['instagram', 'elevenlabs', 'claude'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type Account = typeof accounts.$inferSelect;

const DAY = 86_400_000;

function save(provider: Provider, patch: Partial<Account>) {
  return db
    .insert(accounts)
    .values({ provider, ...patch })
    .onConflictDoUpdate({ target: accounts.provider, set: patch })
    .returning()
    .get();
}

export function listAccounts(): Account[] {
  const rows = db.select().from(accounts).all();
  return PROVIDERS.map((p) => rows.find((r) => r.provider === p) ?? ({ provider: p, status: 'disconnected' } as Account));
}

async function verify(provider: Provider, secret: string | null): Promise<Verified> {
  if (provider === 'claude') return claude.verify();
  if (!secret) throw new Error('חסר מפתח');
  return provider === 'instagram' ? instagram.verify(secret) : elevenlabs.verify(secret);
}

function applied(provider: Provider, v: Verified, extra: Partial<Account> = {}) {
  return save(provider, {
    status: 'connected',
    username: v.username ?? null,
    externalId: v.externalId ?? null,
    meta: v.meta ?? null,
    expiresAt: v.expiresAt ?? null,
    checkedAt: new Date(),
    error: null,
    ...extra,
  });
}

export async function connect(provider: Provider, secret?: string) {
  const v = await verify(provider, secret?.trim() || null);
  if (provider !== 'claude') await setSecret(provider, v.secret ?? secret!.trim());
  return applied(provider, v, { connectedAt: new Date(), refreshedAt: v.secret ? new Date() : null });
}

export async function check(provider: Provider) {
  try {
    const v = await verify(provider, await getSecret(provider));
    if (v.secret) await setSecret(provider, v.secret);
    return applied(provider, v, v.secret ? { refreshedAt: new Date() } : {});
  } catch (err) {
    return save(provider, { status: 'error', error: (err as Error).message, checkedAt: new Date() });
  }
}

export async function disconnect(provider: Provider) {
  await deleteSecret(provider);
  db.delete(accounts).where(eq(accounts.provider, provider)).run();
}

export const secretFor = (provider: Provider) => getSecret(provider);

// Long-lived Instagram tokens last 60 days; refresh when less than 50 remain.
export async function refreshIfDue() {
  const ig = db.select().from(accounts).where(eq(accounts.provider, 'instagram')).get();
  if (!ig || ig.status !== 'connected') return;
  if (ig.expiresAt && ig.expiresAt.getTime() - Date.now() > 50 * DAY) return;
  const token = await getSecret('instagram');
  if (!token) return;
  try {
    const r = await instagram.refresh(token);
    await setSecret('instagram', r.secret!);
    save('instagram', { expiresAt: r.expiresAt ?? null, refreshedAt: new Date(), error: null, status: 'connected' });
    console.log('[accounts] instagram token refreshed');
  } catch (err) {
    save('instagram', { error: `רענון הטוקן נכשל: ${(err as Error).message}` });
  }
}
