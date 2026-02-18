# whodoesthe.work

Developer intelligence platform. Analyzes GitHub contribution history to produce multi-dimensional quality scores and exposes semantic search — through a demo UI and an open MCP server for AI agents.

**Live:** https://whodoesthe.work
**Stack:** Cloudflare Workers · D1 · Vectorize · Durable Objects · Queues · Workers AI · SvelteKit

---

## Current state

**What's working:**

- ~48 developers fully indexed, scoring pipeline running end-to-end
- 6-dimension scoring model (code quality, review quality, docs, collaboration, consistency, recency) with per-contribution SEU/EffortH/QualityH math
- Workers AI classification on every commit (feature/bugfix/refactor/test/docs/etc) and domain tagging
- Vectorize semantic search with cosine similarity + SQL score filters
- MCP server open at `/mcp` — `search_developers`, `get_developer_profile`, `compare_developers` all working
- One-pager UI: inline search form, live stats from the real index, pipeline explainer, domain chips, MCP teaser
- 81 unit tests across the pure-function scoring + analysis modules

**What was cut to keep the demo tight:**

- **Shortlist** — removed. Was localStorage-backed, no server state. Not worth the UI surface area right now.
- **MCP auth** — removed. Had a full constant-time Bearer token implementation, but there's no key registration flow, so it was gating the demo for no actual security benefit. MCP endpoint is now fully open.

**Learning pain points so far:**

- **`@cloudflare/agents` version instability** — v0.0.16 exports `Agent`, not `McpAgent`. The SDK naming changed mid-development and the MCP SDK docs lag. The pattern (extend `Agent`, wire up `McpServer` + `WebStandardStreamableHTTPServerTransport` manually per request) is not what the current docs describe. Keep the version pinned.

- **Durable Objects + Queues interaction** — idempotency is your problem, not the platform's. If a queue message is redelivered, your DO handler must be safe to re-run. This took a debugging session to discover; the queue silently retries on handler throws.

- **SvelteKit adapter-static + Cloudflare Pages serving** — the worker serves the SvelteKit static build via `env.ASSETS`. Works fine, but the integration between `adapter-static` output and Cloudflare's asset routing required some mental model work. The `.svelte-kit/` and `ui/build/` directories should be gitignored (they weren't initially).

- **Workers AI cold classification latency** — first Workers AI call in a request has noticeable warm-up. Solved with `Promise.all()` for parallel classification, but sequential AI calls in the pipeline are a real bottleneck worth watching.

- **Vitest + Workers TypeScript config** — the main `tsconfig.json` uses `"moduleResolution": "bundler"` and `"types": ["@cloudflare/workers-types"]`. Vitest handles this fine since it uses Vite under the hood, but the CF global types (`Request`, `Response`, etc.) conflict in subtle ways if you ever try to test Worker-specific code directly. For now tests only cover pure functions — keep it that way until `@cloudflare/vitest-pool-workers` is more stable.

**What to build next:**

1. **Expand the index** — 48 developers is enough to demo but thin for real search quality. Automated discovery from popular repos + scheduled re-ingestion would get this to 500+.
2. **Scheduled re-scoring cron** — the wrangler.jsonc hook is ready, just needs a `[triggers]` cron. Re-scores existing developers nightly so scores stay current.
3. **Search quality tuning** — query expansion via Workers AI is implemented but the prompt could be tighter. Some searches return weak matches because the embedding of a 2-sentence description doesn't cover the full technical vocabulary.
4. **Profile comparison UI** — `compare_developers` MCP tool exists, no UI for it yet. A side-by-side score comparison page would be a natural next step.
5. **Basic rate limiting on MCP** — it's fully open right now which is fine for demo. For production, even a simple `GITHUB_TOKEN`-gated or IP-rate-limited layer would be enough.
6. **Ingestion progress UI** — the pipeline status (`in_progress`, `pending`, etc.) is in D1 but the developer profile page just shows a spinner. Real-time progress ("analyzing repo 4 of 12") via polling would make the architecture much more legible during a demo.
7. **Test coverage expansion** — the 81 tests cover the math but nothing touches the HTTP layer (Hono router), the ingestion DO logic, or the MCP tools. Integration tests against a local D1 instance would catch regressions in the query layer.

---

## How it works

At a high level: ingest a GitHub username → fetch all their commits and PRs → analyze code complexity and diff structure → classify contributions using AI → score across 6 dimensions → embed into a vector index → expose via search.

```
GitHub API
    ↓
Ingestion DO          — fetch commits, PRs, repo metadata
    ↓
Workers AI            — classify contribution type, extract domains
    ↓
Scoring Engine        — SEU/EffortH/QualityH model → 6 dimension scores
    ↓
Vectorize             — embed developer profile → semantic search index
    ↓
Search (UI + MCP)     — cosine similarity + SQL filters → ranked results
```

---

## Architecture

The entire app is a **single Cloudflare Worker** (`wdtw`). One `wrangler deploy` handles everything.

```
wrangler deploy
  └── src/worker.ts              Main entrypoint (fetch + queue + scheduled handlers)
        ├── /mcp, /sse           → WhodoestheworkMCP Durable Object (MCP server)
        ├── /api/*, /admin/*     → Hono REST router
        └── everything else      → env.ASSETS (SvelteKit static build)
```

### Cloudflare bindings

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1 | Developer records, contributions, reviews, domain scores |
| `VECTOR_INDEX` | Vectorize | Semantic developer profile index (384-dim cosine) |
| `INGESTION_QUEUE` | Queue | Pipeline message bus (analyze_repo, compute_scores, etc.) |
| `INGESTION_DO` | Durable Object | Per-developer ingestion orchestrator (sharded by username) |
| `MCP_DO` | Durable Object | MCP server (stateless, one instance named `default`) |
| `AI` | Workers AI | Classification + domain tagging + embeddings |
| `ASSETS` | Static Assets | SvelteKit CSR build, served for all non-API paths |

### Source layout

```
src/
  worker.ts                  Fetch/queue/scheduled handlers + DO exports
  api/router.ts              Hono REST endpoints (admin + public)
  ingestion/
    durable-object.ts        DeveloperIngestion DO — orchestrates the whole pipeline
    github-client.ts         GitHub REST API client (paginated, rate-limited)
    discovery.ts             Repo discovery
    repo-filter.ts           Which repos to include
  analysis/
    metrics.ts               SEU, EffortH, QualityH scoring formulas (pure functions)
    complexity.ts            Cyclomatic complexity + Shannon entropy
    diff-parser.ts           Parse git patches
    file-classifier.ts       Source / test / doc / infra classification
  classification/
    contribution-classifier.ts   Commit type (feature/bugfix/test/etc) via Workers AI
    domain-tagger.ts             Domain extraction (GitHub topics first, AI fallback)
  scoring/
    aggregate.ts             Orchestrate all 6 dimensions → developer score
    quality-score.ts         Per-contribution value computation
    review-score.ts          Review signal aggregation
    doc-score.ts             Docs-only contribution quality
    collaboration.ts         Cross-repo/org breadth
    consistency.ts           Activity smoothness over time
  search/
    vector-store.ts          Vectorize upsert + query
    embeddings.ts            Text → vector via Workers AI
    query-parser.ts          Semantic search + SQL filter pipeline
  mcp/
    server.ts                WhodoestheworkMCP DO (Agents SDK + MCP SDK)
    tools/
      search-developers.ts
      get-developer-profile.ts
      compare-developers.ts
  db/
    schema.ts                Drizzle D1 schema (5 tables)
    client.ts                D1 client factory
    queries.ts               All DB access (centralized)
  schemas/                   Zod schemas for every data boundary
  shared/constants.ts        All tunable scoring weights and coefficients
  types/env.ts               Cloudflare binding types

ui/                          SvelteKit frontend (CSR-only, adapter-static)
  src/
    lib/
      api.ts                 Fetch helpers + response types
      stores/
        SearchStore.ts       Form state across navigation
    routes/
      +page.svelte           One-pager: hero, inline search, pipeline, live stats, MCP teaser
      search/+page.svelte    Search form (alias/fallback for /#find)
      matches/+page.svelte   Results grid with MatchCards
      developer/[u]/+page.svelte  Profile deep-dive
      mcp/+page.svelte       Redirects to /#mcp section

scripts/
  seed-index.sh              Bulk ingest: specific users + contributor discovery

migrations/                  Drizzle-generated D1 SQL migrations
```

---

## Testing

```bash
npm test          # run once
npm run test:watch  # watch mode
```

81 tests, ~130ms. Covers the pure-function scoring and analysis layer:

| File | Tests | What |
|---|---|---|
| `src/analysis/complexity.test.ts` | 17 | Shannon entropy, test correlation, complexity delta |
| `src/analysis/diff-parser.test.ts` | 10 | Patch parsing, decision point counting |
| `src/analysis/file-classifier.test.ts` | 28 | File category classification, priority ordering |
| `src/scoring/quality-score.test.ts` | 26 | SEU formula, centrality thresholds, QualityH bounds, recency decay |

The HTTP layer (Hono router, ingestion DO, MCP tools) is not covered by tests yet. That's the obvious gap.

---

## Data pipeline in detail

### 1. Ingestion

One `DeveloperIngestion` Durable Object instance per developer, sharded by username. Orchestrates the full pipeline via queue messages.

**Steps:**

1. **`ingest_developer`** — fetch GitHub user profile, upsert developer record, discover top 20 repos by last push date, queue `analyze_repo` for each.

2. **`analyze_repo`** — for each repo:
   - Fetch commits by developer (paginated, skips merges, skips commits >10k lines)
   - For each commit: fetch full diff, parse patches, compute inline metrics (churn, entropy, complexity delta, test ratio, file count)
   - Upsert into `contributions` table
   - Fetch PRs in the repo, queue `analyze_reviews`

3. **`analyze_reviews`** — extract review signals per PR (comment count, depth, code-line references, change requests), upsert into `reviews` table.

4. **Completion** — when all repos finish, DO queues `compute_scores` and `build_vectors`.

### 2. Classification

Runs after ingestion — triggered by the queue or the scheduled cron.

- **Contribution type** (`contribution-classifier.ts`): heuristic fast-path first (deps, tests, formatting, docs), then Workers AI `@cf/meta/llama-3.1-8b-instruct` with zero temperature. Result: one of `feature | bugfix | refactor | test | documentation | infrastructure | dependency | formatting | generated`.

- **Domain tagging** (`domain-tagger.ts`): uses GitHub repo topics first (fastest, most accurate). Falls back to Workers AI if topics are empty. Normalizes to lowercase-kebab-case, strips language names, deduplicates.

### 3. Scoring

#### Per-contribution

```
SEU      = ln(1 + churn) × (1 + FILE_COEFF × ln(1 + fileCount)) × (1 + ENTROPY_COEFF × entropy)
EffortH  = SEU × (1 + CC_COEFF × |complexityDelta|) × (1 + CENTRALITY_COEFF × centrality)
QualityH = clamp(BASE + MAINT_WEIGHT × maintShare + TEST_WEIGHT × testRatio, MIN, MAX)
ValueH   = EffortH × QualityH × typeWeight
score    = min(100, ln(1 + ValueH) / ln(1 + CODE_QUALITY_REF) × 100)
recency  = score × exp(-RECENCY_LAMBDA × months_ago)
```

`typeWeight` downgrades formatting (0.1), dependency bumps (0.2), and generated code (0.0). See `src/shared/constants.ts` for all coefficients.

#### Per-developer (6 dimensions)

| Dimension | Weight | Method |
|---|---|---|
| Code Quality | 35% | Log-scale sum of recency-weighted contribution scores |
| Review Quality | 25% | Aggregated review signals (depth, substantiveness, change requests) |
| Documentation Quality | 10% | Docs-only contribution scoring |
| Collaboration Breadth | 10% | Unique repos + orgs + collaborators |
| Consistency | 10% | Activity smoothness over time (entropy-based) |
| Recent Activity | 10% | Log-scale count of contributions in last 12 months |

`overallImpact` = weighted average of the 6.

Domain scores aggregate recency-weighted contribution values per-tag, log-scale normalized.

### 4. Vectorization

Profile text is built from a developer's top 5 domains (with scores) and primary languages, then embedded via `@cf/baai/bge-base-en-v1.5` (384-dim). Upserted to Cloudflare Vectorize with metadata (`topDomain`, `domainCount`, `languages`).

### 5. Search

1. Embed the query with the same model.
2. Vectorize cosine similarity → top-K candidates.
3. SQL filter: `ingestionStatus = 'complete'`, optional score floors, optional recency cutoff.
4. Return enriched results (scores, top domains, languages, match explanation).

---

## D1 schema

Five tables:

- **`developers`** — one row per indexed developer, holds all 6 dimension scores + `ingestionStatus` + `scoredAt`
- **`repos`** — metadata cache for each repo (stars, topics, contributor count, primary language)
- **`contributions`** — one row per commit SHA, inline metrics, per-contribution scores, classification results
- **`reviews`** — one row per review, signals for depth and substantiveness
- **`developer_domains`** — one row per (developer × domain), aggregated score + evidence repos

---

## API

### Public

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/search` | Search by description, stacks, role. Returns ranked `MatchResult[]`. |
| `GET` | `/api/developers/:username` | Full developer profile + domains. Triggers background ingestion if not indexed. |
| `GET` | `/api/domains` | All indexed domains sorted by developer count (used for UI chips). |
| `GET` | `/health` | `{ status: 'ok' }` |

### Admin

All admin endpoints are unauthenticated — intended for local use / curl.

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/ingest` | Queue ingestion for `{ username }`. |
| `GET` | `/admin/ingest/status/:username` | Ingestion status + current scores. |
| `GET` | `/admin/stats` | Aggregate counts: developers, contributions, classified, scored, reviews. |
| `GET` | `/admin/search` | Execute raw `SearchDevelopersInput` JSON (for testing). |

### MCP

```
/mcp   — MCP over HTTP (JSON-RPC), open — no auth required
/sse   — MCP over SSE
```

Three tools: `search_developers`, `get_developer_profile`, `compare_developers`.

---

## Ingestion: manual vs automatic

### Manual (always works)

```bash
# Ingest a single user
curl -X POST https://whodoesthe.work/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{"username":"torvalds"}'

# Check status
curl https://whodoesthe.work/admin/ingest/status/torvalds

# Watch aggregate stats
watch -n 30 'curl -s https://whodoesthe.work/admin/stats'
```

### Lazy (triggered by UI)

When the app visits `/api/developers/:username` for a user not yet in D1, the worker kicks off ingestion in the background (`c.executionCtx.waitUntil`). Returns `{ ingestionStatus: 'pending' }` until indexing completes.

### Bulk seeding

```bash
# Queue 9 specific users + discover contributors from popular repos
GITHUB_TOKEN=ghp_... ./scripts/seed-index.sh

# Or target a specific deployment
GITHUB_TOKEN=ghp_... API_URL=https://whodoesthe.work ./scripts/seed-index.sh
```

### Scheduled (cron — not yet configured)

Add a `[triggers]` cron to `wrangler.jsonc` to periodically re-classify and re-score already-ingested developers:

```jsonc
"triggers": {
  "crons": ["0 3 * * *"]   // 3am UTC daily
}
```

### Ingestion lifecycle

```
pending → in_progress → complete
                      ↘ error
```

- `pending`: queued but not started
- `in_progress`: actively fetching commits / PRs / running analysis
- `complete`: all repos analyzed, scores computed, vector indexed — shows up in search
- `error`: something failed (check Worker logs in Cloudflare dashboard)

---

## Local development

```bash
# 1. Install root dependencies
npm install

# 2. Install UI dependencies
cd ui && npm install && cd ..

# 3. Create local secrets file (gitignored)
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your GITHUB_TOKEN

# 4. Create D1 database (first time only)
npx wrangler d1 create wdtw-db
# paste the database_id into wrangler.jsonc

# 5. Run migrations
npm run db:migrate:local

# 6. Start the dev server
npm run dev
```

### Build and deploy

```bash
npm run deploy    # build UI + deploy worker
npm run build     # build UI only
npm run typecheck # TypeScript check
npm test          # run test suite
```

### Secrets

Only one secret needed:

```bash
npx wrangler secret put GITHUB_TOKEN
```

The `ENVIRONMENT` var is non-secret and lives in `wrangler.jsonc`. Never put secrets there.

---

## Tuning the scoring model

All coefficients are in `src/shared/constants.ts`. Change a value, redeploy, re-run `compute_scores`. Nothing else needs to change.

Key knobs:

- `RECENCY_LAMBDA` — how fast old contributions decay (higher = more recency bias)
- `SEU_ENTROPY_COEFF` — how much code spread (cross-file changes) boosts a score
- `EFFORH_CENTRALITY_COEFF` — how much contributing to popular/central repos is rewarded
- `CODE_QUALITY_REF` — the "reference" value for calibrating the 0–100 scale
- Dimension weights in `SCORE_WEIGHTS` — rebalance the 6-dimension overall score

---

## Observability

Worker logs are enabled (`observability.logs.enabled: true`, `invocation_logs: true`). View in the Cloudflare dashboard under **Workers → wdtw → Logs**.

Useful for watching ingestion progress, AI classification calls, and queue failures.

---

## MCP integration

Connect any MCP-compatible client:

```json
{
  "mcpServers": {
    "whodoesthework": {
      "url": "https://whodoesthe.work/mcp"
    }
  }
}
```

No auth required. Works with Claude Desktop, Cursor, or any MCP-compatible client.

Available tools:
- `search_developers` — semantic search with optional domain/score/recency filters
- `get_developer_profile` — full profile with evidence (commits, repos, domains)
- `compare_developers` — side-by-side score comparison for 2–5 developers
