CREATE TABLE `reference_uploads` (
	`filename` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reference_uploads_user_created_idx` ON `reference_uploads` (`user_id`,`created_at`);--> statement-breakpoint
INSERT OR IGNORE INTO `reference_uploads` (`filename`, `user_id`, `created_at`)
WITH `reference_candidates` AS (
	SELECT `reference_id` AS `filename`, `user_id`, `created_at`, `id` AS `record_id`
	FROM `image_records`
	WHERE `reference_id` IS NOT NULL
	UNION ALL
	SELECT `reference`.`value` AS `filename`, `image_records`.`user_id`, `image_records`.`created_at`, `image_records`.`id` AS `record_id`
	FROM `image_records`
	JOIN json_each(
		CASE
			WHEN json_valid(`image_records`.`reference_ids`) THEN `image_records`.`reference_ids`
			ELSE '[]'
		END
	) AS `reference`
	WHERE `reference`.`type` = 'text'
),
`ranked_references` AS (
	SELECT `filename`, `user_id`, `created_at`, ROW_NUMBER() OVER (
		PARTITION BY `filename`
		ORDER BY `created_at`, `record_id`
	) AS `owner_rank`
	FROM `reference_candidates`
)
SELECT `filename`, `user_id`, `created_at`
FROM `ranked_references`
WHERE `owner_rank` = 1;--> statement-breakpoint
CREATE INDEX `image_records_public_created_id_idx` ON `image_records` (`is_public`,`created_at`,`id`);
