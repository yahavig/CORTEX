import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { PILLARS, VIDEO_MODES, VIDEO_STAGES, type Stage } from '../../shared/constants.ts';
import { db, schema } from '../db/index.ts';
import { cancelPrep, markPublished, prepareForPublishing } from '../services/publish.ts';
import { listProjects } from '../services/projects.ts';

type Video = typeof schema.videos.$inferSelect;
type Patch = Partial<typeof schema.videos.$inferInsert>;

const STAGE_INDEX = Object.fromEntries(VIDEO_STAGES.map((s, i) => [s, i])) as Record<Stage, number>;
const READY = STAGE_INDEX.ready;

const TEXT_FIELDS = ['title', 'hookType', 'mechanism', 'notes', 'symbol', 'caption', 'experimentNote'] as const;
const DATE_FIELDS = ['scheduledAt', 'publishedAt'] as const;
const BOOL_FIELDS = ['isExperiment', 'alsoOnTiktok'] as const;

function slugify(title: string) {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ascii.length >= 3 ? ascii : `idea-${Date.now().toString(36)}`;
}

function uniqueSlug(base: string, exceptId?: number) {
  let slug = base;
  for (let n = 2; ; n++) {
    const hit = db.select({ id: schema.videos.id }).from(schema.videos).where(eq(schema.videos.slug, slug)).get();
    if (!hit || hit.id === exceptId) return slug;
    slug = `${base}-${n}`;
  }
}

// Whitelisted, typed patch from untrusted JSON.
function parsePatch(body: Record<string, unknown>): Patch | string {
  const patch: Patch = {};
  for (const k of TEXT_FIELDS) if (k in body) patch[k] = (body[k] == null ? null : String(body[k]).slice(0, 10_000)) as never;
  for (const k of DATE_FIELDS) {
    if (!(k in body)) continue;
    if (body[k] == null || body[k] === '') patch[k] = null;
    else {
      const d = new Date(String(body[k]));
      if (Number.isNaN(d.getTime())) return `${k}: invalid date`;
      patch[k] = d;
    }
  }
  for (const k of BOOL_FIELDS) if (k in body) patch[k] = Boolean(body[k]);
  if ('stage' in body) {
    if (!VIDEO_STAGES.includes(body.stage as Stage)) return 'stage: invalid';
    patch.stage = body.stage as Stage;
  }
  if ('pillar' in body) {
    if (body.pillar != null && !PILLARS.includes(body.pillar as never)) return 'pillar: invalid';
    patch.pillar = (body.pillar as Patch['pillar']) ?? null;
  }
  if ('mode' in body) {
    if (!VIDEO_MODES.includes(body.mode as never)) return 'mode: invalid';
    patch.mode = body.mode as Patch['mode'];
  }
  if ('slug' in body) {
    const s = String(body.slug ?? '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(s)) return 'slug: lowercase English letters, digits and dashes only';
    patch.slug = s;
  }
  if (patch.title !== undefined && !patch.title?.trim()) return 'title: required';
  return patch;
}

// Side effects of a stage or schedule change: iCloud folder, reminder, publish mark.
async function afterChange(before: Video, after: Video): Promise<Video> {
  const was = STAGE_INDEX[before.stage];
  const now = STAGE_INDEX[after.stage];
  if (after.stage === 'ready') {
    const scheduleChanged = before.scheduledAt?.getTime() !== after.scheduledAt?.getTime();
    const relevant = before.stage !== 'ready' || scheduleChanged || before.caption !== after.caption || before.slug !== after.slug;
    if (relevant) return prepareForPublishing(after);
  } else if (now >= STAGE_INDEX.published && was < STAGE_INDEX.published) {
    return markPublished(after);
  } else if (was === READY && now < READY) {
    return cancelPrep(after);
  }
  return after;
}

export const videos = new Hono();

videos.get('/api/videos', (c) =>
  c.json(db.select().from(schema.videos).orderBy(desc(schema.videos.updatedAt)).all()),
);

videos.get('/api/projects', (c) => c.json(listProjects()));

videos.post('/api/videos', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = parsePatch(body);
  if (typeof patch === 'string') return c.json({ error: patch }, 400);
  if (!patch.title?.trim()) return c.json({ error: 'title: required' }, 400);
  const slug = uniqueSlug(patch.slug ?? slugify(patch.title));
  const row = db.insert(schema.videos).values({ ...patch, title: patch.title, slug }).returning().get();
  return c.json(row, 201);
});

videos.patch('/api/videos/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const before = db.select().from(schema.videos).where(eq(schema.videos.id, id)).get();
  if (!before) return c.json({ error: 'not found' }, 404);
  const patch = parsePatch((await c.req.json().catch(() => ({}))) as Record<string, unknown>);
  if (typeof patch === 'string') return c.json({ error: patch }, 400);
  if (patch.slug) patch.slug = uniqueSlug(patch.slug, id);
  const after = db
    .update(schema.videos)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.videos.id, id))
    .returning()
    .get()!;
  return c.json(await afterChange(before, after));
});

// Re-run the iCloud copy + reminder (e.g. after a new render).
videos.post('/api/videos/:id/prepare', async (c) => {
  const v = db.select().from(schema.videos).where(eq(schema.videos.id, Number(c.req.param('id')))).get();
  if (!v) return c.json({ error: 'not found' }, 404);
  return c.json(await prepareForPublishing(v));
});

videos.delete('/api/videos/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const v = db.select().from(schema.videos).where(eq(schema.videos.id, id)).get();
  if (!v) return c.json({ error: 'not found' }, 404);
  if (v.reminderId) await cancelPrep(v);
  db.delete(schema.videos).where(eq(schema.videos.id, id)).run();
  return c.json({ ok: true });
});
