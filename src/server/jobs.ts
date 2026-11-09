// Background jobs (Claude calls now, renders in phase 3). One at a time, so a
// render never competes with another for the 16GB. State lives in the jobs table,
// output streams to logs/jobs/<id>.log.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { ROOT_DIR } from './config.ts';
import { db, schema } from './db/index.ts';

export type Job = typeof schema.jobs.$inferSelect;
type Kind = Job['kind'];
export type Log = (line: string) => void;
type Handler = (job: Job, log: Log) => Promise<unknown>;

const LOG_DIR = join(ROOT_DIR, 'logs/jobs');
mkdirSync(LOG_DIR, { recursive: true });

const handlers = new Map<Kind, Handler>();
let running = false;

export function registerJob(kind: Kind, handler: Handler) {
  handlers.set(kind, handler);
}

export function enqueue(kind: Kind, input: unknown, videoId: number | null = null): Job {
  const job = db.insert(schema.jobs).values({ kind, input, videoId }).returning().get();
  const logPath = join(LOG_DIR, `${job.id}.log`);
  const row = db.update(schema.jobs).set({ logPath }).where(eq(schema.jobs.id, job.id)).returning().get()!;
  setImmediate(tick);
  return row;
}

export function getJob(id: number) {
  return db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get();
}

async function tick() {
  if (running) return;
  const job = db.select().from(schema.jobs).where(eq(schema.jobs.status, 'queued')).orderBy(asc(schema.jobs.id)).get();
  if (!job) return;
  running = true;
  const log: Log = (line) => appendFileSync(job.logPath!, `[${new Date().toISOString().slice(11, 19)}] ${line}\n`);
  const set = (patch: Partial<Job>) => db.update(schema.jobs).set(patch).where(eq(schema.jobs.id, job.id)).run();
  set({ status: 'running', startedAt: new Date() });
  log(`start ${job.kind}`);
  try {
    const handler = handlers.get(job.kind);
    if (!handler) throw new Error(`no handler for ${job.kind}`);
    const output = await handler(job, log);
    set({ status: 'done', output: output ?? null, finishedAt: new Date() });
    log('done');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    set({ status: 'failed', error: msg, finishedAt: new Date() });
    log(`failed: ${msg}`);
  } finally {
    running = false;
    setImmediate(tick);
  }
}

// Jobs that were running when the server stopped will never finish.
export function startJobRunner() {
  db.update(schema.jobs)
    .set({ status: 'failed', error: 'השרת הופעל מחדש באמצע', finishedAt: new Date() })
    .where(eq(schema.jobs.status, 'running'))
    .run();
  setImmediate(tick);
}
