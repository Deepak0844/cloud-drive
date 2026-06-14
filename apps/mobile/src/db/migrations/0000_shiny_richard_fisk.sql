CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer,
	`mime_type` text,
	`updated_at` text,
	`is_offline` integer DEFAULT 0,
	`thumbnail_path` text
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`url` text,
	`dest` text,
	`name` text,
	`size` integer,
	`upload_id` text,
	`uploaded_chunks` integer,
	`total_chunks` integer,
	`resume_data` text,
	`progress` real DEFAULT 0,
	`retry_count` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text
);
