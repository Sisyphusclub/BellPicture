CREATE TABLE `quota_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text DEFAULT 'check_in' NOT NULL,
	`amount` integer NOT NULL,
	`remaining` integer NOT NULL,
	`granted_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`check_in_date` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quota_grants_user_expiry_idx` ON `quota_grants` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `quota_grants_user_source_date_idx` ON `quota_grants` (`user_id`,`source`,`check_in_date`);--> statement-breakpoint
ALTER TABLE `user_quota` ADD `permanent_total` integer;--> statement-breakpoint
ALTER TABLE `user_quota` ADD `permanent_used` integer;--> statement-breakpoint
UPDATE `user_quota`
SET `permanent_total` = `daily_total`,
    `permanent_used` = MIN(MAX(COALESCE(`used_today`, 0), 0), MAX(COALESCE(`daily_total`, 0), 0))
WHERE `permanent_total` IS NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `quota_grants`
  (`id`, `user_id`, `source`, `amount`, `remaining`, `granted_at`, `expires_at`, `check_in_date`)
SELECT
  'legacy-check-in-' || `user_id` || '-' || `check_in_date`,
  `user_id`,
  'check_in',
  `bonus_today`,
  MAX(0, `bonus_today` - MAX(0, COALESCE(`used_today`, 0) - COALESCE(`daily_total`, 0))),
  CAST(strftime('%s', `check_in_date` || ' 00:00:00') AS INTEGER) * 1000,
  CAST(strftime('%s', `check_in_date` || ' 00:00:00') AS INTEGER) * 1000 + 604800000,
  `check_in_date`
FROM `user_quota`
WHERE `check_in_date` IS NOT NULL
  AND date(`check_in_date`) >= date('now', '-7 days')
  AND COALESCE(`bonus_today`, 0) > 0;
