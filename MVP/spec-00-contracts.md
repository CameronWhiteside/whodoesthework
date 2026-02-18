# Spec 00 — Shared Contracts, Types & Project Scaffold

**Status:** Not Started
**Blocks:** Everything (all specs import from this)
**Blocked By:** Nothing
**Estimated effort:** 2-3 hours
**Parallelizable:** No — this ships first, then everything else starts

---

## Objective

Set up the monorepo structure, Zod schemas as the single source of truth for all data contracts, Drizzle ORM for type-safe D1 access, and the Wrangler config with consistently namespaced Cloudflare primitives. Everything else builds against this.

---

## Design Decisions

### Zod-first contracts, not TypeScript interfaces

Every data shape in the system is defined as a **Zod schema**. TypeScript types are **inferred** from those schemas via `z.infer<>`. This gives us:

1. **Runtime validation** at system boundaries (MCP tool inputs, GitHub API responses, queue messages)
2. **Single source of truth** — no drift between runtime checks and compile-time types
3. **Self-documenting** — Zod schemas encode constraints (min/max, enums, defaults) that TS interfaces cannot

### Drizzle ORM for D1

All D1 access goes through Drizzle. This gives us:

1. **Type-safe queries** — no raw SQL string typos, columns are autocompleted
2. **Schema-as-code** — the Drizzle schema definition IS the migration source
3. **Zero runtime overhead** — Drizzle compiles to raw SQL, no query builder bloat

### `wdtw-` namespace

All Cloudflare resources are prefixed with `wdtw-` (whodoesthe.work abbreviation) to avoid naming collisions in shared Cloudflare accounts and make resources immediately identifiable in the dashboard.

---

## Execution Steps

### Step 1: Initialize the project

```bash
mkdir -p whodoesthework && cd whodoesthework
npm init -y
npm install --save-dev typescript wrangler@latest @cloudflare/workers-types drizzle-kit
npm install drizzle-orm zod @modelcontextprotocol/sdk @cloudflare/agents
npx tsc --init --strict --target ES2022 --module ESNext --moduleResolution bundler

# Create .gitignore — .dev.vars must never be committed
cat > .gitignore << 'EOF'
node_modules/
dist/
.wrangler/
.dev.vars
*.local
EOF

# .dev.vars.example is committed as a template; .dev.vars is gitignored and never committed
cat > .dev.vars.example << 'EOF'
# Copy this to .dev.vars and fill in real values
# NEVER commit .dev.vars
GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
API_SECRET_KEY=your-dev-secret-here
EOF
cp .dev.vars.example .dev.vars
```

> **Note:** Wrangler reads `.dev.vars` automatically during `wrangler dev`. It is never read in production. Secrets in production are set via `wrangler secret put` (see Step 9).

### Step 2: Configure Wrangler

Create `wrangler.jsonc`. All resource names prefixed with `wdtw-`.

```jsonc
{
  "name": "wdtw",
  "main": "src/index.ts",
  "compatibility_date": "2025-12-01",

  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "wdtw-db",
      "database_id": "TBD_AFTER_CREATION"
    }
  ],

  // Queues
  "queues": {
    "producers": [
      {
        "binding": "INGESTION_QUEUE",
        "queue": "wdtw-ingestion"
      }
    ],
    "consumers": [
      {
        "queue": "wdtw-ingestion",
        "max_batch_size": 10,
        "max_retries": 3,
        "dead_letter_queue": "wdtw-ingestion-dlq"
      }
    ]
  },

  // Vectorize
  "vectorize": [
    {
      "binding": "VECTOR_INDEX",
      "index_name": "wdtw-vectors"
    }
  ],

  // Durable Objects
  "durable_objects": {
    "bindings": [
      { "name": "INGESTION_DO", "class_name": "DeveloperIngestion" }
    ]
  },
  "migrations": [
    {
      "tag": "wdtw-v1",
      "new_classes": ["DeveloperIngestion"]
    }
  ],

  // Workers AI
  "ai": {
    "binding": "AI"
  },

  // Secrets (set via `wrangler secret put`):
  // GITHUB_TOKEN
  // API_SECRET_KEY

  "vars": {
    "ENVIRONMENT": "development"
  }
}
```

### Step 3: Create directory structure

```
src/
├── index.ts                # Main entrypoint, routes requests
├── db/
│   ├── schema.ts           # Drizzle table definitions (source of truth for D1)
│   ├── client.ts           # Drizzle client factory
│   └── queries.ts          # Typed query helpers built on Drizzle
├── schemas/
│   ├── developer.ts        # Zod schemas + inferred types
│   ├── contribution.ts     # Zod schemas + inferred types
│   ├── review.ts           # Zod schemas + inferred types
│   ├── domain.ts           # Zod schemas + inferred types
│   ├── mcp.ts              # Zod schemas for MCP tool inputs/outputs
│   ├── queue.ts            # Zod discriminated union for queue messages
│   └── github.ts           # Zod schemas for GitHub API response subsets
├── types/
│   └── env.ts              # Env bindings type (Cloudflare-specific, not Zod)
├── ingestion/
│   ├── durable-object.ts
│   ├── github-client.ts
│   ├── discovery.ts
│   └── repo-filter.ts
├── analysis/
│   ├── diff-parser.ts
│   ├── complexity.ts
│   ├── metrics.ts
│   └── file-classifier.ts
├── classification/
│   ├── contribution-classifier.ts
│   └── domain-tagger.ts
├── scoring/
│   ├── quality-score.ts
│   ├── review-score.ts
│   ├── doc-score.ts
│   ├── aggregate.ts
│   └── percentile.ts
├── search/
│   ├── vector-store.ts
│   └── query-parser.ts
├── mcp/
│   ├── server.ts
│   ├── tools/
│   │   ├── search-developers.ts
│   │   ├── get-developer-profile.ts
│   │   └── compare-developers.ts
│   └── auth.ts
└── shared/
    └── constants.ts
```

**Key structural change:** `src/types/` is now just `env.ts` (CF bindings can't be Zod). All data contracts live in `src/schemas/` as Zod schemas. DB table definitions live in `src/db/schema.ts` as Drizzle schemas.

### Step 4: Define the Env type

```typescript
// src/types/env.ts
// This stays as a TS interface — it describes Cloudflare bindings, not data.
export interface Env {
  DB: D1Database;
  INGESTION_QUEUE: Queue;
  VECTOR_INDEX: VectorizeIndex;
  INGESTION_DO: DurableObjectNamespace;
  AI: Ai;
  GITHUB_TOKEN: string;
  API_SECRET_KEY: string;
  ENVIRONMENT: string;
}
```

### Step 5: Define Zod schemas (the contract layer)

Every data shape is a Zod schema. Types are inferred, never hand-written.

```typescript
// src/schemas/contribution.ts
import { z } from 'zod';

export const contributionKind = z.enum(['commit', 'documentation']);

export const contributionType = z.enum([
  'feature', 'bugfix', 'refactor', 'test', 'documentation',
  'infrastructure', 'dependency', 'formatting', 'generated',
]);

export type ContributionKind = z.infer<typeof contributionKind>;
export type ContributionType = z.infer<typeof contributionType>;

// Schema for a contribution row as returned by Drizzle / used in scoring
export const contributionSchema = z.object({
  id: z.string(),                               // commit SHA
  developerId: z.string(),
  repoFullName: z.string(),
  kind: contributionKind,
  contributionType: contributionType.nullable(),
  authoredAt: z.string().datetime(),
  messageHead: z.string().max(120).nullable(),
  additions: z.number().int().nonneg(),
  deletions: z.number().int().nonneg(),
  filesChanged: z.number().int().nonneg(),
  complexityDelta: z.number().nullable(),
  entropy: z.number().nonneg().nullable(),
  testCorrelated: z.number().min(-0.2).max(0.3).nullable(),
  qualityScore: z.number().min(0).max(100).nullable(),
  recencyWeightedScore: z.number().min(0).max(100).nullable(),
  domains: z.array(z.string()),
  languages: z.array(z.string()),
  classified: z.boolean(),
  scored: z.boolean(),
});

export type Contribution = z.infer<typeof contributionSchema>;

export const qualityMetricsSchema = z.object({
  complexityDelta: z.number(),
  entropy: z.number().nonneg(),
  testCorrelated: z.number(),
  repoWeight: z.number().positive(),
});

export type QualityMetrics = z.infer<typeof qualityMetricsSchema>;
```

```typescript
// src/schemas/developer.ts
import { z } from 'zod';
import { domainScoreSchema } from './domain';

export const ingestionStatus = z.enum(['pending', 'in_progress', 'complete', 'failed']);

export type IngestionStatus = z.infer<typeof ingestionStatus>;

export const developerSchema = z.object({
  id: z.string(),
  username: z.string(),
  lastIngestedAt: z.string().datetime().nullable(),
  ingestionStatus,
  optedOut: z.boolean(),
});

export type Developer = z.infer<typeof developerSchema>;

export const developerScoreSchema = z.object({
  overallImpact: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  reviewQuality: z.number().min(0).max(100),
  documentationQuality: z.number().min(0).max(100),
  collaborationBreadth: z.number().min(0).max(100),
  consistencyScore: z.number().min(0).max(100),
  recentActivityScore: z.number().min(0).max(100),
  scoreVersion: z.string(),
  scoredAt: z.string().datetime(),
});

export type DeveloperScore = z.infer<typeof developerScoreSchema>;

export const developerProfileSchema = developerScoreSchema.extend({
  githubUsername: z.string(),
  githubUrl: z.string().url(),
  domains: z.array(domainScoreSchema),
  topLanguages: z.array(z.object({
    language: z.string(),
    percentage: z.number().int().min(0).max(100),
  })),
  activeReposCount: z.number().int().nonneg(),
  totalContributions: z.number().int().nonneg(),
  contributionSpanMonths: z.number().int().nonneg(),
  evidence: z.object({
    topCommits: z.array(z.object({
      url: z.string().url(),
      description: z.string().max(120),
      qualityScore: z.number().min(0).max(100),
    })),
    topReviews: z.array(z.object({
      url: z.string().url(),
      depthScore: z.number().min(0).max(100),
    })),
  }),
});

export type DeveloperProfile = z.infer<typeof developerProfileSchema>;
```

```typescript
// src/schemas/domain.ts
import { z } from 'zod';

export const domainScoreSchema = z.object({
  domain: z.string(),
  score: z.number().min(0).max(100),
  contributionCount: z.number().int().nonneg(),
  evidenceRepos: z.array(z.string()),
});

export type DomainScore = z.infer<typeof domainScoreSchema>;
```

```typescript
// src/schemas/review.ts
import { z } from 'zod';

export const reviewState = z.enum(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED']);

export type ReviewState = z.infer<typeof reviewState>;

export const reviewSchema = z.object({
  id: z.string(),
  developerId: z.string(),
  repoFullName: z.string(),
  prNumber: z.number().int().positive(),
  prAuthorId: z.string().nullable(),
  reviewState,
  commentCount: z.number().int().nonneg(),
  totalCommentLength: z.number().int().nonneg(),
  referencesCodeLines: z.boolean(),
  submittedAt: z.string().datetime(),
  depthScore: z.number().min(0).max(100).nullable(),
});

export type Review = z.infer<typeof reviewSchema>;

export const reviewStatsSchema = z.object({
  reviewsGiven: z.number().int().nonneg(),
  avgReviewDepth: z.number().nonneg(),
  substantiveReviewRatio: z.number().min(0).max(1),
  changeRequestRatio: z.number().min(0).max(1),
});

export type ReviewStats = z.infer<typeof reviewStatsSchema>;
```

```typescript
// src/schemas/queue.ts
import { z } from 'zod';

export const queueMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ingest_developer'), username: z.string() }),
  z.object({ type: z.literal('analyze_repo'), developerId: z.string(), repoFullName: z.string() }),
  z.object({ type: z.literal('analyze_reviews'), developerId: z.string(), repoFullName: z.string(), prNumbers: z.array(z.number().int()) }),
  z.object({ type: z.literal('compute_scores'), developerId: z.string() }),
  z.object({ type: z.literal('build_vectors'), developerId: z.string() }),
]);

export type QueueMessage = z.infer<typeof queueMessageSchema>;
```

```typescript
// src/schemas/mcp.ts
import { z } from 'zod';

export const searchDevelopersInputSchema = z.object({
  query: z.string().min(1),
  domains: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  minQualityScore: z.number().min(0).max(100).optional(),
  minReviewScore: z.number().min(0).max(100).optional(),
  requiresDocumentation: z.boolean().optional(),
  activeWithinMonths: z.number().int().positive().optional().default(12),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type SearchDevelopersInput = z.infer<typeof searchDevelopersInputSchema>;

export const developerSummarySchema = z.object({
  githubUsername: z.string(),
  githubUrl: z.string().url(),
  overallImpact: z.number(),
  codeQualityPercentile: z.number(),
  reviewQualityPercentile: z.number(),
  topDomains: z.array(z.object({ domain: z.string(), score: z.number() })),
  topLanguages: z.array(z.object({ language: z.string(), percentage: z.number() })),
  activeReposCount: z.number().int(),
  recentActivity: z.enum(['highly_active', 'active', 'moderate', 'low']),
  matchExplanation: z.string(),
});

export type DeveloperSummary = z.infer<typeof developerSummarySchema>;

export const searchDevelopersOutputSchema = z.object({
  developers: z.array(developerSummarySchema),
  totalMatches: z.number().int().nonneg(),
  queryInterpretation: z.string(),
});

export type SearchDevelopersOutput = z.infer<typeof searchDevelopersOutputSchema>;

export const getDeveloperProfileInputSchema = z.object({
  githubUsername: z.string().min(1),
  includeEvidence: z.boolean().optional().default(true),
  domains: z.array(z.string()).optional(),
});

export type GetDeveloperProfileInput = z.infer<typeof getDeveloperProfileInputSchema>;

export const compareDevelopersInputSchema = z.object({
  githubUsernames: z.array(z.string()).min(2).max(5),
  focusDomains: z.array(z.string()).optional(),
});

export type CompareDevelopersInput = z.infer<typeof compareDevelopersInputSchema>;

export const comparisonResultSchema = z.object({
  developers: z.array(z.any()), // uses DeveloperProfile — circular ref handled at runtime
  comparisonSummary: z.string(),
  dimensionRankings: z.array(z.object({
    dimension: z.string(),
    rankedUsernames: z.array(z.string()),
  })),
});

export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
```

```typescript
// src/schemas/github.ts
import { z } from 'zod';

// Minimal schemas for the GitHub API response fields we actually use.
// We validate what we read from GitHub — defensive against API changes.

export const githubUserSchema = z.object({
  id: z.number().int(),
  login: z.string(),
  avatar_url: z.string().url(),
  bio: z.string().nullable(),
  public_repos: z.number().int(),
  followers: z.number().int(),
  created_at: z.string(),
});

export type GitHubUser = z.infer<typeof githubUserSchema>;

export const githubRepoSchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number().int(),
  forks_count: z.number().int(),
  fork: z.boolean(),
  pushed_at: z.string(),
  topics: z.array(z.string()).optional(),
});

export type GitHubRepo = z.infer<typeof githubRepoSchema>;

export const githubContributorSchema = z.object({
  login: z.string(),
  id: z.number().int(),
  contributions: z.number().int(),
  type: z.string(),
});

export type GitHubContributor = z.infer<typeof githubContributorSchema>;

export const githubCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: z.object({ name: z.string(), email: z.string(), date: z.string() }),
    message: z.string(),
  }),
  author: z.object({ id: z.number().int(), login: z.string() }).nullable(),
  parents: z.array(z.object({ sha: z.string() })),
});

export type GitHubCommit = z.infer<typeof githubCommitSchema>;

export const githubCommitDetailSchema = githubCommitSchema.extend({
  stats: z.object({ additions: z.number(), deletions: z.number(), total: z.number() }),
  files: z.array(z.object({
    filename: z.string(),
    status: z.string(),
    additions: z.number().int(),
    deletions: z.number().int(),
    patch: z.string().optional(),
  })),
});

export type GitHubCommitDetail = z.infer<typeof githubCommitDetailSchema>;

export const githubPRSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  state: z.string(),
  user: z.object({ id: z.number().int(), login: z.string() }),
  created_at: z.string(),
  merged_at: z.string().nullable(),
});

export type GitHubPR = z.infer<typeof githubPRSchema>;

export const githubReviewSchema = z.object({
  id: z.number().int(),
  user: z.object({ id: z.number().int(), login: z.string() }),
  state: z.string(),
  body: z.string(),
  submitted_at: z.string(),
});

export type GitHubReview = z.infer<typeof githubReviewSchema>;

export const githubPRCommentSchema = z.object({
  id: z.number().int(),
  user: z.object({ id: z.number().int(), login: z.string() }),
  body: z.string(),
  path: z.string(),
  line: z.number().int().nullable(),
  created_at: z.string(),
});

export type GitHubPRComment = z.infer<typeof githubPRCommentSchema>;

export const githubSearchResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    total_count: z.number().int(),
    incomplete_results: z.boolean(),
    items: z.array(itemSchema),
  });
```

### Step 6: Constants

```typescript
// src/shared/constants.ts

// ── System ───────────────────────────────────────────────────────────────────
export const SCORE_VERSION = '0.1.0';
export const STALENESS_DAYS = 7;
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_PER_PAGE = 100;
export const MAX_COMMIT_LINES = 10_000;

// ── Recency decay ─────────────────────────────────────────────────────────────
// exp(-RECENCY_LAMBDA × months_ago): λ=0.05 → ~78% at 5 months, ~55% at 12 months
export const RECENCY_LAMBDA = 0.05;

// ── SEU (Simple Effort Unit) coefficients ────────────────────────────────────
// SEU = ln(1+churn) × (1 + SEU_FILE_COEFF × ln(1+F)) × (1 + SEU_ENTROPY_COEFF × H)
// Resists gaming: log-scale churn, file-coordination overhead, spread bonus.
export const SEU_FILE_COEFF = 0.15;      // file coordination overhead per ln(1+F)
export const SEU_ENTROPY_COEFF = 0.20;   // spread bonus for cross-cutting changes

// ── EffortH (Hybrid Effort) coefficients ──────────────────────────────────────
// EffortH = SEU × (1 + EFFORH_CC_COEFF × |ΔCC|) × (1 + EFFORH_CENTRALITY_COEFF × centrality)
export const EFFORH_CC_COEFF = 0.03;          // cyclomatic complexity multiplier per decision point
export const EFFORH_CENTRALITY_COEFF = 0.50;  // centrality bonus in high-impact repos

// ── QualityH (Quality multiplier) coefficients ───────────────────────────────
// QualityH = clamp(BASE + W_MAINT × maintShare + W_TEST × testRatio − W_REWORK × reworkRate, MIN, MAX)
// Result ∈ [QUALITY_MIN, QUALITY_MAX] — applied as a multiplier on EffortH.
export const QUALITY_BASE = 0.80;
export const QUALITY_MAINTAINABLE_WEIGHT = 0.20;  // reward: lower complexity additions
export const QUALITY_TEST_WEIGHT = 0.30;           // reward: test churn alongside prod churn
export const QUALITY_REWORK_WEIGHT = 0.50;         // penalty: rework rate (V1: always 0, not yet computed)
export const QUALITY_MIN = 0.40;                   // floor — even low-quality work has effort value
export const QUALITY_MAX = 1.20;                   // ceiling — 20% bonus for excellent practices

// ── Normalization references (calibration) ───────────────────────────────────
// qualityScore (per contribution) = min(100, ln(1+valueH) / ln(1+REF) × 100)
// Calibrated: a 300-line feature commit with moderate spread → qualityScore ≈ 50.
export const CODE_QUALITY_REF = 15.0;

// domainScore = min(100, ln(1 + Σ recencyWeightedScore) / ln(1 + DOMAIN_SCORE_REF) × 100)
// Calibrated: ~20 good contributions over 12 months → domain score ≈ 80.
export const DOMAIN_SCORE_REF = 500;

// recentActivityScore = min(100, ln(1+recentCount) / ln(1+RECENT_ACTIVITY_REF) × 100)
// Calibrated: 20 contributions in last 12 months → score = 100.
export const RECENT_ACTIVITY_REF = 20;

// ── Contribution type weights ────────────────────────────────────────────────
// Applied as typeWeight multiplier in ValueH = EffortH × QualityH × typeWeight.
export const CONTRIBUTION_TYPE_WEIGHTS: Record<string, number> = {
  feature: 1.0,
  bugfix: 1.0,
  refactor: 0.9,
  test: 0.8,
  documentation: 0.7,
  infrastructure: 0.6,
  dependency: 0.2,
  formatting: 0.1,
  generated: 0.0,
};

// ── Overall score dimension weights ──────────────────────────────────────────
// overallImpact = Σ (dimensionScore × SCORE_WEIGHTS[dimension])
export const SCORE_WEIGHTS = {
  codeQuality: 0.35,
  reviewQuality: 0.25,
  documentationQuality: 0.10,
  collaborationBreadth: 0.10,
  consistencyScore: 0.10,
  recentActivityScore: 0.10,
} as const;

// ── Review score sub-weights ──────────────────────────────────────────────────
// reviewQuality = sum of (ratio × weight) for each signal, normalized to [0,100].
export const REVIEW_SUBSTANTIVE_WEIGHT = 0.40;    // fraction with code-line references
export const REVIEW_DEPTH_WEIGHT = 0.30;          // comment depth (count + length)
export const REVIEW_CHANGE_REQUEST_WEIGHT = 0.10; // willingness to request changes
export const REVIEW_NOT_RUBBER_STAMP_WEIGHT = 0.20; // penalize fast zero-comment approvals
```

### Step 7: Create stub entrypoint

```typescript
// src/index.ts
import { Env } from './types/env';

export { DeveloperIngestion } from './ingestion/durable-object';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/mcp')) {
      return new Response('MCP not yet implemented', { status: 501 });
    }

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', version: '0.1.0' });
    }

    return new Response('whodoesthe.work', { status: 200 });
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    console.log(`Received ${batch.messages.length} messages`);
  },
};
```

### Step 8: Drizzle config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
});
```

### Step 9: Verify it compiles and deploys

```bash
npx wrangler types
npx tsc --noEmit
npx wrangler dev

# For remote (production) — set secrets via wrangler, NEVER via wrangler.jsonc vars:
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put API_SECRET_KEY

# These are now stored encrypted in Cloudflare — not in any committed file.
# To verify secrets are set:
npx wrangler secret list

npx wrangler deploy --dry-run
```

---

## Definition of Done

- [ ] `npm install` succeeds (includes `zod`, `drizzle-orm`, `drizzle-kit`)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx wrangler dev` starts and `/health` returns 200
- [ ] All Zod schemas export both schema objects and inferred types
- [ ] All Cloudflare resources in `wrangler.jsonc` are prefixed `wdtw-`
- [ ] `drizzle.config.ts` exists and points to `src/db/schema.ts`
- [ ] Directory structure matches the tree above
- [ ] `.dev.vars` is in `.gitignore` (verify: `git check-ignore .dev.vars` prints the path)
- [ ] `wrangler secret list` shows both `GITHUB_TOKEN` and `API_SECRET_KEY` after production deploy

## Output Artifacts

- `.gitignore`
- `.dev.vars.example` (never `.dev.vars` — gitignored)
- `wrangler.jsonc`
- `drizzle.config.ts`
- `src/schemas/*.ts` — all Zod schemas
- `src/types/env.ts`
- `src/shared/constants.ts`
- `src/index.ts`
- `package.json` with dependencies

---

## Notes for Parallel Specs

1. **Import types from `../schemas/<module>` — never hand-write interfaces.** If you need a type, it must be `z.infer<typeof someSchema>`.
2. **Import Drizzle tables from `../db/schema` — never write raw SQL.** Use `db.select().from(developers).where(...)`.
3. **Validate at boundaries.** Parse GitHub API responses with `githubCommitDetailSchema.parse()`. Parse MCP inputs with `searchDevelopersInputSchema.parse()`. Parse queue messages with `queueMessageSchema.parse()`.
4. **All Cloudflare resources are `wdtw-` prefixed.** DB is `wdtw-db`, queue is `wdtw-ingestion`, vectorize is `wdtw-vectors`.
5. **No R2.** No raw data storage.
6. Deploy with `npx wrangler deploy` — there is one Worker.
