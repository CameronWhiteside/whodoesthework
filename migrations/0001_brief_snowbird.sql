ALTER TABLE `developers` ADD `ingestion_started_at` text;--> statement-breakpoint
ALTER TABLE `developers` ADD `ingestion_failure_reason` text;--> statement-breakpoint
ALTER TABLE `developers` ADD `ingestion_last_error` text;--> statement-breakpoint
ALTER TABLE `developers` ADD `ingestion_attempt_count` integer DEFAULT 0;