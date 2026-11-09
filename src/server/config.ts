import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const home = homedir();

export const ROOT_DIR = join(import.meta.dirname, '../..');
export const WEB_DIST = join(ROOT_DIR, 'dist/web');
export const MIGRATIONS_DIR = join(ROOT_DIR, 'drizzle');

// Everything lives inside the CORTEX folder on the (iCloud-synced) Desktop.
// data/live holds the open SQLite files and is excluded from iCloud, because
// syncing a database while it is being written can corrupt it.
// data/backups holds closed daily copies and IS synced, so iCloud keeps them.
export const DATA_DIR = process.env.CORTEX_DATA_DIR ?? join(ROOT_DIR, 'data');
export const LIVE_DIR = join(DATA_DIR, 'live');
export const DB_PATH = join(LIVE_DIR, 'cortex.db');
export const BACKUP_DIR = join(DATA_DIR, 'backups');
export const BACKUP_KEEP = 14;

export const BRAND_DIR = join(home, 'Desktop/Apps/yahav-brand');
export const VIDEOS_DIR = join(BRAND_DIR, 'videos');
// Videos ready to post land here; iCloud Drive brings them to the iPhone.
export const READY_DIR = join(home, 'Library/Mobile Documents/com~apple~CloudDocs/מוכן לפרסום');

export const SF_SYMBOLS_DIR = join(BRAND_DIR, 'assets/sf-symbols');

export const HOST = '127.0.0.1';
export const PORT = Number(process.env.CORTEX_PORT ?? 4747);

mkdirSync(LIVE_DIR, { recursive: true });
mkdirSync(BACKUP_DIR, { recursive: true });
execFileSync('xattr', ['-w', 'com.apple.fileprovider.ignore#P', '1', LIVE_DIR]);
