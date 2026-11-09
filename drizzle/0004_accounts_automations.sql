CREATE TABLE `accounts` (
	`provider` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`username` text,
	`external_id` text,
	`meta` text,
	`connected_at` integer,
	`expires_at` integer,
	`refreshed_at` integer,
	`checked_at` integer,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `automation_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`automation_id` integer,
	`trigger` text NOT NULL,
	`ig_user_id` text,
	`username` text,
	`text` text,
	`media_id` text,
	`action` text NOT NULL,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `automation_events_created_idx` ON `automation_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `automations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`trigger` text DEFAULT 'comment' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`match_mode` text DEFAULT 'contains' NOT NULL,
	`media_ids` text DEFAULT '[]' NOT NULL,
	`video_id` integer,
	`public_replies` text DEFAULT '[]' NOT NULL,
	`dm_text` text DEFAULT '' NOT NULL,
	`link_url` text,
	`link_label` text,
	`require_follow` integer DEFAULT false NOT NULL,
	`not_following_text` text,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`click_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE set null
);
