CREATE TABLE `photo_backups` (
	`asset_id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`size` integer,
	`mime_type` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`cloud_file_id` text,
	`created_at` text,
	`backed_up_at` text
);
