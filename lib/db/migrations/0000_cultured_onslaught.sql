CREATE TABLE `analysis_results` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_id` text NOT NULL,
	`wpm` real NOT NULL,
	`filler_words` text NOT NULL,
	`slide_time_breakdown` text NOT NULL,
	`pronunciation_issues` text NOT NULL,
	FOREIGN KEY (`recording_id`) REFERENCES `recordings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`session_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`payload` text,
	`result` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `qa_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`qa_item_id` text NOT NULL,
	`audio_file_path` text NOT NULL,
	`transcript` text NOT NULL,
	`wpm` real NOT NULL,
	`filler_words` text NOT NULL,
	`relevance_score` real NOT NULL,
	`improved_answer` text,
	FOREIGN KEY (`qa_item_id`) REFERENCES `qa_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `qa_items` (
	`id` text PRIMARY KEY NOT NULL,
	`qa_session_id` text NOT NULL,
	`question` text NOT NULL,
	`related_slide_index` integer NOT NULL,
	`difficulty` text NOT NULL,
	`category` text NOT NULL,
	FOREIGN KEY (`qa_session_id`) REFERENCES `qa_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `qa_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`script_version` integer NOT NULL,
	`audio_file_path` text NOT NULL,
	`duration_sec` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`version` integer NOT NULL,
	`source` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`slide_file_path` text NOT NULL,
	`target_duration_sec` integer NOT NULL,
	`tone` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`native_language` text
);
--> statement-breakpoint
CREATE TABLE `slide_critiques` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`slide_index` integer NOT NULL,
	`text_density` text NOT NULL,
	`estimated_read_time_sec` real NOT NULL,
	`issues` text NOT NULL,
	`suggestions` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `slides` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`slide_index` integer NOT NULL,
	`text_content` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
