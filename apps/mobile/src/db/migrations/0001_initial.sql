CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`dest` text,
	`mime_type` text,
	`progress` real,
	`resume_data` text,
	`upload_id` text,
	`uploaded_chunks` integer,
	`total_chunks` integer,
	`retry_count` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
