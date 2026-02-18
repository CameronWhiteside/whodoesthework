# Spec 10 — DATA-FIX: Full Data Pipeline Repair

**Status:** Not Started
**Blocks:** Nothing downstream — but unblocks demo quality (removes stuck INDEXING cards, surfaces real developer profiles in search)
**Blocked By:** Nothing — all prereqs are deployed
**Parallelizable with:** Nothing — this is a hotfix track

---

## Problem Summary

Two compounding failure modes have produced a broken data state:

1. **Stuck `in_progress`** — 51 of 66 developers have valid scores but never transitioned to `complete` because the Durable Object completion counter got stuck when `analyze_repo` queue messages hit the DLQ retry limit.
2. **Empty `complete`** — some developers are marked `complete` with zero contributions because a timestamp bug causes first-time ingestions to query commits with `since=now`, returning nothing.

Both modes pollute the UI with blank or INDEXING cards and corrupt search results. The fix requires an immediate DB heal, two root-cause pipeline patches, and a set of resilience improvements that prevent recurrence.

---

## Current DB State (Diagnosed 2026-02-18)

```
ingestion_status = complete     →  15 developers
ingestion_status = in_progress  →  51 developers  ← stuck
```

Reviews table: only 3 of 66 developers have any review data.

### Stuck Buckets

| Bucket | SQL Condition | ~Count | Action |
|--------|--------------|--------|--------|
| **A** | `in_progress AND scored_at IS NOT NULL AND overall_impact IS NOT NULL` | 49 | Flip to `complete` |
| **B** | `in_progress AND scored_at IS NOT NULL AND overall_impact IS NULL` | 2 (`torvalds`, `ronaldstoner`) | Re-queue `compute_scores` |
| **C** | `complete AND overall_impact = 0 AND contributions = 0` | ~5 | Targeted reingest (see Repair section) |

---

## Root Causes

### Root Cause 1 — DO completion counter never fires (stuck `in_progress`)

`ingestion_status` is set to `complete` only inside the Durable Object's `onRepoComplete()` handler, which fires only when:

```
repos_completed (DO storage counter) >= repos_dispatched (DO storage counter)
```

When `analyze_repo` queue messages exhausted their 3-retry DLQ limit (due to GitHub rate limits), the counter never reached its target → DO never fired completion → status stuck permanently. A later `compute_scores: 'all'` cron run scored those developers correctly but the cron path bypasses the DO entirely, so status was never updated.

**Result:** Developers have valid `scored_at`, `overall_impact`, etc. in D1 but show `in_progress` permanently.

### Root Cause 2 — `last_ingested_at` poisons first-time commit fetching (empty `complete`)

`DeveloperIngestion.ingestDeveloper()` sets status to `in_progress` immediately, and `Queries.updateIngestionStatus()` updates `developers.last_ingested_at` on *any* status change — including the `in_progress` transition.

Then `analyzeRepo()` uses `since = dev.lastIngestedAt ?? lookback`.

Net effect: first-time ingestion sets `last_ingested_at = now`, then queries commits with `since=now` → 0 commits → 0 contributions → scoring and domains stay empty → developer still transitions to `complete` with no data.

### Secondary Contributors

- **Repo metadata placeholders** — stars/topics/description/language are written as `0`/`[]`/`null` for many repos, reducing domain and scoring signal quality even when commits exist.
- **GitHub 403 silent swallow** — `GitHubClient.requestList()` treats generic `403` as an empty list for all list endpoints, producing silent empty ingestions instead of retrying or failing loudly.
- **Vectorize upserts for empty profiles** — vectors are written even for developers below any completeness threshold, making empty profiles appear as valid search matches.
- **Rate limit exhaustion blanks cards** — when `GITHUB_TOKEN` is exhausted at `getUser()` time, no developer row is written to D1 at all, leaving the card blank until retry.

---

## Definitions

### "Broken-complete" developer
A developer row where `ingestion_status = 'complete'` AND one of:
- `COUNT(contributions WHERE developer_id = id) = 0`, OR
- `overall_impact = 0` AND `COUNT(developer_domains WHERE developer_id = id) = 0`

### Minimum completeness threshold
Used to gate `complete` status, Vectorize upserts, and public search inclusion.

**Default (MVP):** contributions >= 5 OR any score dimension > 0 OR domains_count >= 1

---

## Data Model Changes (D1)

### New columns on `developers`

Add via migration:

```sql
ALTER TABLE developers ADD COLUMN ingestion_started_at TEXT;
ALTER TABLE developers ADD COLUMN ingestion_failure_reason TEXT;
ALTER TABLE developers ADD COLUMN ingestion_last_error TEXT;
ALTER TABLE developers ADD COLUMN ingestion_attempt_count INTEGER DEFAULT 0;
```

**Semantics:**
- `last_ingested_at` — **completion-only timestamp**. Updated only when ingestion fully completes (not on `in_progress` transition). Used as the `since` value for incremental commit fetching.
- `ingestion_started_at` — set when status transitions to `in_progress`. Decoupled from `last_ingested_at` so incremental commit windows aren't poisoned.
- `ingestion_failure_reason` — machine-readable enum: `GITHUB_FORBIDDEN`, `GITHUB_SSO_REQUIRED`, `GITHUB_SECONDARY_RATE_LIMIT`, `GITHUB_RATE_LIMIT`, `NO_ACCESSIBLE_REPOS`, `LEGIT_EMPTY`.
- `ingestion_last_error` — truncated human-readable message for debugging.
- `ingestion_attempt_count` — incremented on each attempt; enables backoff decisions.

### Status transition rules (tightened)

```
pending → in_progress → complete   (happy path)
pending → in_progress → failed     (unrecoverable)
failed  → pending                  (manual reset for retry)
```

`complete` **must mean** "searchable profile exists." Never use it to mean "done trying."

---

## Deliverables

### Deliverable 1 — `POST /admin/unstick` (immediate DB heal)

**Files:** `src/api/router.ts`, `src/db/queries.ts`

**Behavior:**

1. Run Bucket A update — flip scored-but-stuck developers to `complete`:
   ```sql
   UPDATE developers
   SET ingestion_status = 'complete'
   WHERE ingestion_status = 'in_progress'
     AND scored_at IS NOT NULL
     AND overall_impact IS NOT NULL
   ```

2. Fetch Bucket B developers and re-queue scoring:
   ```sql
   SELECT id FROM developers
   WHERE ingestion_status = 'in_progress'
     AND scored_at IS NOT NULL
     AND overall_impact IS NULL
   ```
   For each: send `{ type: 'compute_scores', developerId }` to the queue.

3. Return JSON: `{ bucket_a_fixed: N, bucket_b_requeued: N }`.

**Constraints:** Idempotent (safe to call multiple times). Only moves status forward, never backward. No destructive operations.

**Acceptance Criteria:**
- [ ] After calling `POST /admin/unstick`, zero developers remain with `ingestion_status = 'in_progress'` and a non-null `scored_at`
- [ ] Bucket A developers' score fields are untouched
- [ ] Bucket B developers get `compute_scores` messages queued

---

### Deliverable 2 — Pipeline completion safety net

**File:** `src/worker.ts`

At the end of the `build_vectors` handler, after `buildVectorsForDeveloper` succeeds, add:

```ts
await queries.setIngestionStatus(payload.developerId, 'complete');
await queries.setLastIngestedAt(payload.developerId, new Date().toISOString());
```

`build_vectors` is the last step of the pipeline. This guarantees a terminal `complete` transition even when the DO's counter logic fails (DLQ exhaustion, rate limit chaos). If the DO path succeeds first, this is a no-op write.

**Acceptance Criteria:**
- [ ] A developer ingested end-to-end after this change ends with `ingestion_status = 'complete'`
- [ ] No developer with a successful `build_vectors` run remains `in_progress`

---

### Deliverable 3 — Fix `last_ingested_at` semantics

**Files:** `src/db/queries.ts`, `src/ingestion/durable-object.ts`

**Changes:**
- `updateIngestionStatus()` must NOT update `last_ingested_at` when transitioning to `in_progress`. Set `ingestion_started_at` instead.
- `last_ingested_at` is written only on successful completion (in `build_vectors` handler per Deliverable 2, and the DO's `onRepoComplete` if that path succeeds).

**Fix `analyzeRepo()` `since` selection:**

```ts
// BEFORE (broken):
const since = dev.lastIngestedAt ?? subDays(new Date(), COMMIT_LOOKBACK_DAYS);

// AFTER (correct):
// Only use last_ingested_at if it represents a previous successful completion.
// ingestion_started_at marks the current attempt start — never use it as `since`.
const since = dev.lastIngestedAt && dev.lastIngestedAt < dev.ingestionStartedAt
  ? dev.lastIngestedAt
  : subDays(new Date(), COMMIT_LOOKBACK_DAYS);
```

**Acceptance Criteria:**
- [ ] First-time ingestion for a developer with accessible public repos results in `contributions > 0`
- [ ] `last_ingested_at` is null for `in_progress` developers on their first run
- [ ] Incremental re-ingestion uses the previous `last_ingested_at` correctly

---

### Deliverable 4 — Two-tier GitHub API (rate limit fallback)

**Files:** `src/ingestion/github-client.ts`, `src/ingestion/durable-object.ts`

#### Problem

When `GITHUB_TOKEN` (5,000 req/hr) is exhausted, `getUser()` fails at the very start of `ingestDeveloper`. No developer row is written to D1. The card shows a blank INDEXING state; the DO retries 3× before dropping the message.

#### Solution: Two-tier fetch

**Tier 1 — Unauthenticated (60 req/hr, no token):**

Add `GitHubClient.getUserPublic(username: string): Promise<GitHubUser>` — a plain `fetch` to `https://api.github.com/users/{username}` with no `Authorization` header. Returns the same user shape: `login`, `id`, `name`, `bio`, `avatar_url`, `public_repos`, `followers`.

**Tier 2 — Authenticated (5,000 req/hr):**

All heavy endpoints unchanged: repo listing, commits, diffs, PRs, reviews.

#### Change in `ingestDeveloper`

```ts
// Try authenticated first; fall back to public API if rate-limited
let user: GitHubUser;
try {
  const { data } = await gh.getUser(username);
  user = data;
} catch (err) {
  if (isRateLimitError(err)) {
    user = await gh.getUserPublic(username); // unauthenticated — always available
  } else {
    throw err;
  }
}

// Upsert the shell immediately — card is no longer blank while pipeline runs
await this.queries.upsertDeveloper({ id: String(user.id), username: user.login });
await this.queries.setIngestionStatus(String(user.id), 'in_progress');

// Heavy pipeline continues — authenticated endpoints will use backoff/retry
// when rate limit windows reset (hourly)
```

This guarantees D1 always gets a developer row even when the authenticated token is exhausted. The user is visible in the UI; the full pipeline queues normally.

**Acceptance Criteria:**
- [ ] `getUserPublic('torvalds')` returns a valid user object without a GitHub token
- [ ] When `GITHUB_TOKEN` is rate-limited at `getUser()` time, `ingestDeveloper` still upserts the developer row and sets `in_progress`
- [ ] No change to authenticated behavior when token is healthy

---

### Deliverable 5 — GitHub 403 classification

**File:** `src/ingestion/github-client.ts`

Stop treating all `403` responses as empty lists.

**Classification rules for `requestList()`:**

| Response signal | Classification | Action |
|----------------|---------------|--------|
| `X-RateLimit-Remaining: 0` | `GITHUB_RATE_LIMIT` | Throw retryable error (queue retries with backoff) |
| Body contains `secondary rate limit` | `GITHUB_SECONDARY_RATE_LIMIT` | Throw retryable error |
| Body contains `SSO` or `SAML` | `GITHUB_SSO_REQUIRED` | Record failure reason; skip repo |
| Generic 403, contributors endpoint | `GITHUB_FORBIDDEN` | Allow empty result with explicit log |
| Generic 403, commits/PRs endpoint | `GITHUB_FORBIDDEN` | Throw retryable error; do NOT silently return `[]` |

Record failure reason in `ingestion_failure_reason` when the developer cannot be ingested at all. Log classified errors with enough context for aggregation.

**Acceptance Criteria:**
- [ ] `403` on a commits endpoint throws a retryable error, not an empty list
- [ ] `403` on a contributors endpoint logs `GITHUB_FORBIDDEN` and returns empty (expected behavior)
- [ ] Rate-limit responses trigger retry path via classified error, not silent empty

---

### Deliverable 6 — Commit detail patch/diff fallback

**File:** `src/ingestion/durable-object.ts` (or wherever commit detail is fetched)

When GitHub API commit detail fetch fails for a specific SHA:

1. Attempt: `fetch('https://github.com/<owner>/<repo>/commit/<sha>.patch')`
2. Parse to extract:
   - list of changed file paths
   - additions/deletions approximation (from `+++`/`---` diff lines)
   - test/doc/language heuristics by file extension and path

If fallback also fails, skip that commit but log `PATCH_FALLBACK_FAILED` with the SHA.

**Acceptance Criteria:**
- [ ] When GitHub API commit detail fails for a subset of commits, the patch fallback path produces non-empty file-path and additions/deletions signals for at least some of those commits
- [ ] `PATCH_FALLBACK_USED` is logged per commit where fallback was used

---

### Deliverable 7 — Completeness gating

**Files:** `src/db/queries.ts`, `src/worker.ts`, `src/ingestion/durable-object.ts`

#### Gate 1 — No `complete` without data

Before marking a developer `complete`, check the minimum completeness threshold:
- contributions >= 5, OR
- any score dimension > 0, OR
- domains_count >= 1

If the check fails:
- Do NOT set `complete`.
- Set `failed` and write `ingestion_failure_reason = 'LEGIT_EMPTY'` if the developer has genuinely no accessible public work.
- Otherwise leave `pending` for retry.

#### Gate 2 — No Vectorize upsert for empty profiles

Do not call the Vectorize upsert unless the developer meets the minimum completeness threshold.

#### Gate 3 — Query-time search filtering

Add SQL filter to public search queries:

```sql
AND (d.overall_impact > 0 OR EXISTS (
  SELECT 1 FROM contributions c WHERE c.developer_id = d.id
))
```

**Acceptance Criteria:**
- [ ] No developer is `complete` while `contributions = 0` unless `ingestion_failure_reason` is an explicit terminal reason
- [ ] Public search results never include developers below the minimum completeness threshold
- [ ] Vectorize does not receive vectors for empty profiles

---

### Deliverable 8 — Repo metadata correctness

**File:** `src/ingestion/durable-object.ts` (repo upsert path)

Do not overwrite non-empty repo fields with placeholders:
- Never clobber `stars`, `topics`, `description`, `language` with `0`, `[]`, or `null` if a real value already exists.
- Prefer discovery-provided metadata or a single `GET /repos/{owner}/{repo}` fetch once per repo.
- Update only fields that are currently empty/null.

**Acceptance Criteria:**
- [ ] A repo that was previously ingested with real metadata retains that metadata after re-ingestion
- [ ] Repos discovered via the pipeline have populated `language` and `topics` where the GitHub API provides them

---

## Repair + Reingestion

### Targeted repair — broken-complete developers (Bucket C)

For each broken-complete developer (status `complete`, zero contributions):

1. Delete dependent rows:
   ```sql
   DELETE FROM contributions WHERE developer_id = ?;
   DELETE FROM reviews WHERE developer_id = ?;
   DELETE FROM developer_domains WHERE developer_id = ?;
   ```
2. Reset developer row — set score columns to NULL, `ingestion_status = 'pending'`, clear `ingestion_failure_reason`, `ingestion_last_error`.
3. Delete Vectorize vector: `dev-<developerId>`.
4. Enqueue ingestion: `POST /admin/ingest { "username": "..." }`.

This can be exposed as `POST /admin/repair-broken-complete` with an optional `dry_run=true` query param that returns the list without executing.

### Full reingest (controlled)

When ready to reingest the full dataset after all pipeline fixes are deployed:

- Batch size: 50–100 usernames per wave.
- Concurrency cap: configurable via env var (start at 10).
- Retry/backoff: based on GitHub `X-RateLimit-Reset` timestamps; avoid retry spirals.
- Pause/resume: supported via an admin flag or environment variable.
- Monitor broken-complete count query continuously; it should trend toward 0.

---

## Operator Runbook

### Safety
- Do NOT paste Cloudflare tokens into chat or logs.
- Use least-privilege API tokens.
- Prefer `dry_run=true` queries before any destructive operation.

### Prerequisites

```
CLOUDFLARE_ACCOUNT_ID — required for some wrangler commands
CLOUDFLARE_API_TOKEN  — required for wrangler d1 execute --remote
```

D1 binding: `wdtw-db` (id: `d41850db-e514-4155-82d4-bf184c89d8e6` per `wrangler.jsonc`).

---

### Step 0 — Read-only health check

```bash
curl https://<worker-url>/admin/stats
```

If `developers` count is high but `contributions` count is low, ingestion is failing.

---

### Step 1 — Identify current stuck state

```bash
# Count by bucket
npx wrangler d1 execute wdtw-db --remote --command "
SELECT
  SUM(CASE WHEN ingestion_status = 'in_progress' AND scored_at IS NOT NULL AND overall_impact IS NOT NULL THEN 1 ELSE 0 END) AS bucket_a,
  SUM(CASE WHEN ingestion_status = 'in_progress' AND scored_at IS NOT NULL AND overall_impact IS NULL THEN 1 ELSE 0 END) AS bucket_b,
  SUM(CASE WHEN ingestion_status = 'complete' THEN 1 ELSE 0 END) AS complete_count,
  SUM(CASE WHEN ingestion_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
FROM developers WHERE opted_out = 0;
"
```

---

### Step 2 — Identify broken-complete developers

```bash
# List them
npx wrangler d1 execute wdtw-db --remote --command "
SELECT d.username, d.id, d.ingestion_status, d.overall_impact, COUNT(c.id) AS contribs
FROM developers d
LEFT JOIN contributions c ON c.developer_id = d.id
WHERE d.opted_out = 0 AND d.ingestion_status = 'complete'
GROUP BY d.id
HAVING contribs = 0
ORDER BY d.last_ingested_at DESC
LIMIT 200;
"

# Count them
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

---

### Step 3 — Deploy pipeline fixes (Deliverables 2–8)

Deploy the worker with all pipeline fixes before running any heal operations. This ensures no new bad state is created during repair.

---

### Step 4 — Run `/admin/unstick` (Buckets A + B)

```bash
curl -X POST https://<worker-url>/admin/unstick \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

Expected: `{ "bucket_a_fixed": 49, "bucket_b_requeued": 2 }`

Wait for queue to drain. Verify:

```bash
npx wrangler d1 execute wdtw-db --remote --command "
SELECT ingestion_status, COUNT(*) FROM developers WHERE opted_out = 0 GROUP BY ingestion_status;
"
```

---

### Step 5 — Targeted repair for broken-complete (Bucket C)

Dry run first:

```bash
curl "https://<worker-url>/admin/repair-broken-complete?dry_run=true" \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

Execute:

```bash
curl -X POST https://<worker-url>/admin/repair-broken-complete \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

Wait for queue to drain. Verify each repaired username has `contributions > 0` OR an explicit `ingestion_failure_reason`.

---

### Step 6 — Rebuild scores and vectors

If any developers have contributions but stale scores/vectors:

```bash
curl -X POST https://<worker-url>/admin/reindex \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

---

### Step 7 — Post-run audit

```bash
# Should return 0 (or only explicit LEGIT_EMPTY terminal reasons)
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

Run a few `/api/search` queries. All results must have non-zero score or non-empty domains.

---

## Observability

Add/ensure the following counters and logs:

| Signal | Where |
|--------|-------|
| Per-developer ingestion summary (repos discovered, dispatched, completed, contributions inserted, reviews inserted) | End of DO completion handler |
| Failure reason distribution by day | Logged with `ingestion_failure_reason` |
| `PATCH_FALLBACK_USED` count | Per commit where patch path was used |
| `PATCH_FALLBACK_FAILED` count | Per commit where both paths failed |
| `GITHUB_RATE_LIMIT` / `GITHUB_SECONDARY_RATE_LIMIT` events | Logged at classification point |
| Unauthenticated fallback tier used (`GETUSER_PUBLIC_FALLBACK`) | Logged in `ingestDeveloper` |

---

## Files Touched

| File | Changes |
|------|---------|
| `src/worker.ts` | Deliverable 2: `complete` safety net at `build_vectors` end |
| `src/api/router.ts` | Deliverables 1, 5: `/admin/unstick`, `/admin/repair-broken-complete` |
| `src/db/queries.ts` | Deliverables 1, 3: timestamp semantics, new column writes |
| `src/ingestion/github-client.ts` | Deliverables 4, 5: `getUserPublic`, 403 classification |
| `src/ingestion/durable-object.ts` | Deliverables 3, 6, 7, 8: `since` fix, patch fallback, completeness gate, metadata clobber fix |
| Migration file (new) | Deliverable 3: `ingestion_started_at`, `ingestion_failure_reason`, `ingestion_last_error`, `ingestion_attempt_count` |

---

## Rollout Order

1. **Deliverable 2** (worker safety net — 2 lines, lowest risk, stops new stuck records immediately)
2. **Deliverable 3** (timestamp semantics — stops empty `complete` bug for all future ingestions)
3. **Deploy + run `/admin/unstick`** (heals the 51 stuck developers in production)
4. **Deliverable 4** (unauthenticated fallback — stops blank card problem under rate limits)
5. **Deliverable 5** (403 classification — stops silent empty ingestions)
6. **Deliverable 6** (patch fallback — improves data recovery for rate-limited commits)
7. **Deliverable 7** (completeness gating — hardens the `complete` contract)
8. **Deliverable 8** (metadata correctness — improves signal quality)
9. **Run `/admin/repair-broken-complete`** (heals Bucket C — broken-complete devs)
10. **Full reingest** (batched, after all fixes are stable)
11. **Post-run audit**

---

## Acceptance Criteria (Full)

### Correctness
- [ ] `last_ingested_at` is updated only on successful completion, not on `in_progress` start
- [ ] First-time ingestion for a developer with accessible public repos results in `contributions > 0`
- [ ] No developer is `complete` while `contributions = 0`, unless `ingestion_failure_reason` is an explicit terminal reason

### Immediate heal
- [ ] After `/admin/unstick`, zero developers remain with `ingestion_status = 'in_progress'` and a non-null `scored_at`
- [ ] After targeted repair, broken-complete count query returns 0 (or only explicit `LEGIT_EMPTY` entries)

### Search integrity
- [ ] Public search results never include developers below the minimum completeness threshold
- [ ] Vectorize does not receive vectors for empty profiles

### Resilience
- [ ] Rate-limited `getUser()` still results in a developer row in D1
- [ ] `403` on commits endpoints throws a retryable error, not an empty list
- [ ] Patch fallback produces non-empty file-path signals when GitHub API commit detail fails

---

## Open Question

**Repo discovery expansion** (beyond `type=owner`):
- **Option A:** Discover "contributed repos" via public events (no private scopes required; usually captures real work) ← **recommended default**
- **Option B:** Discover collaborator repos (requires private scope)

Default: Option A.
