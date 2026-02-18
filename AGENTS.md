# AGENTS.md — whodoesthe.work

Entry point for all AI agents working on this repo. Read this before touching any code.

---

## What this product is

**whodoesthe.work** is a Developer Intelligence Platform. It ingests a GitHub user's contribution history, computes multi-dimensional quality scores using a research-backed effort/quality model, indexes everything in a semantic vector database, and lets founders/recruiters find engineers who've _actually shipped_ the kind of work they need.

**The demo** is a web UI where you describe your project ("building a real-time payment settlement system in Rust"), pick your stack, and get ranked developer matches with AI-generated "why matched" explanations backed by real commit evidence.

**The eventual paid product** is the MCP server — a power-user API surface for AI agents and technical recruiting tools. The web UI is the public demo. Don't gold-plate the web UI; make it feel remarkable and do the demo perfectly.

---

## Architecture (30-second version)

```
GitHub API
    ↓ (Durable Objects + Queues)
spec-02: Ingestion Pipeline       — fetches commits, PRs, reviews
    ↓
spec-03: Analysis Functions       — complexity delta, entropy, test ratio (pure functions)
spec-04: AI Classification        — contribution type + domain tags (Workers AI)
    ↓
spec-05: Scoring Engine           — SEU → EffortH → QualityH → ValueH model
    ↓
D1 (SQLite)                       — scores, domains, contributions (via Drizzle)
Vectorize                         — developer domain embeddings (semantic search)
    ↓
spec-07: MCP Server               — power-user API (Agents SDK, Bearer token auth)
spec-09: REST API (Hono) + UI     — demo web product (SvelteKit + Cloudflare Pages)
```

Everything runs on Cloudflare. No external databases. No Node.js-only APIs.

---

## First-time setup (required before `wrangler dev`)

### 1. Install dependencies
```bash
npm install
```

### 2. Create local secrets file
```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with real values — this file is gitignored and never committed
```

### 3. Create D1 database
```bash
npx wrangler d1 create wdtw-db
# Paste the database_id output into wrangler.jsonc
```

### 4. Run migrations
```bash
npm run db:generate
npm run db:migrate:local
```

### 5. Start dev server
```bash
npm run dev
```

### For production deploy
```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put API_SECRET_KEY
npm run deploy
```

> **NEVER put secret values in `wrangler.jsonc`, committed files, or environment variables in CI.** Secrets live in `.dev.vars` locally (gitignored) and in Cloudflare's secret store remotely (set via `wrangler secret put`). The `wrangler.jsonc` `vars` section is for non-secret config only (e.g. `ENVIRONMENT`).

---

## Spec map

Read the full spec before implementing. These summaries are orientation, not substitutes.

| Spec | What it is | Key decisions |
| --- | --- | --- |
| **spec-00** | Zod schemas + TypeScript types + `constants.ts` + wrangler.jsonc | Zod-first: all types are `z.infer<>`, never hand-written interfaces. `wdtw-` prefix on all CF resources. |
| **spec-01** | Drizzle D1 schema + typed query layer | No raw SQL anywhere. `Queries` class wraps all DB access. 5 tables: developers, repos, contributions, reviews, developer_domains. No auth/shortlist tables — those are cut. |
| **spec-02** | GitHub ingestion via Durable Objects + Queues | Durable Objects serialize per-developer ingestion. Queue messages: `ingest_developer` → `analyze_repo` → `compute_scores` → `build_vectors`. Inline analysis (no R2). |
| **spec-03** | Analysis pure functions (complexity, entropy, test ratio) | `analyzeCommitDetail(detail)` returns flat `CommitAnalysisResult`. DECISION_POINTS_RE regex for cyclomatic complexity. Normalized Shannon entropy H ∈ [0,1]. `testRatio = testChurn / totalChurn`. |
| **spec-04** | Workers AI classification (contribution type + domain tags) | `DOMAIN_TAXONOMY` is a hint vocabulary, not a constraint. Repo `topics` (from GitHub) are used directly — highest confidence signal, skip AI. Free-form kebab-case domain tags stored as-is. |
| **spec-05** | Scoring engine (SEU/EffortH/QualityH model) | All coefficients in `constants.ts`. `computeSEU`, `computeEffortH`, `computeQualityH`, `computeCentralityProxy`, `computeContributionValue` are exported pure functions. Log-scale normalization throughout. |
| **spec-06** | Vectorize semantic search | Embeds developer domain profile text. `executeSearch(env, { query, limit })` is the public interface. Query expansion happens in spec-09 before calling this. |
| **spec-07** | MCP server (Agents SDK) | `authenticate()` checks Bearer token against `API_SECRET_KEY` env secret (constant-time). No D1 auth table. AI-generated `match_explanation` via Workers AI Promise.all(). |
| **spec-08** | End-to-end integration + deploy | Wires all specs together. Seed D1 with real ingested developers before demo. |
| **spec-09** | Demo web UI + Hono REST API | Public endpoints (no auth). No shortlist — removed from scope. Query expansion via Workers AI before Vectorize. `GET /api/domains` powers live domain chips. `GET /admin/stats` powers live index counts. |

Execution order: `spec-00 → spec-01 → [spec-02 + spec-03 + spec-04 in parallel] → spec-05 → spec-06 → spec-07 → spec-08 → spec-09`

See `MVP/EXECUTION-ORDER.md` for the full dependency graph and parallel build plan.

---

## Cloudflare stack rules — HARD CONSTRAINTS

These are non-negotiable. Every agent must follow them.

### 1. Cloudflare-native only

```
✅  D1 (SQLite via Drizzle)
✅  Vectorize (vector search)
✅  Workers AI (@cf/meta/llama-3.1-8b-instruct for text, @cf/baai/bge-base-en-v1.5 for embeddings)
✅  Durable Objects (per-developer serialized ingestion)
✅  Queues (async pipeline messages)
✅  Cloudflare Pages (SvelteKit UI, adapter-cloudflare)
✅  KV (feature flags only, not primary storage)

❌  No R2 — nothing is stored raw
❌  No external databases (Postgres, Redis, PlanetScale, etc.)
❌  No external LLM APIs (OpenAI, Anthropic, etc.) — use Workers AI
❌  No Node.js-only APIs (fs, path, crypto from 'node:crypto', etc.)
❌  No npm packages that ship Node.js internals without a CF-compatible build
```

### 2. One Worker

All server-side logic (`src/`) compiles to a single Cloudflare Worker exported from `src/worker.ts` (or `src/index.ts`). No separate Worker deployments.

### 3. Hono for all HTTP routing

```typescript
// ✅ Correct
import { Hono } from 'hono';
const app = new Hono<{ Bindings: Env }>();
app.post('/api/search', zValidator('json', SearchBodySchema), async (c) => { ... });

// ❌ Wrong
if (url.pathname === '/api/search' && request.method === 'POST') { ... }
```

Use `zValidator('json', schema)` from `@hono/zod-validator` for all request body validation. Use `c.req.param()` for path params, `c.req.query()` for query params.

### 4. Drizzle for all D1 access

```typescript
// ✅ Correct
const devs = await db.select().from(developers).where(eq(developers.username, username)).get();

// ❌ Wrong
const devs = await env.DB.prepare("SELECT * FROM developers WHERE username = ?").bind(username).first();
```

The only exception: raw SQL in `GET /api/domains` (a GROUP BY aggregation that Drizzle makes verbose). Annotate exceptions with `// raw SQL: Drizzle doesn't support GROUP BY aggregation cleanly here`.

### 5. SvelteKit + adapter-cloudflare for the UI

```javascript
// svelte.config.js
import adapter from "@sveltejs/adapter-cloudflare";
export default { kit: { adapter: adapter() } };
```

The UI (`ui/`) is a separate SvelteKit project deployed to Cloudflare Pages. It calls the Worker via `PUBLIC_API_URL` env var.

---

## Code organization rules

```
src/
├── analysis/        — pure functions, no I/O (spec-03)
├── classification/  — Workers AI calls, no D1 (spec-04)
├── scoring/         — pure functions + D1 writes (spec-05)
├── search/          — Vectorize reads/writes (spec-06)
├── ingestion/       — Durable Objects + GitHub API (spec-02)
├── mcp/             — MCP server + auth (spec-07)
│   └── tools/       — one file per MCP tool
├── api/             — Hono router (spec-09 Step 0)
│   └── router.ts
├── db/
│   ├── schema.ts    ← DRIZZLE SCHEMA IS SOURCE OF TRUTH — never hand-write SQL
│   ├── client.ts    ← createDB(d1: D1Database) factory
│   └── queries.ts   ← Queries class (all DB access lives here)
├── schemas/         ← ZOD SCHEMAS ARE SOURCE OF TRUTH — never hand-write interfaces
│   ├── developer.ts
│   ├── contribution.ts
│   ├── github.ts
│   ├── queue.ts
│   └── mcp.ts
├── shared/
│   └── constants.ts ← ALL TUNABLE VALUES LIVE HERE
└── types/
    └── env.ts       ← Cloudflare bindings only (not Zod — bindings can't be schemas)

ui/src/
├── routes/          — SvelteKit file-based routing
│   ├── +layout.svelte
│   ├── +page.svelte                      ← one-pager: hero + search form + pipeline + live index + MCP teaser
│   ├── search/+page.svelte               ← alias/fallback for /#find
│   ├── matches/+page.svelte              ← results grid
│   ├── developer/[username]/+page.svelte ← profile deep-dive
│   └── mcp/+page.svelte                 ← MCP server documentation
└── lib/
    ├── api.ts               ← ALL fetch helpers + TypeScript types for API responses
    ├── stores/
    │   └── SearchStore.ts   ← writable<SearchRequest | null>
    └── components/
        ├── Hero.svelte
        ├── ProjectForm.svelte
        ├── MatchCard.svelte
        └── ScoreBar.svelte
```

**One rule: follow the folder.** Analysis code doesn't talk to D1. Classification code doesn't score. The Queries class owns all DB access. If you're putting a DB call inside `src/analysis/`, you're in the wrong folder.

---

## Zod contract rules — CRITICAL

**Every data shape is a Zod schema. TypeScript types are inferred from it, never written by hand.**

```typescript
// ✅ Correct — in src/schemas/developer.ts
export const developerScoreSchema = z.object({
  overallImpact: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  // ...
});
export type DeveloperScore = z.infer<typeof developerScoreSchema>;

// ❌ Wrong — hand-written interface
interface DeveloperScore {
  overallImpact: number;
  codeQuality: number;
}
```

**Validate at all system boundaries:**

```typescript
// GitHub API responses
const detail = githubCommitDetailSchema.parse(rawResponse);

// Queue messages
const msg = queueMessageSchema.parse(batch.messages[0].body);

// MCP tool inputs (auto-handled by Zod in McpServer.tool())
// Hono request bodies (auto-handled by zValidator middleware)
```

**Never validate internal function calls** — trust TypeScript inside the system. Only validate at: (1) GitHub API responses, (2) queue message deserialization, (3) HTTP request bodies (via Hono middleware), (4) MCP tool inputs.

---

## Constants and tunable weights — spec-05 model

All scoring coefficients live in `src/shared/constants.ts`. **If you hardcode a number in a scoring function, you're doing it wrong.**

```typescript
// SEU = ln(1+churn) × (1 + SEU_FILE_COEFF × ln(1+F)) × (1 + SEU_ENTROPY_COEFF × H)
SEU_FILE_COEFF = 0.15; // file coordination overhead
SEU_ENTROPY_COEFF = 0.2; // spread bonus

// EffortH = SEU × (1 + EFFORH_CC_COEFF × |ΔCC|) × (1 + EFFORH_CENTRALITY_COEFF × centrality)
EFFORH_CC_COEFF = 0.03;
EFFORH_CENTRALITY_COEFF = 0.5;

// QualityH ∈ [0.40, 1.20] — multiplier on EffortH
QUALITY_BASE = 0.8;
QUALITY_MAINTAINABLE_WEIGHT = 0.2; // reward: no complexity increase
QUALITY_TEST_WEIGHT = 0.3; // reward: test churn alongside prod churn
QUALITY_REWORK_WEIGHT = 0.5; // penalty: rework rate (V1: always 0)
QUALITY_MIN = 0.4;
QUALITY_MAX = 1.2;

// Log-scale normalization references (calibration knobs)
CODE_QUALITY_REF = 15.0; // "strong" contribution → score ≈ 100
DOMAIN_SCORE_REF = 500; // ~20 good domain contributions → score ≈ 80
RECENT_ACTIVITY_REF = 20; // 20 contributions in 12mo → score = 100

RECENCY_LAMBDA = 0.05; // exp(-λ × months): 78% at 5mo, 55% at 12mo
```

When you're calibrating — change `constants.ts`, run the test suite, check that `computeContributionValue` produces expected ranges. Never embed calibration numbers inline.

---

## Domain tagging rules — spec-04

**`DOMAIN_TAXONOMY` in `domain-tagger.ts` is a vocabulary hint, not a constraint.**

- GitHub repo `topics` are the highest-confidence signal → use them directly, skip the AI call
- The AI CAN return tags not in the taxonomy (`zero-knowledge-proofs`, `raft-consensus`, `wasm-runtime`)
- All tags are normalized via `normalizeDomainTag()` → lowercase-kebab-case, max 60 chars
- Add good new tags to `DOMAIN_TAXONOMY` over time so future AI calls stay consistent
- Language names (rust, golang, python) are NOT domain tags — filter them via `TOPIC_ALIASES`

The domain vocabulary grows organically. After ingesting a batch of developers, run a query to find novel tags the AI produced, review them, and add good ones to the taxonomy list.

---

## Workers AI model selection

| Use case                           | Model                            | Config                              |
| ---------------------------------- | -------------------------------- | ----------------------------------- |
| Contribution type classification   | `@cf/meta/llama-3.1-8b-instruct` | `max_tokens: 20, temperature: 0`    |
| Domain tagging                     | `@cf/meta/llama-3.1-8b-instruct` | `max_tokens: 60, temperature: 0`    |
| Match explanation (why matched)    | `@cf/meta/llama-3.1-8b-instruct` | `max_tokens: 80, temperature: 0.4`  |
| Query expansion (before Vectorize) | `@cf/meta/llama-3.1-8b-instruct` | `max_tokens: 120, temperature: 0.2` |
| Text embeddings (Vectorize)        | `@cf/baai/bge-base-en-v1.5`      | 768 dimensions                      |

**Always use `Promise.all()` for parallel AI calls.** Never `await` in a loop.

```typescript
// ✅ Correct
const explanations = await Promise.all(developers.map((dev) => generateExplanation(ai, dev)));

// ❌ Wrong
for (const dev of developers) {
  dev.explanation = await generateExplanation(ai, dev); // serial = slow
}
```

---

## Svelte UI patterns

### State management

```typescript
// Cross-page state: Svelte writable stores (NOT URL params, NOT sessionStorage)
// SearchStore: carries form state from homepage search form → /matches

// ✅ Correct
import { pendingSearch } from "$lib/stores/SearchStore";
```

### Data loading

```typescript
// Load data in onMount, not in <script> top-level (would run on server in SSR)
onMount(async () => {
  results = await searchMatches($pendingSearch);
});

// Redirect guard — always check store before making API calls
onMount(() => {
  if (!$pendingSearch) {
    goto("/#find");
    return;
  }
  // ...
});
```

### Typing

```typescript
// Import types from $lib/api — not from src/ (the UI doesn't import server code)
import type { MatchResult, SearchRequest, DeveloperProfile } from "$lib/api";
```

### Environment variables

```
PUBLIC_API_URL   — base URL for the Worker API
                   Production: https://api.whodoesthe.work
                   Local dev:  http://localhost:8787
                   No trailing slash. Used in api.ts as `${PUBLIC_API_URL}/api/...`
```

No `PUBLIC_API_KEY` — all endpoints are public. No auth headers in the UI.

---

## UI philosophy — making the architecture visible

This is a demo for a technical audience. The UI must do two things simultaneously: **feel like a premium product** and **make the underlying architecture obvious** to anyone watching.

### The golden rule

> Every non-trivial operation should show what it's doing under the hood.

Not tooltips. Not docs. Inline, in context, as part of the experience.

### Specific patterns

**Query expansion** — when `/matches` loads, show a brief "Expanded your query to 23 technical terms" badge that fades after 2s. This reveals that Vectorize semantic search is running on an enriched embedding, not just the raw query.

**Match confidence** — always show two numbers: the overall match confidence % AND the raw `overallImpact` score. One says "how well do they match your query", the other says "how good are they in absolute terms". Both are meaningful; show both.

**Domain tags** — each domain tag on a MatchCard is clickable and shows evidence repos when expanded. This reveals that domains come from real commit analysis, not self-reported skills.

**"Why matched" block** — the left blue border treatment and "WHY MATCHED" micro-label distinguish AI-generated explanation from factual data. Viewers understand this is LLM output on top of real signals.

**Score bars** — every ScoreBar shows a label ("Code Quality"), a value (78.3), and on hover shows what it measures ("based on 340 scored commits across 12 repos"). This is the architecture demo.

**Ingestion status** — if a developer is still being ingested (`ingestionStatus: 'in_progress'`), show a live progress indicator that says "Analyzing GitHub contributions…" This shows the pipeline in motion.

### Visual design

The design direction is **Pixel Brutalism × Editorial Data**. Light background, massive grotesque display type, acid green accents, lavender categorization, and "selection handle" hover aesthetics (corner anchor dots, Figma-style). Computational tool with editorial confidence — not generic SaaS, not neon cyberpunk.

Full design tokens and component specs are in `MVP/spec-09-svelte-demo-ui.md`. Summary for all agents:

#### Color palette

| Token | Value | Use |
|---|---|---|
| Page bg | `#f5f2ed` | Warm off-white — body background |
| Surface | `#ffffff` | Cards — pop on warm bg |
| Surface alt | `#faf7f3` | Alternating rows |
| Default border | `#ddd8d0` | Warm gray |
| Hover border | `#b0a89e` | Darker warm gray |
| Focus ring | `#2563eb 2px offset 2px` | All interactive elements |
| Primary text | `#0a0907` | Near-black, warm |
| Secondary text | `#3d3830` | Dark warm gray |
| Muted text | `#8a8070` | Medium warm gray |
| Acid green fill | `#b8ff57` | Primary CTA bg, high-score badge bg |
| Acid green text | `#1a3300` | Text on acid green (WCAG AA) |
| Lavender fill | `#ede9fe` | Domain chip bg, selected step bg |
| Lavender text | `#5b21b6` | Domain chip text |
| Electric blue | `#2563eb` | Links, selection handles, active borders |
| Amber fill | `#fef3c7` | Mid-score badge bg |
| Amber text | `#92400e` | Text on amber |
| Red fill | `#fee2e2` | Low-score badge bg |
| Red text | `#991b1b` | Text on red |
| Pixel grid | `rgba(37, 99, 235, 0.07)` | Checkerboard texture (body + hero only) |
| Lavender blob | `radial-gradient(ellipse 700px 400px at 50% 0%, rgba(196,181,253,0.35) 0%, transparent 70%)` | Behind hero content |

#### Typography

- **Display** (hero): weight 900, `clamp(4rem, 9vw, 7rem)`, letter-spacing -0.03em, line-height 0.95. Font: "Plus Jakarta Sans" or "Space Grotesk"
- **Headline**: weight 800, `clamp(1.75rem, 3.5vw, 2.75rem)`, letter-spacing -0.02em
- **Body**: weight 400, 1rem, line-height 1.65, max-width 65ch
- **Meta**: weight 600, 0.75rem, letter-spacing 0.1em, UPPERCASE — for labels, column headers
- **Accent**: italic serif ("Playfair Display"), 1.1–1.4rem — taglines and pull quotes ONLY
- **Data numbers**: tabular-nums, weight 700, slightly larger than surrounding body

#### Key patterns

**Pixel checkerboard grid** — apply to `body` and hero sections; never inside cards:
```css
.pixel-grid {
  background-image:
    repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);
  background-size: 24px 24px;
  background-position: 0 0;
}
```

**Selection handles** — on hover, cards and the Hero eyebrow box grow four 8×8px corner anchor dots (`#2563eb`) like a Figma selection. Implement via Svelte `use:` action injecting four `<span>` elements. Use on: MatchCard hover, Hero eyebrow label, ProjectForm active role card.

**Acid green CTA** — `bg: #b8ff57`, `color: #1a3300`, weight 700. Hover: `transform: translateY(-1px)` + darken bg to `#a3f03d`. No glow — glow is a dark-mode pattern, not used here.

**Lavender domain chips** — `bg: #ede9fe`, `color: #5b21b6`. Always distinct from action/score colors.

**"Why matched" block** — `border-left: 3px solid #b8ff57` (acid green), `bg: #f9ffe8`. Label "WHY MATCHED" in acid green meta text.

**Nav** — `bg: rgba(245,242,237,0.88)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid #ddd8d0`. Logo near-black weight 800. Links secondary text, hover → near-black.

**Loading** — centered on light bg, spinner `#2563eb`. Evolving status text in italic serif: *"Expanding your query across 847 technical domains…"*

**Motion** — fade in 150–200ms, slide up 8–12px max. No bounce, no spring, no scale explosions. Agents are precise.

#### Design intent

This interface should feel like: a developer intelligence tool with editorial confidence. Airy warm whites, brutalist weight-900 display typography, precision interaction (selection handles). Acid green = energy and action. Lavender = categorization and calm. Blue = system state and links. The pixel grid says "this is computational" without screaming it.

---

## What the demo must prove

When the 5-minute demo ends, the viewer should walk away believing:

1. **The scoring is real** — not a random number. The score bars show actual GitHub commit analysis. The domain tags came from real code, not keywords.

2. **The search understands intent** — typing "cryptography expert for TLS work" finds the right people even if their GitHub bios don't say "cryptography". The query expansion step should be briefly mentioned.

3. **The AI explanations are grounded** — "Why matched" sentences reference actual domains and languages, not generic praise. They're generated by Workers AI but constrained to facts from the scoring data.

4. **It's production-quality infrastructure** — Edge-deployed, <3s median search, SQLite + vector search + AI all on Cloudflare. The architecture is the pitch.

5. **The MCP server is the real product** — the web UI is the pretty front door, but mentioning "this same data is available as an MCP tool for AI agents" is the closer.

---

## Things you must not do

- **Do not add auth to the web UI.** No login, no sessions, no API keys for the demo. The web endpoints are public.
- **Do not re-add a shortlist feature.** Shortlist was intentionally removed to keep the demo tight. `ShortlistStore.ts` and `/shortlist` route are deleted — do not recreate them.
- **Do not use external LLMs or databases.** Workers AI and D1 only.
- **Do not write TypeScript interfaces by hand.** Use `z.infer<typeof schema>`.
- **Do not write raw SQL.** Use Drizzle (exception: complex aggregations with a comment).
- **Do not add unnecessary loading states.** Spinners are for network calls only.
- **Do not add comments to obvious code.** Only comment non-obvious decisions, calibration choices, and anything that differs from what a reader would expect.
- **Do not add features not in the specs.** The demo is scoped. Every extra feature is a demo risk.
- **Do not pattern-match to other frameworks.** This is not Next.js. Not Express. Cloudflare Workers and SvelteKit have their own patterns — follow the specs.

---

## Quick references

| What you need                      | Where to look                              |
| ---------------------------------- | ------------------------------------------ |
| All Zod schemas                    | `src/schemas/*.ts`                         |
| D1 table definitions               | `src/db/schema.ts`                         |
| All tunable scoring values         | `src/shared/constants.ts`                  |
| Scoring model formulas             | `MVP/spec-05-scoring-engine.md` Step 1     |
| Analysis function contracts        | `MVP/spec-03-analysis-workers.md` Step 6   |
| Domain taxonomy + normalization    | `MVP/spec-04-ai-classification.md` Step 2  |
| Hono router + REST endpoints       | `MVP/spec-09-svelte-demo-ui.md` Step 0     |
| UI component specs                 | `MVP/spec-09-svelte-demo-ui.md` Steps 4–10 |
| SvelteKit store patterns           | `MVP/spec-09-svelte-demo-ui.md` Step 3     |
| MCP tool definitions               | `MVP/spec-07-mcp-server.md` Steps 2–4      |
| Dependency graph + build order     | `MVP/EXECUTION-ORDER.md`                   |
| Research backing the scoring model | `RESEARCH.md`                              |
