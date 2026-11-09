CREATE TABLE `analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer,
	`name` text NOT NULL,
	`role` text,
	`email` text,
	`phone` text,
	`instagram` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer,
	`contact_id` integer,
	`title` text NOT NULL,
	`stage` text DEFAULT 'lead' NOT NULL,
	`amount` real,
	`currency` text DEFAULT 'ILS' NOT NULL,
	`deliverables` text,
	`due_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`vendor` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'other' NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'ILS' NOT NULL,
	`amount_ils` real,
	`fx_rate` real,
	`file_path` text,
	`subscription_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`video_id` integer,
	`input` text,
	`output` text,
	`log_path` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'proposed' NOT NULL,
	`confidence` real,
	`evidence` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metrics_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`captured_at` integer NOT NULL,
	`hours_since_post` real NOT NULL,
	`source` text NOT NULL,
	`views` integer,
	`reach` integer,
	`avg_watch_time_ms` integer,
	`total_watch_time_ms` integer,
	`skip_rate` real,
	`likes` integer,
	`comments` integer,
	`shares` integer,
	`saves` integer,
	`follows` integer,
	`profile_visits` integer,
	`retention` text,
	`view_sources` text,
	`screenshot_path` text,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metrics_video_idx` ON `metrics_snapshots` (`video_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_id` integer,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'ILS' NOT NULL,
	`amount_ils` real,
	`fx_rate` real,
	`expected_at` integer,
	`received_at` integer,
	`receipt_number` text,
	`receipt_path` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`version` integer NOT NULL,
	`hook` text,
	`body` text NOT NULL,
	`storyboard` text,
	`notes` text,
	`author` text DEFAULT 'yahav' NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scripts_video_version_idx` ON `scripts` (`video_id`,`version`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor` text NOT NULL,
	`plan` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`cycle` text DEFAULT 'monthly' NOT NULL,
	`billing_day` integer,
	`active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`stage` text DEFAULT 'idea' NOT NULL,
	`pillar` text,
	`mode` text DEFAULT 'footage' NOT NULL,
	`hook_type` text,
	`mechanism` text,
	`notes` text,
	`caption` text,
	`scheduled_at` integer,
	`published_at` integer,
	`ig_media_id` text,
	`ig_permalink` text,
	`also_on_tiktok` integer DEFAULT false NOT NULL,
	`render_path` text,
	`thumb_path` text,
	`duration_sec` real,
	`is_experiment` integer DEFAULT false NOT NULL,
	`experiment_note` text,
	`deal_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `videos_slug_idx` ON `videos` (`slug`);--> statement-breakpoint
CREATE INDEX `videos_stage_idx` ON `videos` (`stage`);