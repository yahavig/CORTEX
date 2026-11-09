// Each provider knows how to verify a secret and describe the account.
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Verified {
  username?: string;
  externalId?: string;
  meta?: Record<string, unknown>;
  expiresAt?: Date | null;
  secret?: string; // a replacement secret (e.g. a refreshed token)
}

const IG = 'https://graph.instagram.com';
const DAY = 86_400_000;

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(body?.error?.message ?? body?.detail?.message ?? `HTTP ${res.status}`);
  return body;
}

// Instagram API with Instagram Login: a long-lived token (60 days) from the Meta app dashboard.
export const instagram = {
  async verify(token: string): Promise<Verified> {
    const me = await json(`${IG}/me?fields=user_id,username,account_type,profile_picture_url,followers_count,media_count&access_token=${encodeURIComponent(token)}`);
    // Refresh right away when possible to learn the real expiry (fails for tokens < 24h old).
    const refreshed = await instagram.refresh(token).catch(() => null);
    return {
      username: me.username,
      externalId: me.user_id ?? me.id,
      meta: { accountType: me.account_type, picture: me.profile_picture_url, followers: me.followers_count, media: me.media_count },
      expiresAt: refreshed?.expiresAt ?? new Date(Date.now() + 59 * DAY),
      secret: refreshed?.secret,
    };
  },
  async refresh(token: string): Promise<Verified> {
    const r = await json(`${IG}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    return { secret: r.access_token, expiresAt: new Date(Date.now() + Number(r.expires_in ?? 0) * 1000) };
  },
  async media(token: string, limit = 30) {
    const r = await json(`${IG}/me/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp&limit=${limit}&access_token=${encodeURIComponent(token)}`);
    return (r.data ?? []) as { id: string; caption?: string; media_type: string; media_product_type?: string; permalink: string; thumbnail_url?: string; media_url?: string; timestamp: string }[];
  },
};

export const elevenlabs = {
  async verify(key: string): Promise<Verified> {
    const u = await json('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } });
    const s = u.subscription ?? {};
    return {
      username: u.first_name ?? u.user_id ?? 'ElevenLabs',
      externalId: u.user_id,
      meta: { tier: s.tier, characterCount: s.character_count, characterLimit: s.character_limit, resetAt: s.next_character_count_reset_unix ? s.next_character_count_reset_unix * 1000 : null },
      expiresAt: null,
    };
  },
};

// Claude Code uses its own login; we only check that a headless call works.
export const claude = {
  verify(): Promise<Verified> {
    const bin = process.env.CLAUDE_BIN ?? join(homedir(), '.local/bin/claude');
    return new Promise((resolve, reject) => {
      const child = spawn(bin, ['-p', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--model', 'haiku'], { cwd: homedir() });
      let out = '';
      const timer = setTimeout(() => (child.kill(), reject(new Error('אין תשובה תוך 60 שניות'))), 60_000);
      child.stdout.on('data', (d) => (out += d));
      child.on('error', (e) => (clearTimeout(timer), reject(e)));
      child.on('close', () => {
        clearTimeout(timer);
        try {
          const r = JSON.parse(out);
          if (r.is_error) reject(new Error(/login/i.test(r.result) ? 'לא מחובר. בטרמינל: ~/.local/bin/claude ואז /login' : r.result));
          else resolve({ username: 'Claude Code', meta: { model: Object.keys(r.modelUsage ?? {})[0] ?? null }, expiresAt: null });
        } catch {
          reject(new Error(out.slice(0, 200) || 'Claude Code לא נמצא'));
        }
      });
      child.stdin.end('Reply with: ok');
    });
  },
};
