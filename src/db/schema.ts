// src/db/schema.ts
// Single source of truth for D1 table structure.
// Run `drizzle-kit generate` after any change — never write SQL by hand.
import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';

// ============================================================
// Developers
// ============================================================
export const developers = sqliteTable('developers', {
  id: text('id').primaryKey(),                         // GitHub numeric user ID (stored as string)
  username: text('username').notNull().unique(),        // GitHub login
  optedOut: integer('opted_out', { mode: 'boolean' }).notNull().default(false),
  lastIngestedAt: text('last_ingested_at'),
  ingestionStatus: text('ingestion_status').notNull().default('pending'),
  // Scores (null until computed by spec-05)
  overallImpact: real('overall_impact'),
  codeQuality: real('code_quality'),
  reviewQuality: real('review_quality'),
  documentationQuality: real('documentation_quality'),
  collaborationBreadth: real('collaboration_breadth'),
  consistencyScore: real('consistency_score'),
  recentActivityScore: real('recent_activity_score'),
  scoreVersion: text('score_version'),
  scoredAt: text('scored_at'),
}, (t) => [
  index('idx_developers_username').on(t.username),
  index('idx_developers_status').on(t.ingestionStatus),
  index('idx_developers_impact').on(t.overallImpact),
]);

// ============================================================
// Repos (minimal — only fields needed for scoring weights)
// ============================================================
export const repos = sqliteTable('repos', {
  fullName: text('full_name').primaryKey(),
  description: text('description'),                    // shown in domain tagger prompt
  primaryLanguage: text('primary_language'),
  stars: integer('stars').notNull().default(0),
  contributorsCount: integer('contributors_count'),
  hasTests: integer('has_tests', { mode: 'boolean' }).notNull().default(false),
  topics: text('topics').notNull().default('[]'),      // JSON string[]: GitHub repo.topics
  cachedAt: text('cached_at').notNull(),
});

// ============================================================
// Contributions (computed metrics per commit)
// ============================================================
export const contributions = sqliteTable('contributions', {
  id: text('id').primaryKey(),                          // commit SHA
  developerId: text('developer_id').notNull(),
  repoFullName: text('repo_full_name').notNull(),
  kind: text('kind').notNull().default('commit'),
  contributionType: text('contribution_type'),
  authoredAt: text('authored_at').notNull(),
  messageHead: text('message_head'),                    // first 120 chars
  additions: integer('additions').notNull().default(0),
  deletions: integer('deletions').notNull().default(0),
  filesChanged: integer('files_changed').notNull().default(0),
  // Analysis metrics — written by spec-03 analyzeCommitDetail(), used by spec-05 scoring
  churn: integer('churn'),                              // totalAdditions + totalDeletions — for SEU
  fileCount: integer('file_count'),                     // files changed — for SEU file-coordination term
  normalizedEntropy: real('normalized_entropy'),        // H ∈ [0,1]: normalized Shannon entropy — for SEU
  complexityDelta: real('complexity_delta'),            // signed ΔCC: negative = reduced complexity
  complexityDeltaAbs: real('complexity_delta_abs'),     // |ΔCC| — for EffortH cyclomatic multiplier
  testRatio: real('test_ratio'),                        // [0,1]: test_churn / total_churn — for QualityH
  // Scoring outputs
  qualityScore: real('quality_score'),                  // normalized ValueH → [0,100]
  recencyWeightedScore: real('recency_weighted_score'), // qualityScore × exp(−λ × months)
  domains: text('domains').notNull().default('[]'),     // JSON string[]
  languages: text('languages').notNull().default('[]'), // JSON string[]
  classified: integer('classified', { mode: 'boolean' }).notNull().default(false),
  scored: integer('scored', { mode: 'boolean' }).notNull().default(false),
}, (t) => [
  index('idx_contributions_developer').on(t.developerId),
  index('idx_contributions_authored').on(t.authoredAt),
  index('idx_contributions_unclassified').on(t.classified),
  index('idx_contributions_unscored').on(t.scored),
]);

// ============================================================
// Reviews (aggregated signals only — no body text stored)
// ============================================================
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  developerId: text('developer_id').notNull(),
  repoFullName: text('repo_full_name').notNull(),
  prNumber: integer('pr_number').notNull(),
  prAuthorId: text('pr_author_id'),
  reviewState: text('review_state').notNull(),
  commentCount: integer('comment_count').notNull().default(0),
  totalCommentLength: integer('total_comment_length').notNull().default(0),
  referencesCodeLines: integer('references_code_lines', { mode: 'boolean' }).notNull().default(false),
  submittedAt: text('submitted_at').notNull(),
  depthScore: real('depth_score'),
}, (t) => [
  index('idx_reviews_developer').on(t.developerId),
]);

// ============================================================
// Developer domain scores (aggregated)
// Composite PK: (developer_id, domain) — one row per developer per domain
// ============================================================
export const developerDomains = sqliteTable('developer_domains', {
  developerId: text('developer_id').notNull(),
  domain: text('domain').notNull(),
  score: real('score').notNull().default(0),
  contributionCount: integer('contribution_count').notNull().default(0),
  evidenceRepos: text('evidence_repos').notNull().default('[]'), // JSON string[]
  embeddingId: text('embedding_id'),
}, (t) => [
  primaryKey({ columns: [t.developerId, t.domain] }),
  index('idx_developer_domains_domain').on(t.domain),
  index('idx_developer_domains_score').on(t.score),
]);
