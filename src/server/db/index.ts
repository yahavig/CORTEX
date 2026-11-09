import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DB_PATH, MIGRATIONS_DIR } from '../config.ts';
import * as schema from './schema.ts';

export const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

export { schema };
