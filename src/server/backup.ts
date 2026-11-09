// Daily SQLite backup with rotation. Runs on start and checks every hour,
// so a Mac that slept through the night still gets its backup on wake.
// Backups land in data/backups, which iCloud syncs.
import { readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { BACKUP_DIR, BACKUP_KEEP, LIVE_DIR } from './config.ts';
import { sqlite } from './db/index.ts';

const DAY = 24 * 60 * 60 * 1000;

function listBackups() {
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('cortex-') && f.endsWith('.db'))
    .map((f) => ({ file: join(BACKUP_DIR, f), mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

export function lastBackupAt(): number | null {
  return listBackups()[0]?.mtime ?? null;
}

export async function backupNow() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = join(BACKUP_DIR, `cortex-${stamp}.db`);
  // Write in the non-synced folder first, then move the finished file in,
  // so iCloud never uploads a half-written backup.
  const tmp = join(LIVE_DIR, `backup-${stamp}.tmp`);
  await sqlite.backup(tmp);
  renameSync(tmp, file);
  for (const old of listBackups().slice(BACKUP_KEEP)) unlinkSync(old.file);
  console.log(`[backup] ${file}`);
  return file;
}

async function backupIfDue() {
  const last = lastBackupAt();
  if (last === null || Date.now() - last > DAY) {
    try {
      await backupNow();
    } catch (err) {
      console.error('[backup] failed', err);
    }
  }
}

export function startBackupSchedule() {
  void backupIfDue();
  setInterval(backupIfDue, 60 * 60 * 1000).unref();
}
