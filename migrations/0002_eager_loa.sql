CREATE TABLE `developer_repo_portfolios` (
	`developer_id` text NOT NULL,
	`repo_full_name` text NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`contributors_count` integer,
	`recent_contrib_count_12mo` integer DEFAULT 0 NOT NULL,
	`total_contrib_count` integer DEFAULT 0 NOT NULL,
	`summary_text` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`developer_id`, `repo_full_name`)
);
--> statement-breakpoint
CREATE INDEX `idx_dev_repo_portfolios_developer` ON `developer_repo_portfolios` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_repo_portfolios_repo` ON `developer_repo_portfolios` (`repo_full_name`);