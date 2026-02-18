CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`developer_id` text NOT NULL,
	`repo_full_name` text NOT NULL,
	`kind` text DEFAULT 'commit' NOT NULL,
	`contribution_type` text,
	`authored_at` text NOT NULL,
	`message_head` text,
	`additions` integer DEFAULT 0 NOT NULL,
	`deletions` integer DEFAULT 0 NOT NULL,
	`files_changed` integer DEFAULT 0 NOT NULL,
	`churn` integer,
	`file_count` integer,
	`normalized_entropy` real,
	`complexity_delta` real,
	`complexity_delta_abs` real,
	`test_ratio` real,
	`quality_score` real,
	`recency_weighted_score` real,
	`domains` text DEFAULT '[]' NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`classified` integer DEFAULT false NOT NULL,
	`scored` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contributions_developer` ON `contributions` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_contributions_authored` ON `contributions` (`authored_at`);--> statement-breakpoint
CREATE INDEX `idx_contributions_unclassified` ON `contributions` (`classified`);--> statement-breakpoint
CREATE INDEX `idx_contributions_unscored` ON `contributions` (`scored`);--> statement-breakpoint
CREATE TABLE `developer_domains` (
	`developer_id` text NOT NULL,
	`domain` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`contribution_count` integer DEFAULT 0 NOT NULL,
	`evidence_repos` text DEFAULT '[]' NOT NULL,
	`embedding_id` text,
	PRIMARY KEY(`developer_id`, `domain`)
);
--> statement-breakpoint
CREATE INDEX `idx_developer_domains_domain` ON `developer_domains` (`domain`);--> statement-breakpoint
CREATE INDEX `idx_developer_domains_score` ON `developer_domains` (`score`);--> statement-breakpoint
CREATE TABLE `developers` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`opted_out` integer DEFAULT false NOT NULL,
	`last_ingested_at` text,
	`ingestion_status` text DEFAULT 'pending' NOT NULL,
	`overall_impact` real,
	`code_quality` real,
	`review_quality` real,
	`documentation_quality` real,
	`collaboration_breadth` real,
	`consistency_score` real,
	`recent_activity_score` real,
	`score_version` text,
	`scored_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `developers_username_unique` ON `developers` (`username`);--> statement-breakpoint
CREATE INDEX `idx_developers_username` ON `developers` (`username`);--> statement-breakpoint
CREATE INDEX `idx_developers_status` ON `developers` (`ingestion_status`);--> statement-breakpoint
CREATE INDEX `idx_developers_impact` ON `developers` (`overall_impact`);--> statement-breakpoint
CREATE TABLE `repos` (
	`full_name` text PRIMARY KEY NOT NULL,
	`description` text,
	`primary_language` text,
	`stars` integer DEFAULT 0 NOT NULL,
	`contributors_count` integer,
	`has_tests` integer DEFAULT false NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`cached_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`developer_id` text NOT NULL,
	`repo_full_name` text NOT NULL,
	`pr_number` integer NOT NULL,
	`pr_author_id` text,
	`review_state` text NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`total_comment_length` integer DEFAULT 0 NOT NULL,
	`references_code_lines` integer DEFAULT false NOT NULL,
	`submitted_at` text NOT NULL,
	`depth_score` real
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_developer` ON `reviews` (`developer_id`);