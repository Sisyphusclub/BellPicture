ALTER TABLE `image_records` ADD `count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `image_records` ADD `resolution` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `image_records` ADD `is_favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `image_records` ADD `collection` text;