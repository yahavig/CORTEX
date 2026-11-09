import { Hono } from 'hono';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { LESSON_STATUSES, SCRIPT_SECTIONS, type LessonStatus, type ScriptLine } from '../../shared/constants.ts';
import { db, schema } from '../db/index.ts';
import { enqueue, getJob } from '../jobs.ts';
import { renderBody, writeScriptFile } from '../services/scriptwriter.ts';
import { writeLessonsMd } from '../services/lessons.ts';

export const scripts = new Hono();

// ── Scripts ──

scripts.get('/api/videos/:id/scripts', (c) =>
  c.json(db.select().from(schema.scripts).where(eq(schema.scripts.videoId, Number(c.req.param('id')))).orderBy(desc(schema.scripts.version)).all()),
);

scripts.post('/api/videos/:id/scripts/generate', async (c) => {
  const id = Number(c.req.param('id'));
  if (!db.select().from(schema.videos).where(eq(schema.videos.id, id)).get()) return c.json({ error: 'not found' }, 404);
  const { feedback } = (await c.req.json().catch(() => ({}))) as { feedback?: string };
  return c.json(enqueue('script', { feedback: feedback?.slice(0, 5000) }, id), 202);
});

function cleanLines(input: unknown): ScriptLine[] | null {
  if (!Array.isArray(input)) return null;
  return input
    .filter((l) => l && SCRIPT_SECTIONS.includes(l.section) && typeof l.text === 'string')
    .map((l) => ({ section: l.section, tag: String(l.tag ?? '').replace(/[[\]]/g, '').trim(), text: l.text, visual: l.visual ? String(l.visual) : '' }));
}

// Manual edits change the version in place.
scripts.patch('/api/scripts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<typeof schema.scripts.$inferInsert> = {};
  for (const k of ['hook', 'caption', 'source'] as const) if (k in body) patch[k] = body[k] == null ? null : String(body[k]);
  if ('lines' in body) {
    const lines = cleanLines(body.lines);
    if (!lines) return c.json({ error: 'lines: invalid' }, 400);
    patch.lines = lines;
    patch.body = renderBody(lines);
  }
  const row = db.update(schema.scripts).set(patch).where(eq(schema.scripts.id, id)).returning().get();
  return row ? c.json(row) : c.json({ error: 'not found' }, 404);
});

// Approve: the one version that gets recorded. Copies the caption to the card and
// writes SCRIPT.md into the project folder.
scripts.post('/api/scripts/:id/approve', (c) => {
  const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, Number(c.req.param('id')))).get();
  if (!script) return c.json({ error: 'not found' }, 404);
  const video = db.select().from(schema.videos).where(eq(schema.videos.id, script.videoId)).get()!;
  db.update(schema.scripts).set({ approved: false }).where(and(eq(schema.scripts.videoId, video.id), ne(schema.scripts.id, script.id))).run();
  const approved = db.update(schema.scripts).set({ approved: true }).where(eq(schema.scripts.id, script.id)).returning().get()!;
  const advance = video.stage === 'idea' || video.stage === 'script';
  const updatedVideo = db
    .update(schema.videos)
    .set({ caption: script.caption ?? video.caption, stage: advance ? 'recording' : video.stage, updatedAt: new Date() })
    .where(eq(schema.videos.id, video.id))
    .returning()
    .get();
  const file = writeScriptFile(video, approved);
  return c.json({ script: approved, video: updatedVideo, file });
});

scripts.delete('/api/scripts/:id', (c) => {
  db.delete(schema.scripts).where(eq(schema.scripts.id, Number(c.req.param('id')))).run();
  return c.json({ ok: true });
});

// ── Jobs ──

scripts.get('/api/jobs/:id', (c) => {
  const job = getJob(Number(c.req.param('id')));
  return job ? c.json(job) : c.json({ error: 'not found' }, 404);
});

scripts.get('/api/jobs', (c) => {
  const videoId = c.req.query('videoId');
  const rows = db
    .select()
    .from(schema.jobs)
    .where(videoId ? eq(schema.jobs.videoId, Number(videoId)) : inArray(schema.jobs.status, ['queued', 'running']))
    .orderBy(desc(schema.jobs.id))
    .limit(20)
    .all();
  return c.json(rows);
});

// ── Lessons ──

scripts.get('/api/lessons', (c) => c.json(db.select().from(schema.lessons).orderBy(desc(schema.lessons.updatedAt)).all()));

function lessonPatch(body: Record<string, unknown>) {
  const patch: Partial<typeof schema.lessons.$inferInsert> = {};
  if ('rule' in body) patch.rule = String(body.rule ?? '').trim();
  if ('detail' in body) patch.detail = body.detail ? String(body.detail) : null;
  if ('status' in body && LESSON_STATUSES.includes(body.status as LessonStatus)) patch.status = body.status as LessonStatus;
  return patch;
}

scripts.post('/api/lessons', async (c) => {
  const patch = lessonPatch((await c.req.json().catch(() => ({}))) as Record<string, unknown>);
  if (!patch.rule) return c.json({ error: 'rule: required' }, 400);
  const row = db.insert(schema.lessons).values({ status: 'hypothesis', ...patch, rule: patch.rule }).returning().get();
  writeLessonsMd();
  return c.json(row, 201);
});

scripts.patch('/api/lessons/:id', async (c) => {
  const patch = lessonPatch((await c.req.json().catch(() => ({}))) as Record<string, unknown>);
  if (patch.rule === '') return c.json({ error: 'rule: required' }, 400);
  const row = db.update(schema.lessons).set({ ...patch, updatedAt: new Date() }).where(eq(schema.lessons.id, Number(c.req.param('id')))).returning().get();
  writeLessonsMd();
  return row ? c.json(row) : c.json({ error: 'not found' }, 404);
});

scripts.delete('/api/lessons/:id', (c) => {
  db.delete(schema.lessons).where(eq(schema.lessons.id, Number(c.req.param('id')))).run();
  writeLessonsMd();
  return c.json({ ok: true });
});

scripts.post('/api/lessons/extract', async (c) => {
  const { text } = (await c.req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return c.json({ error: 'text: required' }, 400);
  return c.json(enqueue('extract', { text: text.slice(0, 50_000) }), 202);
});
