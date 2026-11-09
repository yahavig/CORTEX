import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// One row per connected service. Secrets live in the macOS Keychain, never here.
export const accounts = sqliteTable('accounts', {
  provider: text('provider').primaryKey(), // instagram | elevenlabs | claude | tiktok
  status: text('status', { enum: ['connected', 'error', 'disconnected'] }).notNull().default('disconnected'),
  username: text('username'),
  externalId: text('external_id'),
  meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
  connectedAt: integer('connected_at', { mode: 'timestamp_ms' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  refreshedAt: integer('refreshed_at', { mode: 'timestamp_ms' }),
  checkedAt: integer('checked_at', { mode: 'timestamp_ms' }),
  error: text('error'),
});
