PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_image_api_keys` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted_key` text,
	`key_suffix` text,
	`high_res_encrypted_key` text,
	`high_res_key_suffix` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_image_api_keys`("user_id", "encrypted_key", "key_suffix", "high_res_encrypted_key", "high_res_key_suffix", "created_at", "updated_at") SELECT "user_id", "encrypted_key", "key_suffix", NULL, NULL, "created_at", "updated_at" FROM `user_image_api_keys`;--> statement-breakpoint
DROP TABLE `user_image_api_keys`;--> statement-breakpoint
ALTER TABLE `__new_user_image_api_keys` RENAME TO `user_image_api_keys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
