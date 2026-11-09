CREATE TABLE `fx_rates` (
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	`rate_date` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_currency_date_idx` ON `fx_rates` (`currency`,`date`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`area` text DEFAULT 'content' NOT NULL,
	`due_at` integer,
	`video_id` integer,
	`deal_id` integer,
	`done_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
ALTER TABLE `brands` ADD `category` text;--> statement-breakpoint
ALTER TABLE `brands` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `brands` ADD `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `company` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `content_type` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `usage_rights` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `payment_terms_days` integer;--> statement-breakpoint
ALTER TABLE `expenses` ADD `vat_amount` real;--> statement-breakpoint
ALTER TABLE `expenses` ADD `deductible_pct` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `is_asset` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `brand_id` integer REFERENCES brands(id);--> statement-breakpoint
ALTER TABLE `payments` ADD `description` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `fees` real;--> statement-breakpoint
ALTER TABLE `payments` ADD `withholding` real;--> statement-breakpoint
ALTER TABLE `payments` ADD `vat_amount` real;--> statement-breakpoint
ALTER TABLE `payments` ADD `method` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `receipt_issued_at` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL;--> statement-breakpoint
CREATE INDEX `payments_received_idx` ON `payments` (`received_at`);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `category` text DEFAULT 'software' NOT NULL;