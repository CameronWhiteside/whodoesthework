# Spec ID: DATA-FIX-A — Data Correctness + Reingestion Repair

## Context
The system currently surfaces many developers as `ingestion_status = complete` while their profiles are effectively empty:

- all score dimensions are `0`
- `developer_domains` is empty
- evidence lists are empty

This makes the UI/MCP experience look broken and pollutes search results with non-informative profiles.

## Primary Root Cause
The ingestion pipeline can mark a developer complete without ingesting any commits.

Confirmed by code-path:

- `DeveloperIngestion.ingestDeveloper()` sets status to `in_progress` immediately.
- `Queries.updateIngestionStatus()` updates `developers.last_ingested_at` on any status change.
- `analyzeRepo()` uses `since = dev.lastIngestedAt ?? lookback`.

Net: first-time ingestion sets `last_ingested_at = now`, then queries commits with `since=now` => 0 commits => 0 contributions => scoring/domains stay empty => developer still transitions to `complete`.

## Secondary Contributors
- Repo metadata is currently written as placeholders for many repos (stars/topics/description/language), reducing domain and scoring signal quality even when commits exist.
- `GitHubClient.requestList()` currently treats generic `403` as an empty list for list endpoints, producing silent empty ingestions instead of retrying/failing.
- Vectors can be upserted even for empty profiles (fallback domain), making empty profiles appear as valid search matches.

## Goals
1) Prevent new bad states: never mark `complete` unless the developer has meaningful ingested data (or an explicit legit-empty terminal reason).
2) Repair existing data:
   - reingest “broken complete” developers
   - perform a controlled full reingest of the dataset
3) Improve resilience:
   - add a GitHub fallback path that can fetch `.patch` / `.diff` directly from github.com when the GitHub API cannot provide commit details
4) Make operations agent-friendly:
   - provide a deterministic operator runbook with read-only inspection, dry-run, targeted repair, and full reingest steps.

## Non-goals
- UI redesign beyond filtering empty profiles out of results.
- A full ingestion architecture rewrite (keep DO + Queues design).
- Adding non-GitHub data sources.

## Definitions

### “Broken complete” developer
A developer row where:

- `developers.ingestion_status = 'complete'`, AND
- one of:
  - `COUNT(contributions WHERE developer_id = id) = 0`, OR
  - `overall_impact = 0` AND `COUNT(developer_domains WHERE developer_id = id) = 0`

### Minimum completeness threshold
Used to decide whether the developer is eligible for:

- being marked `complete`
- having a Vectorize vector written
- being returned in public search

Default threshold (MVP):

- contributions >= 5 OR any score dimension > 0 OR domains_count >= 1

## Proposed Data Model Changes (D1)

### A) Timestamp semantics
Clarify and enforce semantics:

- `last_ingested_at` becomes “last successful completion timestamp” (completion-only)

Add:

- `ingestion_started_at` (TEXT, nullable)
- `ingestion_failure_reason` (TEXT, nullable)
- `ingestion_last_error` (TEXT, nullable; truncated message for debugging)
- `ingestion_attempt_count` (INTEGER, nullable; optional)

Rationale: we need to track attempts without poisoning incremental commit fetching.

### B) Status values
Continue using current status enum but tighten transitions:

- `pending` -> `in_progress` -> `complete`
- any unrecoverable path -> `failed` (with failure reason)

Avoid using `complete` as “done trying.” `complete` must mean “searchable profile exists.”

## Pipeline Behavior Changes

### 1) Fix `last_ingested_at` update behavior
- Do not update completion timestamp when setting `in_progress`.
- Update completion timestamp only once ingestion is fully complete (after repo analysis fan-out is done and downstream scoring/vector steps are queued).

### 2) Fix commit `since` selection
In `analyzeRepo()`:

- use `since = developers.last_ingested_at` only when that timestamp represents a previous successful completion
- otherwise use `since = now - COMMIT_LOOKBACK_DAYS`

### 3) “Complete” gating
Do not mark developer `complete` unless they meet the minimum completeness threshold.

If ingestion ends with zero contributions:

- do not mark `complete`
- set `failed` (or remain `pending` if retrying) and populate `ingestion_failure_reason`

Legit-empty terminal reasons are allowed but must be explicit, rare, and observable.

### 4) Repo metadata correctness
Persist real repo metadata to D1 and avoid clobbering:

- do not overwrite non-empty repo fields with placeholders (`0`, `[]`, `null`)
- prefer discovery-provided metadata (stars/topics/language/description) or fetch repo details once per repo

### 5) GitHub API 403 handling
Stop treating generic `403` as empty lists for commits/PRs.

- For endpoints where 403 truly indicates “too big to list” (contributors), allow empty result with an explicit note.
- For commits/PRs, classify and throw a retryable error to let Queue retry/backoff work.
- Record failure reason:
  - `GITHUB_FORBIDDEN`
  - `GITHUB_SSO_REQUIRED`
  - `GITHUB_SECONDARY_RATE_LIMIT`
  - `GITHUB_RATE_LIMIT`

### 6) GitHub fallback when commit detail fails
If GitHub API commit detail fetch fails:

- fetch `https://github.com/<owner>/<repo>/commit/<sha>.patch` (or `.diff`)
- parse enough to compute:
  - list of file paths
  - additions/deletions approximation
  - test/doc/language heuristics by path/extension

If fallback also fails, skip that commit but record a failure metric.

### 7) Vectorize + search eligibility
Prevent empty profiles from being searchable:

- do not upsert Vectorize vectors unless developer meets minimum completeness threshold
- add query-time filtering (SQL) to require either:
  - `overall_impact > 0`, OR
  - `EXISTS contributions`

## Repair + Reingestion

### 1) Targeted repair: broken-complete developers
For each broken-complete developer:

- delete `contributions`, `reviews`, `developer_domains` rows for that developer
- clear score fields on `developers`
- set `ingestion_status = 'pending'`
- delete Vectorize id `dev-<developerId>`
- enqueue ingestion (`ingest_developer`) for that username

### 2) Full reingest
Perform a controlled, batched reingest of all developers:

- batch size: 50-200 usernames per wave
- concurrency cap: configurable (start low)
- retry/backoff: based on GitHub reset timestamps; avoid retry spirals
- pause/resume: supported via an admin switch or environment variable

## Acceptance Criteria (Measurable)

### Correctness
- `developers.last_ingested_at` is updated only on successful completion.
- First-time ingestion for a developer with accessible repos results in `contributions > 0`.
- No developer is `complete` while `contributions = 0`, unless `ingestion_failure_reason` is an explicit legit-empty terminal reason.

### Search integrity
- Public search results never include developers below the minimum completeness threshold.

### Repair
- After targeted repair run, query for broken-complete returns 0 rows (or only explicit legit-empty terminal reasons).

### Resilience
- When GitHub commit detail API fails for a subset of commits, fallback patch/diff fetch path produces non-empty contribution signals for at least some of those commits.

## Observability
Add/ensure logs and counters:

- per developer ingestion summary: repos discovered, repos dispatched, repos completed, contributions inserted, reviews inserted
- failure reasons aggregated by day
- counts of fallback usage: `PATCH_FALLBACK_USED`

## Operator Runbook
This runbook is written to be executed by a coding agent (or human operator) using `wrangler` and HTTP endpoints.

### Safety
- Do NOT paste Cloudflare tokens into chat logs.
- Use least-privilege API tokens.
- Prefer dry-run queries before any destructive operation.

### Prerequisites
Environment variables:

- `CLOUDFLARE_ACCOUNT_ID` (required for some commands)
- `CLOUDFLARE_API_TOKEN` (required for `wrangler d1 execute --remote` in non-interactive environments)

Identify production D1 binding:

- D1 name: `wdtw-db`
- D1 id: from `wrangler.jsonc` (`d41850db-e514-4155-82d4-bf184c89d8e6` as of this spec)

### 0) Read-only health check
Run platform stats endpoint:

- `GET /admin/stats`

Expected:

- contributions/classified/scored should be close; if developers is high but contributions low, ingestion is failing.

### 1) Identify broken-complete developers (read-only)
Using Wrangler (remote):

```bash
npx wrangler d1 execute wdtw-db --remote --command "
SELECT d.username, d.id, d.ingestion_status, COUNT(c.id) AS contribs
FROM developers d
LEFT JOIN contributions c ON c.developer_id = d.id
WHERE d.opted_out = 0 AND d.ingestion_status = 'complete'
GROUP BY d.id
HAVING contribs = 0
ORDER BY d.last_ingested_at DESC
LIMIT 200;
"
```

Optional: see how many total:

```bash
npx wrangler d1 execute wdtw-db --remote --command "
SELECT COUNT(*) AS broken_complete
FROM (
  SELECT d.id
  FROM developers d
  LEFT JOIN contributions c ON c.developer_id = d.id
  WHERE d.opted_out = 0 AND d.ingestion_status = 'complete'
  GROUP BY d.id
  HAVING COUNT(c.id) = 0
);
"
```

### 2) Dry-run targeted repair cohort selection
Pick a small cohort (e.g. 20) to validate behavior before full repair:

```bash
npx wrangler d1 execute wdtw-db --remote --command "
SELECT d.username, d.id
FROM developers d
LEFT JOIN contributions c ON c.developer_id = d.id
WHERE d.opted_out = 0 AND d.ingestion_status = 'complete'
GROUP BY d.id
HAVING COUNT(c.id) = 0
ORDER BY d.last_ingested_at DESC
LIMIT 20;
"
```

### 3) Execute targeted repair (requires admin tool or scripted SQL)
Implementation requirement:

- provide either:
  - an authenticated admin endpoint that performs the reset+requeue, OR
  - a script (run locally) that executes parameterized D1 statements and enqueues DO ingestion

Regardless of mechanism, the operation must:

1) delete dependent rows:
- `DELETE FROM contributions WHERE developer_id = ?`
- `DELETE FROM reviews WHERE developer_id = ?`
- `DELETE FROM developer_domains WHERE developer_id = ?`

2) reset developer row:
- set score columns to NULL
- set `ingestion_status = 'pending'`
- clear failure fields

3) delete Vectorize vector:
- delete id `dev-<developerId>`

4) enqueue ingestion:
- `POST /admin/ingest { "username": "..." }`

Validation after cohort repair:

- wait for queue to drain
- verify each username now has `contributions > 0` OR `failure_reason` set (non-empty)

### 4) Run scoring + vector rebuild
If ingestion succeeded but scores/vectors lag:

- `POST /admin/reindex` with empty body to queue compute+vector across all developers

### 5) Full reingest (controlled)
Implementation requirement:

- provide a batch job that:
  - enumerates all developers (or usernames)
  - applies reset+requeue in batches
  - enforces concurrency cap
  - supports pause/resume

Suggested execution plan:

1) run batches of 100
2) pause between batches if GitHub secondary rate limiting appears
3) continually monitor broken-complete count query; it should trend down

### 6) Post-run audit
Confirm there are no broken-complete developers:

```bash
npx wrangler d1 execute wdtw-db --remote --command "
SELECT COUNT(*) AS broken_complete
FROM (
  SELECT d.id
  FROM developers d
  LEFT JOIN contributions c ON c.developer_id = d.id
  WHERE d.opted_out = 0 AND d.ingestion_status = 'complete'
  GROUP BY d.id
  HAVING COUNT(c.id) = 0
);
"
```

Confirm public search doesn’t return empty profiles:

- run a few `/api/search` queries and ensure results have non-zero score or non-empty domains.

## Rollout Plan
1) Guardrails first (timestamp semantics + complete gating + search filtering)
2) GitHub robustness (403 classification + patch fallback)
3) Targeted repair (broken-complete)
4) Full reingest (batched)
5) Audit + tighten thresholds if needed

## Open Question (choose a default)
Repo discovery expansion (beyond `type=owner`):

- Option A: discover “contributed repos” via public events
- Option B: discover collaborator repos (if token allows)

Default: Option A (public events), because it does not require private scopes and usually captures real work.
