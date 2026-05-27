ALTER TABLE `user` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_quota` ADD `daily_total` integer;