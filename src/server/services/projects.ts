// Video project folders under yahav-brand/videos (one per reel, made by the skill).
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { VIDEOS_DIR } from '../config.ts';

export function listProjects(): string[] {
  if (!existsSync(VIDEOS_DIR)) return [];
  return readdirSync(VIDEOS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

// Newest MP4 in videos/<slug>/renders, or null.
export function latestRender(slug: string): string | null {
  const dir = join(VIDEOS_DIR, slug, 'renders');
  if (!existsSync(dir)) return null;
  const mp4s = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.mp4'))
    .map((f) => ({ file: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return mp4s[0]?.file ?? null;
}
