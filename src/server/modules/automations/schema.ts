import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { MATCH_MODES, TRIGGERS } from '../../../shared/automation.ts';
import { videos } from '../../db/schema.ts';

const now = sql`(unixepoch() * 1000)`;

export const automations = sqliteTable('automations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  trigger: text('trigger', { enum: TRIGGERS }).notNull().default('comment'),
  keywords: text('keywords', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  matchMode: text('match_mode', { enum: MATCH_MODES }).notNull().default('contains'),
  mediaIds: text('media_ids', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  videoId: integer('video_id').references(() => videos.id, { onDelete: 'set null' }),
  publicReplies: text('public_replies', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  dmText: text('dm_text').notNull().default(''),
  linkUrl: text('link_url'),
  linkLabel: text('link_label'),
  requireFollow: integer('require_follow', { mode: 'boolean' }).notNull().default(false),
  notFollowingText: text('not_following_text'),
  sentCount: integer('sent_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

// Log of what the engine did (filled once a webhook receiver runs).
export const automationEvents = sqliteTable(
  'automation_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    automationId: integer('automation_id').references(() => automations.id, { onDelete: 'set null' }),
    trigger: text('trigger', { enum: TRIGGERS }).notNull(),
    igUserId: text('ig_user_id'),
    username: text('username'),
    text: text('text'),
    mediaId: text('media_id'),
    action: text('action').notNull(), // dm_sent | public_reply | gated | skipped | error
    detail: text('detail'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (t) => [index('automation_events_created_idx').on(t.createdAt)],
);
