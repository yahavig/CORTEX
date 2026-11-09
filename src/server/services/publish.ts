// "Ready to post": copy the latest render + caption into iCloud Drive and set an
// Apple Reminder for the scheduled time. Re-running replaces the previous prep.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { PrepState } from '../../shared/constants.ts';
import { READY_DIR } from '../config.ts';
import { db, schema } from '../db/index.ts';
import { latestRender } from './projects.ts';
import { completeReminder, createReminder, deleteReminder } from './reminders.ts';

type Video = typeof schema.videos.$inferSelect;

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
const human = (d: Date) =>
  new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d);

function save(id: number, patch: Partial<Video>) {
  return db.update(schema.videos).set({ ...patch, updatedAt: new Date() }).where(eq(schema.videos.id, id)).returning().get();
}

export async function prepareForPublishing(video: Video): Promise<Video> {
  const prep: PrepState = { at: new Date().toISOString(), warnings: [] };
  try {
    // Remove the previous prep folder if the schedule changed.
    if (video.prep?.folder && existsSync(video.prep.folder)) rmSync(video.prep.folder, { recursive: true, force: true });

    const when = video.scheduledAt;
    if (!when) prep.warnings.push('אין שעת פרסום. התזכורת תיווצר אחרי שתקבע שעה.');
    if (!video.caption?.trim()) prep.warnings.push('אין כיתוב.');

    const folder = join(READY_DIR, `${when ? stamp(when) : 'ללא תאריך'} ${video.slug}`);
    mkdirSync(folder, { recursive: true });
    prep.folder = folder;

    const caption = video.caption?.trim() ?? '';
    writeFileSync(join(folder, 'caption.txt'), caption + '\n');

    const render = latestRender(video.slug);
    if (render) {
      const dest = join(folder, basename(render));
      copyFileSync(render, dest);
      prep.videoFile = dest;
    } else {
      prep.videoFile = null;
      prep.warnings.push(`לא נמצא רינדור ב־videos/${video.slug}/renders.`);
    }

    if (video.reminderId) await deleteReminder(video.reminderId).catch(() => {});
    prep.reminderId = null;
    if (when) {
      const body = [caption, '', `📁 iCloud Drive › מוכן לפרסום › ${basename(folder)}`].join('\n');
      prep.reminderId = await createReminder(`לפרסם: ${video.title}`, body, when);
    }
  } catch (err) {
    prep.error = err instanceof Error ? err.message : String(err);
  }
  return save(video.id, { prep, reminderId: prep.reminderId ?? null })!;
}

// Moved back out of "ready" before publishing: take the reminder down.
export async function cancelPrep(video: Video): Promise<Video> {
  if (video.reminderId) await deleteReminder(video.reminderId).catch(() => {});
  return save(video.id, { reminderId: null, prep: video.prep ? { ...video.prep, reminderId: null, warnings: ['ההכנה בוטלה.'] } : null })!;
}

export async function markPublished(video: Video): Promise<Video> {
  if (video.reminderId) await completeReminder(video.reminderId).catch(() => {});
  return save(video.id, { publishedAt: video.publishedAt ?? new Date(), reminderId: null })!;
}

export { human as formatWhen };
