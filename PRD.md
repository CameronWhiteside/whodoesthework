# whodoesthe.work — Product Requirements Document

**Version:** 0.1.0-mvp
**Status:** Draft
**Date:** 2026-02-17
**Author:** Engineering & Product

---

## Table of Contents

1. [Problem Definition](#1-problem-definition)
2. [Product Thesis](#2-product-thesis)
3. [Competitive Landscape](#3-competitive-landscape)
4. [Differentiation](#4-differentiation)
5. [MVP Scope](#5-mvp-scope)
6. [System Architecture](#6-system-architecture)
7. [Data Ingestion Pipeline](#7-data-ingestion-pipeline)
8. [Contribution Attribution Model](#8-contribution-attribution-model)
9. [Code Quality Metrics Model](#9-code-quality-metrics-model)
10. [Developer Scoring Algorithm](#10-developer-scoring-algorithm)
11. [MCP Server Interface](#11-mcp-server-interface)
12. [Agent Tool Design](#12-agent-tool-design)
13. [Privacy & Ethical Considerations](#13-privacy--ethical-considerations)
14. [Anti-Gaming Mechanisms](#14-anti-gaming-mechanisms)
15. [Demo Scenario](#15-demo-scenario)
16. [Success Criteria](#16-success-criteria)

---

## 1. Problem Definition

### The Broken Signal

Engineering hiring is dominated by proxy signals that correlate poorly with actual technical ability:

- **Resumes** are self-reported, unverifiable, and increasingly AI-generated. A 2025 survey by Resume Genius found 45% of job seekers used AI to write or enhance resumes. The signal-to-noise ratio has collapsed.
- **LinkedIn profiles** reward personal branding and posting cadence, not engineering depth. A developer who ships a high-quality distributed consensus library is invisible next to one who posts "10 things I learned about microservices" threads.
- **Interview loops** are expensive ($15k-30k fully-loaded per pipeline), high-variance, and biased toward rehearsed performance on narrow problem types. They measure interview skill, not engineering skill.
- **GitHub star counts and follower metrics** are popularity contests. Stars correlate with marketing effort and README quality, not code quality.

### The Consequence

- **Recruiters** waste 80%+ of sourcing time on candidates who look good on paper but can't ship production code.
- **Hiring managers** lack objective data to compare candidates on actual technical contribution quality.
- **Strong engineers** with deep technical contributions but no social media presence are systematically overlooked.
- **Companies** make $100k+ hiring mistakes because the available signals are decorrelated from engineering output.

### The Opportunity

Public GitHub activity is the largest corpus of verifiable, attributable engineering work product in existence. It contains:

- Every line of code authored, with full commit history
- Every code review given and received
- Every architectural decision captured in PRs and issues
- Every documentation contribution
- The full dependency graph of who works on what, with whom, and how

This data exists. It is public. It is attributable. **Nobody is computing the right function over it.**

---

## 2. Product Thesis

> Engineering talent should be ranked based on measurable technical contribution quality across public repositories and documentation — not social media visibility or AI-generated resumes.

**whodoesthe.work** computes a multi-dimensional engineering impact score from public GitHub data and surfaces it through a web product built for founders and recruiters. Describe your project, pick your stack, and get a ranked list of developers with AI-generated match explanations — then shortlist the ones you want to talk to.

*"I'm building a distributed payments system in Rust. Show me engineers who've shipped production code in this space, write good tests, and review others' work."*

The primary surface is a **web UI** designed for founders and technical recruiters who don't want to learn an API. The MCP server is a power-user API surface for technical recruiting tools and AI agents that want to integrate developer intelligence programmatically.

The scoring model beneath both surfaces is identical: a multi-dimensional engineering impact score derived entirely from public GitHub data — contribution quality, review depth, domain expertise, documentation habits — not social signals or self-reported credentials.

---

## 3. Competitive Landscape

| Product | What It Does | Why It Falls Short |
|---|---|---|
| **LinkedIn Recruiter** | Keyword search over self-reported profiles | No verification. Profiles are marketing copy. Boolean search over lies returns lies. |
| **BlueOptima** | Measures "developer productivity" via code volume metrics | Optimizes for lines-of-code throughput. Treats a 500-line copy-paste the same as a 50-line algorithm. Requires enterprise integration — no public data. |
| **GitHub Insights / DORA** | Org-level delivery metrics (deploy frequency, lead time, MTTR) | Team-level, not developer-level. Measures pipeline velocity, not individual contribution quality. |
| **Sourcer.io / Turing** | AI matching from resume + profile data | Still built on self-reported data. The AI is sophisticated; the input is still garbage. |
| **git-fame / git-quick-stats** | CLI tools for commit-level attribution | Raw commit counts. No quality weighting. No cross-repo aggregation. No API. |
| **DevStats (CNCF)** | Contribution dashboards for CNCF projects | Project-scoped, not developer-scoped. No quality scoring. Read-only dashboards. |
| **Stack Overflow Developer Stories** (discontinued) | Reputation from Q&A activity | Measured ability to answer questions, not ability to ship code. Discontinued in 2022. |

### White Space

No existing product:

1. Computes a **quality-weighted, multi-dimensional** engineering score from public Git data
2. Operates at the **individual developer** level across repositories
3. Exposes results via a **programmatic interface** designed for AI agent consumption
4. Runs without requiring the target developer or their organization to opt in or install anything

---

## 4. Differentiation

### Why This Is Not "GitHub Stats 2.0"

| Dimension | Typical Approach | whodoesthe.work |
|---|---|---|
| **Unit of measurement** | Commits, LOC, PRs | Weighted contribution units that account for complexity, impact zone, and review quality |
| **Quality signal** | None, or binary (merged/not) | Cyclomatic complexity delta, dependency fan-out, test coverage correlation, review thoroughness |
| **Scope** | Single repo | Cross-repo developer profile with domain clustering |
| **Interface** | Dashboard / CSV | MCP server consumed by AI agents — the recruiter never sees a dashboard |
| **Attribution** | `git blame` (last touch) | Multi-author attribution via commit graph analysis, co-authorship, and review weighting |
| **Intelligence** | Static metrics | Workers AI-powered classification of contribution type, domain tagging, and natural language skill extraction |

### Moat

1. **Data pipeline at the edge.** Running on Cloudflare Workers means we ingest and process at 300+ PoPs globally. The ingestion pipeline is the product — not the UI.
2. **Scoring model compounding.** Every developer we score improves our understanding of what "quality" looks like in a given domain. The model improves with coverage.
3. **MCP-native distribution.** We don't need users to visit a website. We need AI agents to call our tools. The MCP protocol is our distribution channel — every Claude, GPT, or custom agent that discovers us becomes a user.
4. **Network of contributions.** Developer scores are not independent. Reviewing high-quality code from strong engineers, or having your code reviewed by them, is itself a quality signal. This graph gets more valuable with scale.

---

## 5. MVP Scope

### In Scope (V0)

| Feature | Description | Why MVP |
|---|---|---|
| **GitHub ingestion for specified developers** | Given a GitHub username, ingest their public repos, commits, PRs, and reviews | Core data pipeline. Without this, nothing works. |
| **Commit-level attribution** | Parse commits, diffs, and blame to attribute code to authors, handling co-authorship and squash merges | Without correct attribution, scores are wrong. |
| **Code quality scoring** | Compute per-commit quality metrics: cyclomatic complexity delta, file churn, test-file correlation | The core value proposition. |
| **Review activity scoring** | Score code review contributions: review count, review depth (comments, suggestions, approvals vs. rubber-stamps) | Reviews are a major signal of senior engineering skill. |
| **Documentation scoring** | Detect and score contributions to docs, READMEs, ADRs, and inline documentation | Differentiates complete engineers from code-only contributors. |
| **Domain classification** | Use Workers AI to classify contributions by technical domain (e.g., "distributed systems", "frontend/React", "ML/data pipelines") | Enables the core query: "find me someone who does X." |
| **Composite developer score** | Aggregate per-contribution scores into a developer-level profile with domain-specific breakdowns | The queryable asset. |
| **Founder/recruiter web UI** | SvelteKit app: 3-step onboarding form → ranked match cards with AI explanations → shortlist management | The primary product surface. What converts interest into usage. |
| **`POST /api/search` with AI explanations** | REST endpoint combining vector search + Workers AI per-developer "why matched" explanations, <3s response | Powers the web UI results page; also usable by API consumers directly. |
| **D1-backed shortlist** | Save/remove developers to a named shortlist keyed by API key; persisted in D1, not localStorage | Enables the recruiter workflow: search → evaluate → shortlist → act. |
| **MCP server (power-user API access)** | Expose `search_developers`, `get_developer_profile`, `compare_developers` tools via MCP on Cloudflare Workers | Secondary surface for technical recruiting tools and AI agents. |
| **API key auth + usage metering** | Paid access via API key, metered per query | Revenue from day one. |

### Out of Scope (V0)

| Feature | Why Deferred |
|---|---|
| Automatic discovery / crawling all of GitHub | MVP is on-demand: you ask about a developer, we ingest and score them. Crawling is a V1 scale problem. |
| Private repo analysis | Requires OAuth grants. Massively increases trust and security surface. V1+. |
| Organization-level analytics | Different buyer, different product. Stay focused on individual developer scoring. |
| Real-time webhook-driven updates | Polling/on-demand refresh is sufficient for MVP. |
| Issue/discussion analysis | Lower signal density than commits and reviews. Defer. |
| Non-GitHub sources (GitLab, Bitbucket) | GitHub is >90% of public OSS. Expand later. |

### MVP Success = Two Demos

**Demo 1 — Web product (primary):**

A founder building a distributed payments platform visits whodoesthe.work, describes their project in plain English, selects Rust + Go from the stack chips, picks "Backend engineer" from the role grid, and clicks "Find matches." In under 3 seconds they see ranked developer cards with AI-generated explanations — "They've shipped a 2PC implementation in a 2k-star Go repo and review code at the 84th percentile." They shortlist 3 candidates.

**Demo 2 — MCP (power-user):**

A recruiter using an AI agent says: *"Find me a developer who has significant Rust experience in networking or distributed systems, has contributed to projects with 100+ stars, reviews code regularly, and writes documentation."* The agent calls our MCP server. It returns a ranked list of developers with scores, evidence links, and domain breakdowns. The results are obviously better than a LinkedIn search.

---

## 6. System Architecture

### Infrastructure Map (Cloudflare-Native)

```
                                    Client (AI Agent via MCP)
                                              |
                                              v
                                  +-----------------------+
                                  |   MCP Worker (Edge)   |
                                  |   - Auth / Rate Limit |
                                  |   - Request Routing   |
                                  |   - Response Assembly |
                                  +-----------------------+
                                        |           |
                          +-------------+           +-------------+
                          v                                       v
                 +------------------+                   +------------------+
                 |   Query Worker   |                   | Ingestion Worker |
                 |   - D1 reads     |                   | - GitHub API     |
                 |   - Vector search|                   | - Queue dispatch |
                 |   - Score compute|                   +------------------+
                 +------------------+                           |
                          |                                     v
                          v                           +------------------+
                 +------------------+                  |  Cloudflare Queue |
                 |       D1         |                  | (ingestion tasks) |
                 | - Developer      |                  +------------------+
                 |   profiles       |                           |
                 | - Contributions  |              +-----------+-----------+
                 | - Scores         |              v           v           v
                 | - Metadata       |      +----------+ +----------+ +----------+
                 +------------------+      | Analysis | | Analysis | | Analysis |
                          |                | Worker 1 | | Worker 2 | | Worker N |
                          v                +----------+ +----------+ +----------+
                 +------------------+              |           |           |
                 |   Vectorize      |              v           v           v
                 |   (skill embeddings,    +------------------+   +-------------+
                 |    domain search)  |    |   Workers AI     |   |     R2      |
                 +------------------+      | - Classification |   | - Raw diffs |
                                           | - Domain tagging |   | - Snapshots |
                                           | - Summarization  |   +-------------+
                                           +------------------+
```

### Component Responsibilities

| Component | Cloudflare Service | Role |
|---|---|---|
| **MCP Gateway** | Worker + Agents SDK | Handles MCP protocol, authentication, rate limiting, request routing |
| **Ingestion Coordinator** | Durable Object | Per-developer stateful ingestion manager. Tracks pagination cursors, deduplicates, manages rate limits against GitHub API. One DO instance per developer being ingested. |
| **Ingestion Queue** | Queues | Decouples ingestion requests from processing. Handles backpressure. Batch size: 100 messages. |
| **Analysis Workers** | Workers | Stateless compute: parse diffs, compute complexity metrics, extract metadata. Fan-out from queue. |
| **AI Classification** | Workers AI | Domain classification, contribution type tagging, skill extraction from code context. Model: `@cf/meta/llama-3.1-8b-instruct` or equivalent. |
| **Primary Datastore** | D1 | Relational store for developer profiles, contribution records, scores, and query indexes. |
| **Vector Store** | Vectorize | Skill and domain embeddings for semantic search ("find someone who does distributed consensus" should match contributions to Raft implementations). |
| ~~Object Store~~ | ~~R2~~ | **Removed for MVP.** Raw diffs are immutable at a commit SHA — re-fetched from GitHub on demand during analysis. No intermediate storage needed. |

### Why Durable Objects for Ingestion

Ingesting a developer's full GitHub history is a multi-step, stateful process:

1. Paginate through repos (GitHub API returns 100 per page)
2. For each repo, paginate through commits
3. For each commit, fetch the diff
4. Track rate limits (5,000 requests/hour authenticated)
5. Handle partial failures and resume

This is a textbook Durable Object use case: long-lived, stateful, single-writer, per-entity coordination. The DO persists its cursor state in transactional storage. If a Worker crashes mid-ingestion, the DO resumes from the last checkpoint.

```typescript
// Simplified Durable Object structure
export class DeveloperIngestion extends DurableObject {
  state: DurableObjectState;

  async ingest(username: string): Promise<IngestionStatus> {
    const cursor = await this.state.storage.get<IngestionCursor>('cursor');
    // Resume from last checkpoint or start fresh
    const repos = await this.fetchRepos(username, cursor?.repoPage ?? 1);

    for (const repo of repos) {
      await this.env.INGESTION_QUEUE.send({
        type: 'analyze_repo',
        username,
        repo: repo.full_name,
        cursor: cursor?.commitCursors?.[repo.full_name],
      });
    }

    await this.state.storage.put('cursor', updatedCursor);
    return { status: 'in_progress', repos_queued: repos.length };
  }
}
```

---

## 7. Data Ingestion Pipeline

### Pipeline Stages

```
Request        Repo         Commit        Diff         Analysis     Score
Intake    -->  Discovery -> Enumeration -> Fetching --> Processing -> Aggregation
(MCP/API)      (per user)   (per repo)    (per commit)  (per diff)   (per developer)
```

### Stage 1: Request Intake

**Trigger:** MCP query for an unknown developer, or explicit ingestion request.

When a query references a developer not in D1 (or with stale data), the MCP Worker dispatches an ingestion request to the Durable Object for that developer.

**Staleness policy (MVP):** Data older than 7 days triggers a background re-ingestion. Queries are served from stale data immediately while refresh runs.

### Stage 2: Repo Discovery

The Durable Object calls the GitHub REST API:

```
GET /users/{username}/repos?type=all&sort=pushed&per_page=100
```

**MVP filter criteria:**

- Skip forks unless the developer has commits on the fork (indicates active contribution to upstream)
- Skip repos with 0 commits from the target developer
- Skip repos not updated in the last 3 years (configurable)
- Include repos where the developer is a contributor but not owner (via `/users/{username}/events` cross-reference)

**Rate limit management:** The Durable Object maintains a token bucket synchronized with GitHub's `X-RateLimit-Remaining` header. When below 500 remaining requests, it switches to a backoff schedule. Ingestion is designed to be interruptible and resumable.

### Stage 3: Commit Enumeration

For each qualifying repo:

```
GET /repos/{owner}/{repo}/commits?author={username}&per_page=100
```

Store commit metadata in D1:

```sql
CREATE TABLE commits (
  id TEXT PRIMARY KEY,           -- commit SHA
  developer_id TEXT NOT NULL,    -- GitHub user ID (stable, unlike username)
  repo_full_name TEXT NOT NULL,
  authored_at TEXT NOT NULL,
  message TEXT,
  additions INTEGER,
  deletions INTEGER,
  files_changed INTEGER,
  is_merge BOOLEAN DEFAULT FALSE,
  co_authors TEXT,               -- JSON array of co-author GitHub IDs
  ingested_at TEXT NOT NULL,
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);
```

### Stage 4: Diff Fetching

For each commit, fetch the full diff:

```
GET /repos/{owner}/{repo}/commits/{sha}
Accept: application/vnd.github.v3.diff
```

Diffs are fetched from GitHub inline during analysis and discarded after metrics are computed. Commit SHAs are immutable — the diff can always be re-fetched if needed. No intermediate storage.

**Size guard:** Skip commits with total changes larger than 10,000 lines (likely generated code, vendored dependencies, or data files). Log skipped commits for transparency.

### Stage 5: Analysis Processing

Each diff is sent to an Analysis Worker via Queue. The worker:

1. **Parses the diff** into per-file hunks
2. **Classifies file types** (source, test, docs, config, generated)
3. **Computes metrics** (see Section 9)
4. **Sends to Workers AI** for domain classification (see Section 8)
5. **Writes results** to D1

### Stage 6: PR & Review Ingestion

Parallel to commit ingestion:

```
GET /repos/{owner}/{repo}/pulls?state=all&per_page=100
GET /repos/{owner}/{repo}/pulls/{number}/reviews
GET /repos/{owner}/{repo}/pulls/{number}/comments
```

Captures:

- PRs authored by the developer (authorship signal)
- Reviews given by the developer on others' PRs (review quality signal)
- Review comments: count, length, whether they reference specific code lines
- Review verdicts: `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`

```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_author_id TEXT,
  review_state TEXT,             -- APPROVED, CHANGES_REQUESTED, COMMENTED
  comment_count INTEGER,
  total_comment_length INTEGER,
  references_code_lines BOOLEAN,
  submitted_at TEXT NOT NULL,
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);
```

### GitHub API Budget (MVP)

For a developer with 50 repos, ~2,000 commits, and ~500 PRs:

| Endpoint | Calls | Notes |
|---|---|---|
| List repos | ~1 | Paginated |
| List commits (per repo) | ~50 | 20 commits avg per active repo |
| Get commit diff | ~2,000 | One per commit |
| List PRs | ~50 | Per repo |
| List reviews | ~500 | Per PR |
| **Total** | **~2,600** | Fits within 5,000/hr authenticated limit |

A single developer can be fully ingested in under 30 minutes at full rate, or ~1 hour with conservative rate limiting. This is acceptable for MVP — the developer is scored lazily on first query.

---

## 8. Contribution Attribution Model

### The Attribution Problem

`git blame` is wrong. It attributes code to the last person who touched a line, not the person who wrote the logic. A developer who reformats a file gets blame for every line. A developer who writes a critical algorithm and then a colleague fixes a typo in it loses attribution.

### Attribution Strategy (MVP)

#### 8.1 Commit-Level Attribution

Every commit is attributed to its author (from `git log --format='%aE'`). This is the baseline.

**Co-authorship handling:**

- Parse `Co-authored-by:` trailers in commit messages
- For co-authored commits, split contribution credit equally among co-authors (MVP simplification — weighted splitting is V1)
- For squash-merged PRs, attribute to the PR author (identified via PR metadata from GitHub API)

#### 8.2 Contribution Type Classification (Workers AI)

Each commit's diff is classified by an LLM into contribution types:

```typescript
type ContributionType =
  | 'feature'           // New functionality
  | 'bugfix'            // Defect correction
  | 'refactor'          // Structural improvement without behavior change
  | 'test'              // Test code
  | 'documentation'     // Docs, comments, READMEs, ADRs
  | 'infrastructure'    // CI/CD, build config, deployment
  | 'dependency'        // Dependency updates
  | 'formatting'        // Style-only changes (low signal)
  | 'generated'         // Auto-generated code (near-zero signal)
```

**Prompt design for Workers AI:**

```
Given the following git diff, classify the primary contribution type.
Consider the file paths, the nature of changes, and the commit message.

Commit message: {message}
Files changed: {file_list}
Diff summary: {truncated_diff_first_2000_chars}

Respond with exactly one of: feature, bugfix, refactor, test,
documentation, infrastructure, dependency, formatting, generated

Classification:
```

**Why LLM classification instead of heuristics:** Heuristics break on real-world code. A file named `utils.ts` could be feature code or test utilities. A change to `Dockerfile` could be infrastructure or a critical production fix. The LLM handles edge cases that rule-based systems miss. Workers AI runs at the edge with ~50ms latency — acceptable in a batch pipeline.

#### 8.3 Domain Tagging

A second Workers AI pass tags each contribution with technical domains:

```typescript
type TechnicalDomain = {
  primary: string;    // e.g., "distributed-systems"
  secondary: string[]; // e.g., ["networking", "consensus"]
  languages: string[];
  frameworks: string[];
};
```

The domain taxonomy is seeded with a controlled vocabulary (~200 terms across systems, frontend, backend, ML, data, mobile, DevOps, security, etc.) but the LLM can propose new terms that are reviewed and added.

Domain tags are embedded via Workers AI embedding model and stored in Vectorize for semantic search.

#### 8.4 Contribution Weighting

Not all contributions carry equal signal:

| Factor | Weight Multiplier | Rationale |
|---|---|---|
| Contribution to high-star repo (>1000 stars) | 1.5x | Higher scrutiny = higher signal that merged code is quality |
| Contribution to repo with many contributors (>20) | 1.3x | Collaboration in large projects is a different (harder) skill |
| Contribution type: `feature` or `bugfix` | 1.0x (baseline) | Core engineering work |
| Contribution type: `refactor` | 0.9x | Valuable but lower risk than new functionality |
| Contribution type: `test` | 0.8x | Important signal but lower complexity ceiling |
| Contribution type: `documentation` | 0.7x (but scored separately) | Valuable; scored in its own dimension |
| Contribution type: `formatting` | 0.1x | Near-zero signal |
| Contribution type: `generated` | 0.0x | Excluded entirely |
| Contribution type: `dependency` | 0.2x | Usually mechanical |

---

## 9. Code Quality Metrics Model

### Philosophy

We measure **quality of the change**, not quality of the codebase. A developer who fixes a complex bug in a messy codebase is doing harder, more valuable work than someone adding a simple endpoint to a clean one.

### 9.1 Cyclomatic Complexity Delta

**Definition:** The change in cyclomatic complexity introduced by a commit, measured per-function.

**Computation:**

For supported languages (JavaScript/TypeScript, Python, Go, Rust, Java — covering ~85% of GitHub), we parse the before/after state of modified functions and compute:

```
complexity_delta = complexity(function_after) - complexity(function_before)
```

For new functions: `complexity_delta = complexity(function)`.

**Scoring logic:**

- Negative delta (reducing complexity) with maintained functionality → high quality signal
- Moderate positive delta (adding necessary complexity for new features) → neutral
- High positive delta (>15 per function) → flag for review, potential quality concern
- Changes that add complexity without corresponding test changes → quality penalty

**Implementation:** We use a lightweight AST parser compiled to WASM, running in Workers. For MVP, we support:

- **TypeScript/JavaScript:** `@babel/parser` compiled to WASM (or tree-sitter WASM)
- **Python:** tree-sitter-python WASM
- **Go, Rust, Java:** tree-sitter WASM grammars

Complexity is computed by counting decision points: `if`, `else if`, `for`, `while`, `case`, `catch`, `&&`, `||`, `?:`.

```typescript
interface ComplexityResult {
  functions_modified: number;
  avg_complexity_delta: number;
  max_complexity_delta: number;
  complexity_reduced: boolean;    // net negative delta
  high_complexity_additions: number; // functions with delta > 15
}
```

### 9.2 Change Entropy

**Definition:** How spread out a change is across the codebase.

```
entropy = -sum(p_i * log2(p_i))
```

where `p_i` is the proportion of the diff in file `i`.

**Signal:**

- Low entropy (change concentrated in 1-2 files) → likely a focused, well-scoped change
- Moderate entropy (3-10 files) → typical feature work
- High entropy (20+ files) → either a large feature, a refactor, or a poorly-scoped change

Entropy alone is not quality — it's a modifier. High entropy + `refactor` classification = likely good. High entropy + `bugfix` classification = possibly a scattered fix indicating deeper design issues.

### 9.3 Test Correlation

**Definition:** Whether code changes are accompanied by corresponding test changes.

```
test_correlation = has_test_file_changes AND test_files_relate_to_changed_source_files
```

We match test files via naming conventions (`foo.test.ts`, `test_foo.py`, `foo_test.go`) and directory structure (`__tests__/`, `tests/`).

**Scoring:**

- Feature/bugfix commit with correlated test changes → +0.2 quality bonus
- Feature/bugfix commit with no test changes, in a repo that has tests → -0.1 quality penalty
- Feature/bugfix commit with no test changes, in a repo with no test infrastructure → neutral (no penalty for repo-level norms)

### 9.4 Churn Risk

**Definition:** How often the same code is modified shortly after being written.

If a developer's code is modified by another developer within 30 days, that's a churn signal. It suggests the original code may have been incomplete, unclear, or buggy.

```
churn_score = count(commits_by_others_modifying_same_lines within 30 days) / total_commits
```

Lower is better. This is computed during ingestion by cross-referencing the developer's commits against subsequent commits touching the same files/functions.

### 9.5 Composite Quality Score (Per-Contribution)

```
contribution_quality =
    base_type_weight
  * (1 + complexity_score)     // normalized [-1, 1], negative = reduced complexity
  * (1 + test_correlation)     // [0.9, 1.2]
  * (1 - churn_penalty)        // [0, 0.3]
  * repo_weight                // [1.0, 1.5]
  * entropy_modifier           // [0.8, 1.2]
```

Normalized to [0, 100] for human readability. Stored per-contribution in D1.

---

## 10. Developer Scoring Algorithm

### Score Dimensions

A developer's profile is not a single number. It is a vector:

```typescript
interface DeveloperScore {
  // Identity
  github_username: string;
  github_id: string;
  profile_url: string;

  // Aggregate Scores (0-100 scale)
  overall_impact: number;
  code_quality: number;
  review_quality: number;
  documentation_quality: number;
  collaboration_breadth: number;

  // Domain Breakdown
  domains: DomainScore[];

  // Activity
  active_repos: number;
  total_contributions: number;
  contribution_span_months: number;
  recent_activity_score: number;     // weighted toward last 12 months

  // Evidence
  top_contributions: ContributionSummary[];  // top 10 by quality score
  review_stats: ReviewStats;
  languages: LanguageBreakdown[];
}

interface DomainScore {
  domain: string;                    // e.g., "distributed-systems"
  score: number;                     // 0-100
  contribution_count: number;
  evidence_repos: string[];          // top repos in this domain
  languages: string[];
}

interface ReviewStats {
  reviews_given: number;
  avg_review_depth: number;          // based on comment count and length
  substantive_review_ratio: number;  // reviews with code-referencing comments / total
  change_request_ratio: number;      // CHANGES_REQUESTED / total reviews
}
```

### Scoring Formulas

#### Overall Impact

```
overall_impact = weighted_mean([
  (code_quality,           0.35),
  (review_quality,         0.25),
  (documentation_quality,  0.10),
  (collaboration_breadth,  0.10),
  (consistency_score,      0.10),
  (recent_activity_score,  0.10),
])
```

#### Code Quality (Aggregate)

```
code_quality = percentile_rank(
  mean(contribution_quality for all non-trivial contributions)
)
```

Percentile rank is computed against all developers in the system. This means scores are relative — a developer's code quality score represents how they compare to the population we've analyzed.

**Cold start:** Until we have 100+ developers, we use absolute thresholds derived from manual calibration against known-quality open source maintainers.

#### Review Quality

```
review_quality = weighted_mean([
  (substantive_review_ratio,  0.4),  // % of reviews with code-line comments
  (review_depth_score,        0.3),  // normalized avg comment count per review
  (review_consistency,        0.2),  // reviews/month consistency over time
  (cross_repo_reviewing,      0.1),  // reviewing code in repos they don't own
])
```

**Rubber-stamp detection:** Reviews that are `APPROVED` with 0 comments within 5 minutes of PR creation score 0. This is a strong anti-gaming signal.

#### Documentation Quality

```
documentation_quality = weighted_mean([
  (doc_contribution_count,    0.3),
  (doc_quality_score,         0.4),  // LLM-assessed clarity and completeness
  (readme_contributions,      0.15),
  (adr_contributions,         0.15), // Architecture Decision Records
])
```

#### Collaboration Breadth

```
collaboration_breadth = log_normalized(
  unique_repos_contributed_to
  * unique_collaborators_interacted_with
  * unique_orgs_contributed_to
)
```

#### Consistency Score

```
consistency = 1 - coefficient_of_variation(monthly_contribution_counts over last 24 months)
```

Rewards sustained contribution over time. A developer who ships steadily scores higher than one with a single burst of activity.

#### Recency Weighting

All contribution scores are time-weighted:

```
recency_weight(contribution) = exp(-lambda * months_since_contribution)
```

With `lambda = 0.05`, a contribution from 12 months ago retains ~55% weight. From 24 months ago, ~30%.

This ensures scores reflect current capability, not historical activity.

### Percentile Ranking

Developer scores within each dimension are converted to percentile ranks against the population. This provides:

1. Intuitive interpretation ("this developer is in the 92nd percentile for code quality")
2. Resistance to score inflation
3. Meaningful comparison across domains with different absolute score distributions

---

## 11. API Access

> **Primary product surface is the web UI at whodoesthe.work.** The MCP server described in this section is for technical recruiting tools, AI agents, and power users who want programmatic access to developer intelligence. Most founders and recruiters will never need to read this section.

### Server Configuration

The MCP server runs on Cloudflare Workers using the Agents SDK. It exposes a set of tools that AI agents can discover and call via the MCP protocol.

**Base URL:** `https://mcp.whodoesthe.work`

**Authentication:** API key via `Authorization: Bearer <key>` header. Keys are provisioned through a separate admin endpoint (out of scope for this PRD — handled by a simple Workers KV-backed auth service at MVP).

**Pricing model (MVP):** Simple per-query pricing.

| Operation | Cost |
|---|---|
| `search_developers` | $0.05 per query |
| `get_developer_profile` | $0.02 per query |
| `compare_developers` | $0.03 per query |
| Developer ingestion (first time) | Free (amortized into query cost) |

### Tool Definitions

#### Tool 1: `search_developers`

Finds developers matching specified criteria. This is the primary entry point.

```typescript
{
  name: "search_developers",
  description: "Search for software developers based on technical skills, contribution quality, and domain expertise. Returns ranked results with evidence.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language description of the developer you're looking for. Example: 'Rust developer with distributed systems experience who writes tests and reviews code regularly.'"
      },
      domains: {
        type: "array",
        items: { type: "string" },
        description: "Technical domains to filter by. Examples: 'distributed-systems', 'frontend-react', 'ml-infrastructure', 'database-internals'."
      },
      languages: {
        type: "array",
        items: { type: "string" },
        description: "Programming languages the developer should have significant experience in."
      },
      min_quality_score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Minimum overall code quality percentile (0-100)."
      },
      min_review_score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Minimum review quality percentile."
      },
      requires_documentation: {
        type: "boolean",
        description: "If true, only return developers with non-trivial documentation contributions."
      },
      active_within_months: {
        type: "number",
        description: "Only return developers active within this many months. Default: 12."
      },
      limit: {
        type: "number",
        default: 10,
        maximum: 50,
        description: "Maximum results to return."
      }
    },
    required: ["query"]
  }
}
```

**Response schema:**

```typescript
interface SearchResult {
  developers: DeveloperSummary[];
  total_matches: number;
  query_interpretation: string; // How we interpreted the natural language query
}

interface DeveloperSummary {
  github_username: string;
  github_url: string;
  overall_impact: number;
  code_quality_percentile: number;
  review_quality_percentile: number;
  top_domains: { domain: string; score: number }[];
  top_languages: { language: string; percentage: number }[];
  active_repos_count: number;
  recent_activity: string; // "highly active", "active", "moderate", "low"
  match_explanation: string; // Why this developer matched the query
}
```

#### Tool 2: `get_developer_profile`

Returns the full scored profile for a specific developer.

```typescript
{
  name: "get_developer_profile",
  description: "Get a detailed engineering profile for a GitHub developer, including quality scores, domain expertise, contribution history, and evidence links.",
  inputSchema: {
    type: "object",
    properties: {
      github_username: {
        type: "string",
        description: "GitHub username to look up."
      },
      include_evidence: {
        type: "boolean",
        default: true,
        description: "Include links to top contributions as evidence."
      },
      domains: {
        type: "array",
        items: { type: "string" },
        description: "If specified, focus the profile on these domains."
      }
    },
    required: ["github_username"]
  }
}
```

**Response:** Full `DeveloperScore` object as defined in Section 10, plus:

```typescript
interface DeveloperProfile extends DeveloperScore {
  data_freshness: string;        // ISO timestamp of last ingestion
  ingestion_status: 'complete' | 'in_progress' | 'pending';
  evidence: {
    top_commits: { url: string; description: string; quality_score: number }[];
    top_reviews: { url: string; pr_title: string; depth_score: number }[];
    top_docs: { url: string; type: string }[];
  };
}
```

If the developer has not been ingested yet, the response includes `ingestion_status: 'pending'` and triggers background ingestion. The agent can poll or the user can retry.

#### Tool 3: `compare_developers`

Side-by-side comparison of 2-5 developers.

```typescript
{
  name: "compare_developers",
  description: "Compare multiple developers side-by-side across all scoring dimensions. Useful for shortlist evaluation.",
  inputSchema: {
    type: "object",
    properties: {
      github_usernames: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
        description: "GitHub usernames to compare."
      },
      focus_domains: {
        type: "array",
        items: { type: "string" },
        description: "Domains to emphasize in comparison."
      }
    },
    required: ["github_usernames"]
  }
}
```

**Response:**

```typescript
interface ComparisonResult {
  developers: DeveloperProfile[];
  comparison_summary: string;  // LLM-generated narrative comparison
  dimension_rankings: {
    dimension: string;
    ranked_usernames: string[];
  }[];
}
```

---

## 12. Agent Tool Design

### MCP Server Implementation

```typescript
// src/mcp-server.ts (Cloudflare Worker with Agents SDK)
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class WhodoestheworkMCP extends McpAgent {
  server = new McpServer({
    name: "whodoesthe.work",
    version: "0.1.0",
  });

  async init() {
    // Register tools
    this.server.tool(
      "search_developers",
      "Search for developers by skills, quality, and domain expertise",
      SearchDevelopersSchema,
      async (params) => {
        const auth = await this.authenticate(params);
        if (!auth.ok) return auth.error;

        await this.meter(auth.apiKey, 'search_developers');

        // Parse natural language query into structured filters
        const filters = await this.parseQuery(params.query, params);

        // Execute search against D1 + Vectorize
        const results = await this.executeSearch(filters);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };
      }
    );

    this.server.tool(
      "get_developer_profile",
      "Get detailed engineering profile for a GitHub developer",
      GetDeveloperProfileSchema,
      async (params) => {
        const auth = await this.authenticate(params);
        if (!auth.ok) return auth.error;

        await this.meter(auth.apiKey, 'get_developer_profile');

        const profile = await this.getDeveloperProfile(params.github_username);

        if (!profile) {
          // Trigger ingestion
          await this.triggerIngestion(params.github_username);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "ingestion_started",
                message: `Developer ${params.github_username} is being analyzed for the first time. This typically takes 5-15 minutes. Please retry shortly.`,
                estimated_completion: new Date(Date.now() + 15 * 60 * 1000).toISOString()
              })
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(profile, null, 2)
          }]
        };
      }
    );

    this.server.tool(
      "compare_developers",
      "Compare multiple developers side-by-side across scoring dimensions",
      CompareDevelopersSchema,
      async (params) => {
        const auth = await this.authenticate(params);
        if (!auth.ok) return auth.error;

        await this.meter(auth.apiKey, 'compare_developers');

        const profiles = await Promise.all(
          params.github_usernames.map(u => this.getDeveloperProfile(u))
        );

        const comparison = await this.generateComparison(profiles, params.focus_domains);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(comparison, null, 2)
          }]
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env) {
    // Route to MCP agent
    const url = new URL(request.url);
    if (url.pathname === "/sse" || url.pathname === "/mcp") {
      return WhodoestheworkMCP.serve("/mcp").fetch(request, env);
    }
    return new Response("whodoesthe.work MCP Server", { status: 200 });
  }
};
```

### Query Parsing Pipeline

The `search_developers` tool accepts natural language queries. These are parsed into structured filters via Workers AI:

```
User query: "Rust developer with distributed systems experience who reviews code"
                                    |
                                    v
                          +-------------------+
                          |   Workers AI      |
                          |   Query Parser    |
                          +-------------------+
                                    |
                                    v
                          {
                            languages: ["rust"],
                            domains: ["distributed-systems"],
                            min_review_score: 50,
                            active_within_months: 12
                          }
                                    |
                                    v
                      +---------------------------+
                      |  Vectorize semantic search |  (domain: "distributed-systems")
                      |  + D1 structured query     |  (language, scores, recency)
                      +---------------------------+
                                    |
                                    v
                          Ranked developer list
```

### Semantic Search via Vectorize

Developer domain profiles are embedded as vectors. When a query includes domain terms, we:

1. Embed the query domain terms using Workers AI embedding model
2. Query Vectorize for nearest-neighbor developer-domain vectors
3. Join with D1 for structured filtering (scores, recency, languages)
4. Rank by combined relevance (semantic similarity * quality score)

This allows fuzzy matching: a query for "consensus algorithms" should match developers who contribute to Raft, Paxos, or PBFT implementations, even if those exact terms aren't used.

---

## 13. Privacy & Ethical Considerations

### Foundational Principle

**We analyze only public data.** Every data point we ingest is publicly visible on GitHub to anyone with a browser. We do not access private repos, private profiles, or any data behind authentication scopes.

### 13.1 Legal Basis

- All data is sourced from GitHub's public API, which is explicitly designed for programmatic access.
- GitHub's Terms of Service permit automated access to public data within rate limits.
- Developer profiles on GitHub are voluntarily public — users choose to make their contributions visible.
- We comply with GDPR's legitimate interest basis (Art. 6(1)(f)) for processing publicly available professional data. We provide an opt-out mechanism (see 13.3).

### 13.2 What We Do NOT Do

| Prohibited Action | Rationale |
|---|---|
| Access private repositories | Out of scope, not consented |
| Store personal email addresses | Unnecessary PII |
| Infer demographic information | Not relevant to engineering skill. Actively harmful. |
| Score based on contribution volume alone | Penalizes part-time contributors, parents, people with disabilities |
| Publish individual scores publicly | Scores are returned only to authenticated API consumers |
| Sell raw data | We sell computed insights, not data dumps |
| Allow score-based discrimination | Our ToS prohibits using scores as sole hiring criteria |

### 13.3 Opt-Out Mechanism

Any developer can request removal from the system:

1. **Self-service:** Add `whodoesthe.work:optout` to your GitHub bio. Our ingestion pipeline checks for this flag and skips opted-out developers. Existing data is purged within 24 hours.
2. **Email:** Send a removal request to `privacy@whodoesthe.work`. We process within 72 hours.

Opted-out developers are added to a blocklist stored in Workers KV. The blocklist is checked at ingestion time and at query time.

### 13.4 Bias Mitigation

**Problem:** Public GitHub contribution data is biased. Developers at companies with open-source-friendly policies appear more active. Developers without the privilege to contribute to OSS on their own time are underrepresented.

**Mitigations:**

1. **Scores are not "engineering ability" scores.** They are "public contribution quality" scores. We are explicit about what we measure and what we don't.
2. **No volume-only metrics.** A developer with 50 high-quality contributions scores higher than one with 5,000 trivial commits.
3. **Recency weighting prevents lifetime penalization.** A developer who started contributing 6 months ago is not disadvantaged relative to a 10-year veteran — their recent work is weighted equally.
4. **Domain-specific scoring prevents cross-domain bias.** A frontend developer is not compared against a kernel developer on the same scale.
5. **Every score includes evidence links.** The consumer can verify any score by clicking through to the actual code. The system is auditable.

### 13.5 Transparency

- Every scored developer's profile includes the methodology version used to compute their score.
- Score components are individually visible — no opaque single number.
- The scoring algorithm is documented (this PRD). We will publish a public methodology page.

---

## 14. Anti-Gaming Mechanisms

### Threat Model

If developers know they're being scored on public contributions, they will attempt to game the system. We anticipate these attack vectors:

### 14.1 Commit Inflation

**Attack:** Developer makes thousands of trivial commits (whitespace changes, comment additions, formatting) to inflate activity metrics.

**Countermeasures:**

- **Contribution type classification** (Section 8.2) identifies `formatting` and `generated` commits, which receive 0-0.1x weight.
- **Quality weighting dominates volume.** The scoring algorithm (Section 10) uses mean quality, not sum. 1,000 garbage commits with 0.1 quality scores drag the mean down, not up.
- **Entropy analysis** flags suspiciously uniform commit patterns (same file count, same change size, regular timing) for automated review.

### 14.2 Fake Repo Contributions

**Attack:** Developer creates their own repos with fabricated "high-quality" code and contributes to them.

**Countermeasures:**

- **Repo credibility weighting.** Contributions to repos with multiple real contributors, external stars, and organic growth history are weighted higher. A repo with 1 contributor and 0 stars contributes minimal score.
- **Collaboration signals.** Reviews from real developers on your PRs are a strong credibility signal. Self-merged PRs in self-owned repos with no external reviewers receive reduced weight.
- **Cross-reference analysis.** If a developer's high-quality contributions all come from repos they own with no other contributors, that's flagged.

### 14.3 Rubber-Stamp Review Farming

**Attack:** Two developers agree to approve each other's PRs to inflate review counts.

**Countermeasures:**

- **Review depth scoring.** Reviews with 0 comments, or only "LGTM" comments, score near-zero. Reviews that reference specific code lines, suggest alternatives, and request changes score high.
- **Review time analysis.** A review submitted within 2 minutes of PR creation on a 500-line change is flagged as rubber-stamp.
- **Reciprocity detection.** If developer A exclusively reviews developer B's code and vice versa, with no other reviewers, both developers' review scores are penalized.

### 14.4 AI-Generated Code

**Attack:** Developer uses AI to generate large volumes of plausible-looking code contributions.

**Countermeasures:**

- **Quality metrics still apply.** AI-generated code that doesn't ship to production (no dependent code, no external usage, no reviews) scores low on impact.
- **Consistency analysis.** Sudden spikes in contribution volume or dramatic style changes are flagged.
- **We do not penalize AI-assisted development.** Using AI tools is legitimate engineering practice. We penalize low-quality contributions regardless of how they were produced.

### 14.5 Profile Manipulation

**Attack:** Developer changes their GitHub username to match a high-scoring developer, or claims others' contributions.

**Countermeasures:**

- **We key on GitHub user ID (numeric), not username.** Username changes don't affect profiles.
- **Commit email verification.** We cross-reference commit author emails with the GitHub user's verified emails where available.

### 14.6 Anomaly Detection (V1)

For MVP, we rely on the structural countermeasures above. In V1, we add:

- Statistical outlier detection on score distributions
- Temporal anomaly detection (sudden score changes)
- Graph-based analysis of review networks to detect collusion rings

---

## 15. Demo Scenario

### Demo 1: Web Product — Founder Searching for Engineers

**Scenario:** A founder is building a distributed payments platform. She needs a backend engineer who's shipped production code in this space.

**Step 1 — Describe the project (whodoesthe.work/search):**
> "Building a real-time payment settlement system. Need someone who understands distributed transactions, consistency guarantees, and can ship production-quality Rust or Go."

The form validates the description (min 20 chars) and shows a green "Looking good" confirmation.

**Step 2 — Pick the stack:**
She clicks "Rust" and "Go" from the 20 available stack chips. Both turn blue with a low-opacity background.

**Step 3 — Select a role:**
She selects "Backend engineer" from the 6-option role grid and clicks "Find matches →"

**Results page (/matches):**

In 2.4 seconds, 8 ranked developer cards appear. The top card:

```
#1  [alexchen]                                          87 overall impact
    ████████████████████ 87% match confidence

    Domains: distributed-systems  database-internals  fintech

    ┌─────────────────────────────────────────────────────┐
    │ WHY MATCHED                                         │
    │ They've shipped a 2PC implementation in a 2k-star   │
    │ Go repo and lead code review at the 84th percentile.│
    └─────────────────────────────────────────────────────┘

    Code quality ████████████████░░░░  Code review ██████████████░░░░░░
    Go  Rust  TypeScript               [View profile]  [+ Shortlist]
```

She clicks "+ Shortlist" on alexchen, priya_dev, and mbueno. The button turns green: "✓ Shortlisted."

**Shortlist page (/shortlist):**
Three MatchCards saved to her API-key-scoped shortlist. She can share the URL with her co-founder to review.

---

### Demo 2: MCP — AI Agent for Technical Recruiting

**Scenario:** A hiring manager at a fintech company is building a new payment processing system. They need a backend engineer with experience in distributed transactions, strong code quality habits, and a track record of code review.

**Setup:** The hiring manager's recruiting AI agent has the whodoesthe.work MCP server configured.

---

**Hiring Manager (to their AI agent):**

> "Find me a developer who has shipped production code in Go or Rust related to distributed transactions or payment systems, maintains high code quality, reviews others' code substantively, and has been active in the last year."

**Agent calls `search_developers`:**

```json
{
  "query": "distributed transactions or payment systems developer with strong code review habits",
  "languages": ["go", "rust"],
  "domains": ["distributed-systems", "fintech", "databases"],
  "min_quality_score": 75,
  "min_review_score": 70,
  "requires_documentation": false,
  "active_within_months": 12,
  "limit": 5
}
```

**Response:**

```json
{
  "developers": [
    {
      "github_username": "alexchen",
      "github_url": "https://github.com/alexchen",
      "overall_impact": 88,
      "code_quality_percentile": 91,
      "review_quality_percentile": 84,
      "top_domains": [
        { "domain": "distributed-systems", "score": 93 },
        { "domain": "database-internals", "score": 78 }
      ],
      "top_languages": [
        { "language": "Go", "percentage": 65 },
        { "language": "Rust", "percentage": 25 }
      ],
      "active_repos_count": 12,
      "recent_activity": "highly active",
      "match_explanation": "Strong match: 340+ commits to distributed systems repos in Go, including a 2PC implementation in a 2k-star project. 156 substantive code reviews in the last 12 months with avg 4.2 comments per review. Cyclomatic complexity trend is downward (consistently simplifies code)."
    },
    {
      "github_username": "priya_dev",
      "github_url": "https://github.com/priya_dev",
      "overall_impact": 82,
      "code_quality_percentile": 87,
      "review_quality_percentile": 92,
      "top_domains": [
        { "domain": "distributed-systems", "score": 85 },
        { "domain": "fintech", "score": 80 }
      ],
      "top_languages": [
        { "language": "Rust", "percentage": 70 },
        { "language": "Go", "percentage": 20 }
      ],
      "active_repos_count": 8,
      "recent_activity": "active",
      "match_explanation": "Strong match: Core contributor to an open-source Rust payment gateway (800 stars). Exceptional review quality — 92nd percentile with detailed, code-referencing reviews. 23 documentation contributions including 3 ADRs on transaction isolation."
    }
  ],
  "total_matches": 47,
  "query_interpretation": "Filtered for: Go/Rust developers with domain expertise in distributed systems, fintech, or database internals. Required: code quality >= 75th percentile, review quality >= 70th percentile, active within 12 months. Ranked by: overall impact score weighted toward distributed systems domain score."
}
```

**Hiring Manager:** "Tell me more about priya_dev's Rust payment gateway work."

**Agent calls `get_developer_profile`:**

```json
{
  "github_username": "priya_dev",
  "include_evidence": true,
  "domains": ["fintech", "distributed-systems"]
}
```

**Response includes:**

```json
{
  "evidence": {
    "top_commits": [
      {
        "url": "https://github.com/example/payment-rs/commit/abc123",
        "description": "Implemented distributed saga pattern for cross-service payment rollback. Reduced complexity of existing error handling from CC 34 to CC 12.",
        "quality_score": 96
      },
      {
        "url": "https://github.com/example/payment-rs/commit/def456",
        "description": "Added idempotency key middleware with collision detection. Includes comprehensive test suite (14 test cases).",
        "quality_score": 92
      }
    ],
    "top_reviews": [
      {
        "url": "https://github.com/example/payment-rs/pull/789",
        "pr_title": "Add retry logic for failed settlements",
        "depth_score": 95
      }
    ],
    "top_docs": [
      {
        "url": "https://github.com/example/payment-rs/blob/main/docs/adr/003-saga-pattern.md",
        "type": "ADR"
      }
    ]
  }
}
```

**Hiring Manager:** "Compare priya_dev and alexchen for this role."

**Agent calls `compare_developers`:**

```json
{
  "github_usernames": ["priya_dev", "alexchen"],
  "focus_domains": ["distributed-systems", "fintech"]
}
```

**Response includes:**

```json
{
  "comparison_summary": "Both are strong distributed systems engineers. alexchen has higher raw volume and broader repo coverage (12 vs 8 active repos). priya_dev has higher review quality (92nd vs 84th percentile) and direct fintech domain experience. alexchen's primary strength is Go-based distributed systems; priya_dev's is Rust-based payment infrastructure. For a payment processing role, priya_dev is the closer domain match. For a general distributed systems role, alexchen offers broader coverage.",
  "dimension_rankings": [
    { "dimension": "overall_impact", "ranked_usernames": ["alexchen", "priya_dev"] },
    { "dimension": "code_quality", "ranked_usernames": ["alexchen", "priya_dev"] },
    { "dimension": "review_quality", "ranked_usernames": ["priya_dev", "alexchen"] },
    { "dimension": "fintech_domain", "ranked_usernames": ["priya_dev", "alexchen"] },
    { "dimension": "distributed_systems_domain", "ranked_usernames": ["alexchen", "priya_dev"] },
    { "dimension": "documentation", "ranked_usernames": ["priya_dev", "alexchen"] }
  ]
}
```

The hiring manager now has **verifiable, evidence-backed, quality-ranked** candidates instead of a list of LinkedIn profiles that say "passionate about distributed systems."

---

## 16. Success Criteria

### MVP Launch Criteria (Gate to public beta)

| Criterion | Metric | Target |
|---|---|---|
| Ingestion reliability | % of developer profiles that complete ingestion without error | > 95% |
| Ingestion latency | Time from first query to profile availability | < 20 minutes for 90th percentile |
| Score stability | Score variance on re-computation of same developer (no new data) | < 2% |
| Query latency | p95 response time for `search_developers` (cached developers) | < 2 seconds |
| Classification accuracy | Manual review of contribution type classification on 200 samples | > 85% agreement |
| Domain tagging accuracy | Manual review of domain tags on 200 samples | > 80% agreement |
| Search relevance | Top-5 results contain at least 3 genuinely relevant developers (manual eval) | > 75% of test queries |
| MCP compatibility | Successful tool discovery and invocation from Claude, GPT, and one open-source agent | 3/3 |

### Business Metrics (First 90 days post-launch)

**Web Product Metrics:**

| Metric | Target |
|---|---|
| Web sessions | 500+ |
| Searches completed | 200+ |
| Shortlists created | 50+ |
| Median time to first result | < 3 seconds |

**Overall Platform Metrics:**

| Metric | Target |
|---|---|
| Developers scored | 10,000+ |
| API keys issued | 50+ |
| Monthly recurring queries (web + MCP) | 5,000+ |
| Repeat usage (same API key, 2+ weeks) | > 40% |
| Opt-out requests | < 1% of scored developers |

### What "Good" Looks Like

The system is working when a recruiter can describe the engineer they need in plain English, receive a ranked shortlist with evidence, verify each candidate's work by clicking through to actual code, and consistently find that the top-ranked candidates are genuinely strong engineers in the requested domain.

The system is failing if: scores correlate with commit volume rather than quality, gaming is detectable in the top results, or recruiters report that top-ranked candidates are not meaningfully better than random GitHub search.

---

## Appendix A: D1 Schema (Complete)

```sql
-- Core entities
CREATE TABLE developers (
  id TEXT PRIMARY KEY,              -- GitHub numeric user ID
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  public_repos INTEGER,
  followers INTEGER,
  created_at TEXT,
  opted_out BOOLEAN DEFAULT FALSE,
  last_ingested_at TEXT,
  ingestion_status TEXT DEFAULT 'pending',  -- pending, in_progress, complete, failed
  overall_impact REAL,
  code_quality REAL,
  review_quality REAL,
  documentation_quality REAL,
  collaboration_breadth REAL,
  consistency_score REAL,
  recent_activity_score REAL,
  score_version TEXT,               -- methodology version
  scored_at TEXT
);

CREATE TABLE repos (
  full_name TEXT PRIMARY KEY,       -- owner/name
  description TEXT,
  language TEXT,
  stars INTEGER,
  forks INTEGER,
  contributors_count INTEGER,
  has_tests BOOLEAN,
  last_pushed_at TEXT,
  ingested_at TEXT
);

CREATE TABLE contributions (
  id TEXT PRIMARY KEY,              -- SHA or synthetic ID
  developer_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  type TEXT NOT NULL,               -- commit, review, documentation
  contribution_type TEXT,           -- feature, bugfix, refactor, etc.
  authored_at TEXT NOT NULL,
  additions INTEGER,
  deletions INTEGER,
  files_changed INTEGER,
  complexity_delta REAL,
  entropy REAL,
  test_correlated BOOLEAN,
  quality_score REAL,
  recency_weighted_score REAL,
  domains TEXT,                     -- JSON array
  languages TEXT,                   -- JSON array
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_author_id TEXT,
  review_state TEXT,
  comment_count INTEGER,
  total_comment_length INTEGER,
  references_code_lines BOOLEAN,
  submitted_at TEXT NOT NULL,
  depth_score REAL,
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);

CREATE TABLE developer_domains (
  developer_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  score REAL NOT NULL,
  contribution_count INTEGER,
  evidence_repos TEXT,              -- JSON array
  embedding_id TEXT,                -- Vectorize reference
  PRIMARY KEY (developer_id, domain),
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);

-- Indexes
CREATE INDEX idx_contributions_developer ON contributions(developer_id);
CREATE INDEX idx_contributions_repo ON contributions(repo_full_name);
CREATE INDEX idx_contributions_type ON contributions(contribution_type);
CREATE INDEX idx_contributions_authored ON contributions(authored_at);
CREATE INDEX idx_reviews_developer ON reviews(developer_id);
CREATE INDEX idx_developer_domains_domain ON developer_domains(domain);
CREATE INDEX idx_developers_quality ON developers(code_quality);
CREATE INDEX idx_developers_impact ON developers(overall_impact);
```

## Appendix B: Rate Limiting & Cost Model

### GitHub API

- Authenticated rate limit: 5,000 requests/hour
- We use a single GitHub App token for MVP
- At steady state (~100 developer ingestions/day), this is ~260,000 API calls/day = ~10,800/hour = well within limits
- Burst handling: Durable Object token bucket with GitHub rate limit header synchronization

### Cloudflare Costs (Estimated at MVP scale)

| Service | Usage Estimate | Monthly Cost |
|---|---|---|
| Workers (requests) | 500K requests/month | ~$5 |
| Workers (CPU time) | 50M ms/month | ~$25 |
| Workers AI | 100K inference calls/month | ~$10 |
| D1 | 10M rows read, 1M rows written | ~$5 |
| ~~R2~~ | Not used — diffs re-fetched from GitHub | $0 |
| Queues | 5M messages/month | ~$2 |
| Vectorize | 100K vectors, 50K queries/month | ~$5 |
| Durable Objects | 10K requests/day | ~$1 |
| **Total** | | **~$54/month** |

At $0.02-0.05/query, we break even at ~1,500 queries/month.

## Appendix C: Open Questions

| # | Question | Impact | Decision Needed By |
|---|---|---|---|
| 1 | Should we offer a free tier for the MCP server? | Distribution vs. revenue | Before launch |
| 2 | Which Workers AI model for classification? Llama 3.1 8B vs. smaller? | Cost vs. accuracy | During implementation |
| 3 | How to handle developers with 10,000+ commits? Full ingestion or sampling? | Ingestion latency | During implementation |
| 4 | Should opted-out developers appear in search results with a "no score available" placeholder, or be completely invisible? | Privacy posture | Before launch |
| 5 | Patent landscape for code quality scoring algorithms? | Legal risk | Before launch |
| 6 | Should `compare_developers` require that both developers have been previously ingested, or trigger on-demand ingestion? | UX vs. latency | During implementation |

---

*This document is a living artifact. Version history is tracked in git. All stakeholders are expected to comment directly on this document via PR review.*
