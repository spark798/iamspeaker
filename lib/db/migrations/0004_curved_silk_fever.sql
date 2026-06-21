CREATE TABLE `script_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`script_id` text NOT NULL,
	`language` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`script_id`) REFERENCES `scripts`(`id`) ON UPDATE no action ON DELETE cascade
);
