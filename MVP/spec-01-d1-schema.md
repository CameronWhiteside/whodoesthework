# Spec 01 — Drizzle Schema, Migrations & Query Layer

**Status:** Not Started
**Blocks:** spec-02, spec-03, spec-05, spec-07 (all specs that touch D1)
**Blocked By:** spec-00 (project scaffold, Zod schemas)
**Parallelizable with:** spec-04, spec-06
**Estimated effort:** 2-3 hours

---

## Objective

Define the D1 schema using Drizzle ORM, generate migrations, and provide a typed query layer. The Drizzle schema is the **single source of truth** for table structure. Zod schemas (from spec-00) are the single source of truth for data contracts. This spec bridges them.

---

## Storage Philosophy (unchanged)

**Store only what GitHub cannot give us.** Computed metrics, aggregated signals, domain tags, final scores. No raw diffs, no GitHub profile data, no review body text.

---

## Execution Steps

### Step 1: Create the D1 database

```bash
npx wrangler d1 create wdtw-db
```

Take the output `database_id` and paste it into `wrangler.jsonc`.

### Step 2: Define Drizzle schema

Create `src/db/schema.ts` — the single source of truth for table structure.

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ============================================================
// Developers
// ============================================================
export const developers = sqliteTable('developers', {
  id: text('id').primaryKey(),                        // GitHub numeric user ID
  username: text('username').notNull().unique(),       // GitHub login
  optedOut: integer('opted_out', { mode: 'boolean' }).notNull().default(false),
  lastIngestedAt: text('last_ingested_at'),
  ingestionStatus: text('ingestion_status').notNull().default('pending'),
  // Scores (null until computed)
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
  description: text('description'),                    // repo description — shown in domain tagger prompt
  primaryLanguage: text('primary_language'),
  stars: integer('stars').notNull().default(0),
  contributorsCount: integer('contributors_count'),
  hasTests: integer('has_tests', { mode: 'boolean' }).notNull().default(false),
  topics: text('topics'),                              // JSON string[]: GitHub repo.topics — high-signal domain hint
  cachedAt: text('cached_at').notNull(),
});

// ============================================================
// Contributions (computed metrics per commit)
// ============================================================
export const contributions = sqliteTable('contributions', {
  id: text('id').primaryKey(),                         // commit SHA
  developerId: text('developer_id').notNull(),
  repoFullName: text('repo_full_name').notNull(),
  kind: text('kind').notNull().default('commit'),
  contributionType: text('contribution_type'),
  authoredAt: text('authored_at').notNull(),
  messageHead: text('message_head'),                   // first 120 chars
  additions: integer('additions').notNull().default(0),
  deletions: integer('deletions').notNull().default(0),
  filesChanged: integer('files_changed').notNull().default(0),
  // Analysis metrics — written by spec-03 analyzeCommitDetail(), used by spec-05 scoring
  churn: integer('churn'),                             // totalAdditions + totalDeletions — for SEU
  fileCount: integer('file_count'),                    // files changed — for SEU file-coordination term
  normalizedEntropy: real('normalized_entropy'),       // H ∈ [0,1]: normalized Shannon entropy — for SEU
  complexityDelta: real('complexity_delta'),           // signed ΔCC: negative = reduced complexity
  complexityDeltaAbs: real('complexity_delta_abs'),    // |ΔCC| — for EffortH cyclomatic multiplier
  testRatio: real('test_ratio'),                       // [0,1]: test_churn / total_churn — for QualityH
  // Scoring outputs
  qualityScore: real('quality_score'),                 // normalized ValueH → [0,100]
  recencyWeightedScore: real('recency_weighted_score'), // qualityScore × exp(−λ × months)
  domains: text('domains'),                            // JSON array
  languages: text('languages'),                        // JSON array
  classified: integer('classified', { mode: 'boolean' }).notNull().default(false),
  scored: integer('scored', { mode: 'boolean' }).notNull().default(false),
}, (t) => [
  index('idx_contributions_developer').on(t.developerId),
  index('idx_contributions_authored').on(t.authoredAt),
  index('idx_contributions_unclassified').on(t.classified),
  index('idx_contributions_unscored').on(t.scored),
]);

// ============================================================
// Reviews (aggregated signals only)
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
// ============================================================
export const developerDomains = sqliteTable('developer_domains', {
  developerId: text('developer_id').notNull(),
  domain: text('domain').notNull(),
  score: real('score').notNull().default(0),
  contributionCount: integer('contribution_count').notNull().default(0),
  evidenceRepos: text('evidence_repos'),               // JSON array
  embeddingId: text('embedding_id'),
}, (t) => [
  index('idx_developer_domains_domain').on(t.domain),
  index('idx_developer_domains_score').on(t.score),
]);

// No API key or shortlist tables.
// The web UI is a demo — shortlists live in the browser (localStorage).
// Auth is not needed for the demo; the Worker endpoints are public.
// When this evolves into a paid MCP product, auth belongs at the MCP layer.
```

### Step 3: Generate migration

```bash
npx drizzle-kit generate
```

This generates `migrations/0000_initial.sql` from the Drizzle schema. Review it, then apply:

```bash
# Local
npx wrangler d1 migrations apply wdtw-db --local

# Remote
npx wrangler d1 migrations apply wdtw-db --remote
```

**Note:** After adding the new analysis metric columns (`churn`, `file_count`, `normalized_entropy`, `complexity_delta`, `complexity_delta_abs`, `test_ratio`) to the contributions table (see Step 2 above), run `drizzle-kit generate` again to produce an incremental migration (e.g. `migrations/0001_scoring_schema.sql`), then apply with:

```bash
npx wrangler d1 migrations apply wdtw-db --local
npx wrangler d1 migrations apply wdtw-db --remote
```

**Important:** Drizzle generates the SQL. We never hand-write it. If the schema changes, run `drizzle-kit generate` again — it produces incremental migrations.

### Step 4: Drizzle client factory

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDB(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DrizzleDB = ReturnType<typeof createDB>;
```

### Step 5: Typed query helpers

Create `src/db/queries.ts` — Drizzle-based queries used across specs. Type-safe, no raw SQL.

```typescript
// src/db/queries.ts
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { DrizzleDB } from './client';
import { developers, repos, contributions, reviews, developerDomains } from './schema';
import type { DeveloperScore } from '../schemas/developer';

export class Queries {
  constructor(private db: DrizzleDB) {}

  // -- Developers --

  async getDeveloper(id: string) {
    return this.db.select().from(developers)
      .where(and(eq(developers.id, id), eq(developers.optedOut, false)))
      .get();
  }

  async getDeveloperByUsername(username: string) {
    return this.db.select().from(developers)
      .where(and(eq(developers.username, username), eq(developers.optedOut, false)))
      .get();
  }

  async upsertDeveloper(id: string, username: string) {
    await this.db.insert(developers)
      .values({ id, username, ingestionStatus: 'pending' })
      .onConflictDoUpdate({
        target: developers.id,
        set: { username },
      });
  }

  async setIngestionStatus(id: string, status: string) {
    await this.db.update(developers)
      .set({ ingestionStatus: status, lastIngestedAt: new Date().toISOString() })
      .where(eq(developers.id, id));
  }

  async updateScores(id: string, scores: DeveloperScore) {
    await this.db.update(developers)
      .set({
        overallImpact: scores.overallImpact,
        codeQuality: scores.codeQuality,
        reviewQuality: scores.reviewQuality,
        documentationQuality: scores.documentationQuality,
        collaborationBreadth: scores.collaborationBreadth,
        consistencyScore: scores.consistencyScore,
        recentActivityScore: scores.recentActivityScore,
        scoreVersion: scores.scoreVersion,
        scoredAt: scores.scoredAt,
      })
      .where(eq(developers.id, id));
  }

  // -- Contributions --

  async insertContribution(
    sha: string, developerId: string, repoFullName: string,
    authoredAt: string, messageHead: string | null,
    additions: number, deletions: number, filesChanged: number,
  ) {
    await this.db.insert(contributions)
      .values({
        id: sha, developerId, repoFullName, kind: 'commit',
        authoredAt, messageHead, additions, deletions, filesChanged,
      })
      .onConflictDoNothing();
  }

  async getUnclassified(limit: number = 100) {
    return this.db.select().from(contributions)
      .where(eq(contributions.classified, false))
      .limit(limit)
      .all();
  }

  async markClassified(id: string, type: string, domains: string[]) {
    await this.db.update(contributions)
      .set({ contributionType: type, domains: JSON.stringify(domains), classified: true })
      .where(eq(contributions.id, id));
  }

  async markScored(id: string, qualityScore: number, recencyWeighted: number) {
    await this.db.update(contributions)
      .set({ qualityScore, recencyWeightedScore: recencyWeighted, scored: true })
      .where(eq(contributions.id, id));
  }

  async setContributionMetrics(
    sha: string,
    metrics: {
      churn: number;
      fileCount: number;
      normalizedEntropy: number;
      complexityDelta: number;
      complexityDeltaAbs: number;
      testRatio: number;
      languages: string[];
    },
  ) {
    await this.db.update(contributions)
      .set({
        churn: metrics.churn,
        fileCount: metrics.fileCount,
        normalizedEntropy: metrics.normalizedEntropy,
        complexityDelta: metrics.complexityDelta,
        complexityDeltaAbs: metrics.complexityDeltaAbs,
        testRatio: metrics.testRatio,
        languages: JSON.stringify(metrics.languages),
      })
      .where(eq(contributions.id, sha));
  }

  // -- Repos --

  async upsertRepo(
    fullName: string,
    language: string | null,
    stars: number,
    contributorsCount: number | null,
    hasTests: boolean,
    description: string | null,
    topics: string[],
  ) {
    await this.db.insert(repos)
      .values({
        fullName, description, primaryLanguage: language, stars, contributorsCount,
        hasTests, topics: JSON.stringify(topics), cachedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: repos.fullName,
        set: {
          description, stars, contributorsCount, hasTests,
          topics: JSON.stringify(topics), cachedAt: new Date().toISOString(),
        },
      });
  }

  async getRepo(fullName: string) {
    return this.db.select().from(repos).where(eq(repos.fullName, fullName)).get();
  }

  // -- Reviews --

  async insertReview(
    id: string, developerId: string, repoFullName: string,
    prNumber: number, prAuthorId: string | null, reviewState: string,
    commentCount: number, totalCommentLength: number,
    referencesCodeLines: boolean, submittedAt: string,
  ) {
    await this.db.insert(reviews)
      .values({
        id, developerId, repoFullName, prNumber, prAuthorId,
        reviewState, commentCount, totalCommentLength,
        referencesCodeLines, submittedAt,
      })
      .onConflictDoNothing();
  }

  async getReviewsByDeveloper(developerId: string) {
    return this.db.select().from(reviews)
      .where(eq(reviews.developerId, developerId))
      .all();
  }

  // -- Domains --

  async upsertDomainScore(
    developerId: string, domain: string, score: number,
    contributionCount: number, evidenceRepos: string[],
  ) {
    await this.db.insert(developerDomains)
      .values({
        developerId, domain, score, contributionCount,
        evidenceRepos: JSON.stringify(evidenceRepos),
      })
      .onConflictDoUpdate({
        target: [developerDomains.developerId, developerDomains.domain],
        set: { score, contributionCount, evidenceRepos: JSON.stringify(evidenceRepos) },
      });
  }

  async getDomainsByDeveloper(developerId: string) {
    return this.db.select().from(developerDomains)
      .where(eq(developerDomains.developerId, developerId))
      .orderBy(desc(developerDomains.score))
      .all();
  }

  // -- Search --

  async searchScoredDevelopers(opts: {
    minQuality?: number;
    minReview?: number;
    limit: number;
  }) {
    let query = this.db.select().from(developers)
      .where(and(
        eq(developers.optedOut, false),
        eq(developers.ingestionStatus, 'complete'),
        ...(opts.minQuality !== undefined ? [gte(developers.codeQuality, opts.minQuality)] : []),
        ...(opts.minReview !== undefined ? [gte(developers.reviewQuality, opts.minReview)] : []),
      ))
      .orderBy(desc(developers.overallImpact))
      .limit(opts.limit);

    return query.all();
  }

}
// No API key or shortlist query methods.
// Shortlist state lives in browser localStorage — see ShortlistStore.ts in spec-09.
```

### Step 6: Composite primary key for developer_domains

Drizzle requires a small adjustment for composite PKs on SQLite:

```typescript
// In schema.ts, the developerDomains table needs a composite primary key.
// Drizzle SQLite supports this via primaryKey():
import { primaryKey } from 'drizzle-orm/sqlite-core';

export const developerDomains = sqliteTable('developer_domains', {
  developerId: text('developer_id').notNull(),
  domain: text('domain').notNull(),
  score: real('score').notNull().default(0),
  contributionCount: integer('contribution_count').notNull().default(0),
  evidenceRepos: text('evidence_repos'),
  embeddingId: text('embedding_id'),
}, (t) => [
  primaryKey({ columns: [t.developerId, t.domain] }),
  index('idx_developer_domains_domain').on(t.domain),
  index('idx_developer_domains_score').on(t.score),
]);
```

### Step 7: Seed data for local development

```bash
npx wrangler d1 execute wdtw-db --local --command="
INSERT INTO developers (id, username, ingestion_status, overall_impact, code_quality, review_quality, documentation_quality, collaboration_breadth, consistency_score, recent_activity_score, score_version, scored_at)
VALUES
  ('1001', 'alice-systems', 'complete', 88, 91, 84, 72, 65, 78, 90, '0.1.0', '2026-02-17T00:00:00Z'),
  ('1002', 'bob-frontend', 'complete', 75, 80, 70, 85, 60, 72, 80, '0.1.0', '2026-02-17T00:00:00Z'),
  ('1003', 'carol-ml', 'complete', 82, 85, 78, 60, 70, 80, 85, '0.1.0', '2026-02-17T00:00:00Z');

INSERT INTO developer_domains (developer_id, domain, score, contribution_count, evidence_repos)
VALUES
  ('1001', 'distributed-systems', 93, 340, '[\"example/raft-rs\",\"example/consensus-go\"]'),
  ('1001', 'networking', 78, 120, '[\"example/netstack\"]'),
  ('1002', 'frontend-react', 88, 500, '[\"example/dashboard\",\"example/design-system\"]'),
  ('1003', 'ml-infrastructure', 90, 280, '[\"example/pipeline\",\"example/feature-store\"]');
"
```

---

## Definition of Done

- [ ] `npx drizzle-kit generate` produces a clean migration SQL file
- [ ] Migration applied to local D1 via `npx wrangler d1 migrations apply wdtw-db --local`
- [ ] `createDB(env.DB)` returns a typed Drizzle instance
- [ ] All `Queries` methods compile with zero errors
- [ ] `Queries.getDeveloper()` returns a row matching the Drizzle schema type
- [ ] Seed data loads and is queryable
- [ ] No raw SQL strings anywhere in `queries.ts` — all Drizzle query builder

## Output Artifacts

- `src/db/schema.ts` — Drizzle table definitions (developers, repos, contributions, reviews, developer_domains)
- `src/db/client.ts` — Drizzle client factory
- `src/db/queries.ts` — typed query helpers
- `drizzle.config.ts` — Drizzle Kit config
- `migrations/0000_*.sql` — initial migration
- `migrations/0001_scoring_schema.sql` — analysis metric columns on contributions
