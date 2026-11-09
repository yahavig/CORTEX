// CORTEX database schema. One SQLite file in data/live/cortex.db (excluded from iCloud).
// Media stays on disk (yahav-brand/videos, business/receipts); rows hold paths.
import { sqliteTable, integer, text, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const id = () => integer('id').primaryKey({ autoIncrement: true });
const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`);

// ── Content ────────────────────────────────────────────────────────────────

import { VIDEO_STAGES, PILLARS, VIDEO_MODES, type PrepState, type ScriptLine } from '../../shared/constants.ts';
export { VIDEO_STAGES, PILLARS, VIDEO_MODES };

export const videos = sqliteTable(
  'videos',
  {
    id: id(),
    slug: text('slug').notNull(), // folder name under yahav-brand/videos
    title: text('title').notNull(),
    stage: text('stage', { enum: VIDEO_STAGES }).notNull().default('idea'),
    pillar: text('pillar', { enum: PILLARS }),
    mode: text('mode', { enum: VIDEO_MODES }).notNull().default('footage'),
    hookType: text('hook_type'),
    mechanism: text('mechanism'),
    notes: text('notes'),
    symbol: text('symbol'), // SF Symbol name for the idea thumbnail
    caption: text('caption'),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    igMediaId: text('ig_media_id'),
    igPermalink: text('ig_permalink'),
    alsoOnTiktok: integer('also_on_tiktok', { mode: 'boolean' }).notNull().default(false),
    reminderId: text('reminder_id'), // Apple Reminders id
    prep: text('prep', { mode: 'json' }).$type<PrepState>(),
    renderPath: text('render_path'),
    thumbPath: text('thumb_path'),
    durationSec: real('duration_sec'),
    isExperiment: integer('is_experiment', { mode: 'boolean' }).notNull().default(false),
    experimentNote: text('experiment_note'),
    dealId: integer('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('videos_slug_idx').on(t.slug), index('videos_stage_idx').on(t.stage)],
);

export const scripts = sqliteTable(
  'scripts',
  {
    id: id(),
    videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    hook: text('hook'),
    hookOptions: text('hook_options', { mode: 'json' }).$type<string[]>(),
    lines: text('lines', { mode: 'json' }).$type<ScriptLine[]>(), // structured voiceover
    body: text('body').notNull(), // ElevenLabs paste text, rendered from lines
    caption: text('caption'),
    source: text('source'), // research citation shown on screen
    storyboard: text('storyboard'),
    notes: text('notes'), // Claude's notes: what to verify, choices made
    feedback: text('feedback'), // Yahav's request that produced this version
    author: text('author', { enum: ['claude', 'yahav'] }).notNull().default('yahav'),
    approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('scripts_video_version_idx').on(t.videoId, t.version)],
);

export const JOB_KINDS = ['render', 'script', 'analysis', 'metrics', 'extract'] as const;
export const JOB_STATUSES = ['queued', 'running', 'done', 'failed', 'cancelled'] as const;

export const jobs = sqliteTable(
  'jobs',
  {
    id: id(),
    kind: text('kind', { enum: JOB_KINDS }).notNull(),
    status: text('status', { enum: JOB_STATUSES }).notNull().default('queued'),
    videoId: integer('video_id').references(() => videos.id, { onDelete: 'set null' }),
    input: text('input', { mode: 'json' }),
    output: text('output', { mode: 'json' }),
    logPath: text('log_path'),
    error: text('error'),
    createdAt: createdAt(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('jobs_status_idx').on(t.status)],
);

// ── Data loop ──────────────────────────────────────────────────────────────

export const metricsSnapshots = sqliteTable(
  'metrics_snapshots',
  {
    id: id(),
    videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    capturedAt: integer('captured_at', { mode: 'timestamp_ms' }).notNull(),
    hoursSincePost: real('hours_since_post').notNull(),
    source: text('source', { enum: ['api', 'screenshot', 'manual'] }).notNull(),
    views: integer('views'),
    reach: integer('reach'),
    avgWatchTimeMs: integer('avg_watch_time_ms'),
    totalWatchTimeMs: integer('total_watch_time_ms'),
    skipRate: real('skip_rate'), // 0..1
    likes: integer('likes'),
    comments: integer('comments'),
    shares: integer('shares'),
    saves: integer('saves'),
    follows: integer('follows'),
    profileVisits: integer('profile_visits'),
    retention: text('retention', { mode: 'json' }), // [{ sec, pct }]
    viewSources: text('view_sources', { mode: 'json' }), // { reels_tab: 0.6, ... }
    screenshotPath: text('screenshot_path'),
  },
  (t) => [index('metrics_video_idx').on(t.videoId)],
);

export const analyses = sqliteTable('analyses', {
  id: id(),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // '72h'
  body: text('body').notNull(), // markdown
  createdAt: createdAt(),
});

export const lessons = sqliteTable('lessons', {
  id: id(),
  rule: text('rule').notNull(),
  detail: text('detail'),
  status: text('status', { enum: ['proposed', 'hypothesis', 'confirmed', 'refuted'] })
    .notNull()
    .default('proposed'),
  confidence: real('confidence'),
  evidence: text('evidence', { mode: 'json' }), // video ids
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── Business ───────────────────────────────────────────────────────────────

import {
  CONTENT_TYPES, DEAL_STAGES, EXPENSE_CATEGORIES, PAYMENT_METHODS, TASK_AREAS, TASK_PRIORITIES, TASK_STATUSES,
} from '../../shared/business.ts';
export { DEAL_STAGES, EXPENSE_CATEGORIES };

export const brands = sqliteTable('brands', {
  id: id(),
  name: text('name').notNull(),
  category: text('category'), // e.g. tech, apps, lifestyle
  website: text('website'),
  instagram: text('instagram'),
  notes: text('notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contacts = sqliteTable('contacts', {
  id: id(),
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  role: text('role'),
  company: text('company'), // agency, when not the brand itself
  email: text('email'),
  phone: text('phone'),
  instagram: text('instagram'),
  notes: text('notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const deals = sqliteTable('deals', {
  id: id(),
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  contactId: integer('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  stage: text('stage', { enum: DEAL_STAGES }).notNull().default('lead'),
  contentType: text('content_type', { enum: CONTENT_TYPES }),
  amount: real('amount'),
  currency: text('currency').notNull().default('ILS'),
  deliverables: text('deliverables'),
  usageRights: text('usage_rights'), // how long / where the brand may use the content
  dueAt: integer('due_at', { mode: 'timestamp_ms' }), // content delivery
  paymentTermsDays: integer('payment_terms_days'), // שוטף + N
  notes: text('notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Income. As עוסק פטור a קבלה is issued in external software; CORTEX tracks its number and file.
export const payments = sqliteTable(
  'payments',
  {
    id: id(),
    dealId: integer('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    description: text('description'),
    amount: real('amount').notNull(), // gross, in `currency`
    currency: text('currency').notNull().default('ILS'),
    fxRate: real('fx_rate'),
    amountIls: real('amount_ils'),
    fees: real('fees'), // PayPal/Wise/bank fees, ILS
    withholding: real('withholding'), // ניכוי במקור, ILS
    vatAmount: real('vat_amount'), // for עוסק מורשה; 0 while פטור
    method: text('method', { enum: PAYMENT_METHODS }),
    expectedAt: integer('expected_at', { mode: 'timestamp_ms' }),
    receivedAt: integer('received_at', { mode: 'timestamp_ms' }),
    receiptNumber: text('receipt_number'),
    receiptIssuedAt: integer('receipt_issued_at', { mode: 'timestamp_ms' }),
    receiptPath: text('receipt_path'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('payments_received_idx').on(t.receivedAt)],
);

export const subscriptions = sqliteTable('subscriptions', {
  id: id(),
  vendor: text('vendor').notNull(),
  plan: text('plan'),
  category: text('category', { enum: EXPENSE_CATEGORIES }).notNull().default('software'),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  cycle: text('cycle', { enum: ['monthly', 'yearly'] }).notNull().default('monthly'),
  billingDay: integer('billing_day'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: createdAt(),
});

export const expenses = sqliteTable(
  'expenses',
  {
    id: id(),
    date: integer('date', { mode: 'timestamp_ms' }).notNull(),
    vendor: text('vendor').notNull(),
    description: text('description'),
    category: text('category', { enum: EXPENSE_CATEGORIES }).notNull().default('other'),
    amount: real('amount').notNull(), // total paid, incl. VAT, in `currency`
    currency: text('currency').notNull().default('ILS'),
    fxRate: real('fx_rate'),
    amountIls: real('amount_ils'),
    vatAmount: real('vat_amount'), // VAT inside the total, ILS (recoverable once מורשה)
    deductiblePct: integer('deductible_pct').notNull().default(100),
    isAsset: integer('is_asset', { mode: 'boolean' }).notNull().default(false), // equipment that depreciates
    paymentMethod: text('payment_method'),
    filePath: text('file_path'),
    subscriptionId: integer('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('expenses_date_idx').on(t.date)],
);

export const fxRates = sqliteTable(
  'fx_rates',
  {
    currency: text('currency').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD requested
    rate: real('rate').notNull(), // ILS per 1 unit
    rateDate: text('rate_date').notNull(), // the Bank of Israel publication date used
  },
  (t) => [uniqueIndex('fx_currency_date_idx').on(t.currency, t.date)],
);

// ── Tasks ──────────────────────────────────────────────────────────────────

export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    title: text('title').notNull(),
    notes: text('notes'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
    priority: text('priority', { enum: TASK_PRIORITIES }).notNull().default('normal'),
    area: text('area', { enum: TASK_AREAS }).notNull().default('content'),
    dueAt: integer('due_at', { mode: 'timestamp_ms' }),
    videoId: integer('video_id').references(() => videos.id, { onDelete: 'set null' }),
    dealId: integer('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    doneAt: integer('done_at', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('tasks_status_idx').on(t.status)],
);

// ── App ────────────────────────────────────────────────────────────────────

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
  updatedAt: updatedAt(),
});
