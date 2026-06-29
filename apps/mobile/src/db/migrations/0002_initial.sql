CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer,
	`mime_type` text,
	`updated_at` text,
	`is_offline` integer DEFAULT 0
);
