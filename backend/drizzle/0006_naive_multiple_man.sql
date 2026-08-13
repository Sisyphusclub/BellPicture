ALTER TABLE `user_quota` ADD `check_in_date` text;--> statement-breakpoint
ALTER TABLE `user_quota` ADD `bonus_today` integer DEFAULT 0 NOT NULL;