ALTER TABLE `jobs` ADD `attempt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `max_attempts` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `next_run_at` integer;