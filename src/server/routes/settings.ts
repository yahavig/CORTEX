import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { DEFAULT_SLOTS, DEFAULT_WPS, type Slot } from '../../shared/constants.ts';
import { DEFAULT_FORMULA } from '../services/formula.ts';
import { db, schema } from '../db/index.ts';

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  return (row?.value as T | undefined) ?? fallback;
}

export function setSetting(key: string, value: unknown) {
  db.insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } })
    .run();
}

export const settings = new Hono();

settings.get('/api/settings/slots', (c) => c.json(getSetting<Slot[]>('slots', DEFAULT_SLOTS)));

settings.put('/api/settings/slots', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!Array.isArray(body) || body.length > 21) return c.json({ error: 'expected an array of slots' }, 400);
  const slots: Slot[] = [];
  for (const s of body as Slot[]) {
    if (!Number.isInteger(s?.weekday) || s.weekday < 0 || s.weekday > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s?.time))
      return c.json({ error: 'slot: weekday 0-6 and time HH:MM' }, 400);
    slots.push({ weekday: s.weekday, time: s.time });
  }
  slots.sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time));
  setSetting('slots', slots);
  return c.json(slots);
});

settings.get('/api/settings/formula', (c) => c.json({ formula: getSetting('formula', DEFAULT_FORMULA), isDefault: getSetting<string | null>('formula', null) === null }));

settings.put('/api/settings/formula', async (c) => {
  const { formula } = (await c.req.json().catch(() => ({}))) as { formula?: string | null };
  if (formula == null || !formula.trim()) db.delete(schema.settings).where(eq(schema.settings.key, 'formula')).run();
  else setSetting('formula', formula.slice(0, 20_000));
  return c.json({ formula: getSetting('formula', DEFAULT_FORMULA) });
});

settings.get('/api/settings/wps', (c) => c.json({ wps: getSetting('wps', DEFAULT_WPS) }));

settings.put('/api/settings/wps', async (c) => {
  const { wps } = (await c.req.json().catch(() => ({}))) as { wps?: number };
  if (typeof wps !== 'number' || wps < 1 || wps > 5) return c.json({ error: 'wps: 1–5' }, 400);
  setSetting('wps', wps);
  return c.json({ wps });
});
