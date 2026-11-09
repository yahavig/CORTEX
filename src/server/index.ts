import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { count } from 'drizzle-orm';
import { DB_PATH, HOST, PORT, WEB_DIST } from './config.ts';
import { db, runMigrations, schema } from './db/index.ts';
import { backupNow, lastBackupAt, startBackupSchedule } from './backup.ts';
import { assets } from './routes/assets.ts';
import { videos } from './routes/videos.ts';
import { settings } from './routes/settings.ts';
import { scripts } from './routes/scripts.ts';
import { business } from './routes/business.ts';
import { tasks } from './routes/tasks.ts';
import { registerJob, startJobRunner } from './jobs.ts';
import { generateScript } from './services/scriptwriter.ts';
import { extractLessons } from './services/lessons.ts';
import { modules } from './modules/index.ts';

runMigrations();
startBackupSchedule();
registerJob('script', generateScript);
registerJob('extract', extractLessons);
startJobRunner();

const startedAt = Date.now();
const app = new Hono();
app.route('/', assets);
app.route('/', videos);
app.route('/', settings);
app.route('/', scripts);
app.route('/', business);
app.route('/', tasks);
for (const m of modules) {
  if (m.routes) app.route('/', m.routes);
  m.start?.();
}

app.get('/api/health', (c) => {
  const [videos] = db.select({ n: count() }).from(schema.videos).all();
  return c.json({
    ok: true,
    name: 'CORTEX',
    version: process.env.npm_package_version ?? '0.1.0',
    startedAt,
    dbPath: DB_PATH,
    lastBackupAt: lastBackupAt(),
    counts: { videos: videos?.n ?? 0 },
  });
});

app.post('/api/backup', async (c) => c.json({ file: await backupNow() }));

// Built UI (npm run build). In dev, Vite serves the UI and proxies /api here.
if (existsSync(WEB_DIST)) {
  // Hashed assets can be cached; index.html must always be revalidated so a
  // rebuild shows up on the next reload.
  const onFound = (path: string, c: { header: (k: string, v: string) => void }) =>
    c.header('Cache-Control', path.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable');
  app.use('/*', serveStatic({ root: WEB_DIST, onFound }));
  app.get('*', serveStatic({ path: `${WEB_DIST}/index.html`, onFound }));
}

serve({ fetch: app.fetch, hostname: HOST, port: PORT }, (info) => {
  console.log(`CORTEX on http://${HOST}:${info.port}`);
});
