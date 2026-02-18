# Spec 10 — DATA-FIX-B: Database Heal, Ingestion Unstick & Rate Limit Fallback

**Status:** Not Started
**Blocks:** Nothing downstream — but unblocks demo quality (removes "INDEXING" from all scored developers)
**Blocked By:** Nothing (all prereqs are deployed)
**Parallelizable with:** Nothing — this is a hotfix track
**Estimated effort:** 3–4 hours

---

## Objective

Three closely related fixes:

1. **Immediate DB heal** — 51 of 66 developers are stuck `in_progress` despite having valid scores. Flip them to `complete` via a one-shot admin endpoint.
2. **Pipeline completion fix** — a single 2-line change so future ingestions never get stuck in this state again.
3. **Rate limit fallback** — add an unauthenticated public-API tier to `GitHubClient` so that when the GitHub token is exhausted, developer shells still get written to D1 (stopping the blank-INDEXING problem at its source).

---

## Current DB State (Diagnosed 2026-02-18)

```
ingestion_status = complete    →  15 developers
ingestion_status = in_progress →  51 developers  ← stuck
```

**Reviews table:** Only 3 of 66 developers have any review data.

### Root Cause

`ingestion_status` is set to `complete` exclusively inside the Durable Object's
`onRepoComplete()` handler, which fires only when:

```
repos_completed (DO storage counter) >= repos_dispatched (DO storage counter)
```

When `analyze_repo` queue messages exhausted their 3-retry DLQ limit (rate limits),
the counter never reached the target → DO never fired completion → status stuck.

A later `compute_scores: 'all'` run (cron or manual) scored those developers correctly
but the cron path bypasses the DO entirely, so status was never updated.

**Result:** Developers have valid `scored_at`, `overall_impact`, etc. in D1 but show
`in_progress` permanently.

---

## Affected Buckets

| Bucket | SQL Condition | ~Count | Action |
|--------|--------------|--------|--------|
| **A** | `ingestion_status = 'in_progress' AND scored_at IS NOT NULL AND overall_impact IS NOT NULL` | 49 | Flip to `complete` |
| **B** | `ingestion_status = 'in_progress' AND scored_at IS NOT NULL AND overall_impact IS NULL` | 2 (`torvalds`, `ronaldstoner`) | Re-queue `compute_scores` |
| **C** | `ingestion_status = 'complete' AND overall_impact = 0` | ~5 | Leave as-is; may genuinely have no accessible public work |

---

## Deliverable 1 — `POST /admin/unstick` endpoint

**File:** `src/api/router.ts` + `src/db/queries.ts`

### Behavior

1. Run the Bucket A SQL update:
   ```sql
   UPDATE developers
   SET ingestion_status = 'complete'
   WHERE ingestion_status = 'in_progress'
     AND scored_at IS NOT NULL
     AND overall_impact IS NOT NULL
   ```
2. Fetch Bucket B developers:
   ```sql
   SELECT id FROM developers
   WHERE ingestion_status = 'in_progress'
     AND scored_at IS NOT NULL
     AND overall_impact IS NULL
   ```
3. For each Bucket B developer, send `{ type: 'compute_scores', developerId }` to the queue.
4. Return JSON summary: `{ bucket_a_fixed: N, bucket_b_requeued: N }`.

**Idempotent** — safe to call multiple times. Only moves status forward, never backward.
No destructive operations.

### Acceptance Criteria
- [ ] After calling `POST /admin/unstick`, zero developers remain with `ingestion_status = 'in_progress'` and a non-null `scored_at`
- [ ] Bucket A developers' score fields are untouched
- [ ] Bucket B developers get `compute_scores` messages queued

---

## Deliverable 2 — Pipeline completion safety net

**File:** `src/worker.ts`

### Change

At the end of the `build_vectors` handler, after `buildVectorsForDeveloper` succeeds, add:

```ts
await queries.setIngestionStatus(payload.developerId, 'complete');
```

`build_vectors` is the last step of the pipeline. Setting status here means the pipeline
has a guaranteed terminal `complete` transition independent of the DO's counter logic.
If the DO path succeeds first, this is a no-op write. If it fails (rate limits, DLQ
exhaustion), this catches it.

### Acceptance Criteria
- [ ] A developer ingested end-to-end after this change ends up with `ingestion_status = 'complete'`
- [ ] No developer with a successful `build_vectors` run remains `in_progress`

---

## Deliverable 3 — Unauthenticated GitHub API fallback tier

**Files:** `src/ingestion/github-client.ts`, `src/ingestion/durable-object.ts`

### Problem

A single `GITHUB_TOKEN` (5,000 req/hr) gets exhausted during concurrent ingestions.
When `getUser()` fails with a rate-limit error at the very start of `ingestDeveloper`,
the developer row is never written to D1. The card shows a blank "INDEXING" state and
the DO retries 3 times before dropping the message.

### Solution: Two-tier fetch

**Tier 1 — Unauthenticated (60 req/hr, no token required):**

Add `GitHubClient.getUserPublic(username)` — a plain `fetch` to
`https://api.github.com/users/{username}` with no `Authorization` header.
Returns the same user shape (`login`, `id`, `name`, `bio`, `avatar_url`, `public_repos`, `followers`).

**Tier 2 — Authenticated (5,000 req/hr, existing token):**

All heavy endpoints unchanged: repo listing, commits, diffs, PRs, reviews.

### Change in `ingestDeveloper`

At the top of `ingestDeveloper`, before the heavy pipeline:

```ts
// Try authenticated first; fall back to public if rate-limited
let user: GitHubUser;
try {
  const { data } = await gh.getUser(username);
  user = data;
} catch (err) {
  if (isRateLimitError(err)) {
    user = await gh.getUserPublic(username);  // unauthenticated fallback
  } else {
    throw err;
  }
}

// Upsert the shell immediately — card is no longer blank while pipeline runs
await this.queries.upsertDeveloper({ id: String(user.id), username: user.login });
await this.queries.setIngestionStatus(String(user.id), 'in_progress');

// If we only got public data, still queue the full pipeline — it will authenticate
// normally since rate limit windows reset every hour
```

This guarantees D1 always gets a developer row even if the token is exhausted.
The heavy pipeline (commits, PRs, reviews) still needs the token and will use queue
retry/backoff when rate-limited — but the user is at least visible in the UI.

### Acceptance Criteria
- [ ] `getUserPublic('torvalds')` returns a valid user object without a GitHub token
- [ ] When `GITHUB_TOKEN` is rate-limited at `getUser()` time, `ingestDeveloper` still upserts the developer row with `ingestion_status = 'in_progress'`
- [ ] No change to authenticated behavior when token is healthy

---

## What's Out of Scope for DATA-FIX-B

| Item | Why Deferred |
|------|-------------|
| Fixing empty review data for existing developers | Requires re-fetching PRs per repo — high API cost. Do via targeted `POST /admin/ingest` per user after rate-limit fallback is in. |
| Multi-token rotation | More config complexity than warranted for now. |
| Web scraping GitHub HTML | Fragile. The unauthenticated REST API is identical data, more reliable. |
| Re-ingesting Bucket C (zero-score complete devs) | Low priority — may have no accessible public work. Trigger manually via existing `/admin/ingest`. |
| Fixing missing reviews for already-stuck developers | Separate concern — flip status first, then decide if a re-ingest is worth the token cost. |

---

## Implementation Order

1. **Deliverable 2 first** — the 2-line worker change. Low risk, prevents new stuck records immediately.
2. **Deliverable 1** — the `/admin/unstick` endpoint. Run it once after deploy to heal existing state.
3. **Deliverable 3** — the unauthenticated fallback. Slightly more code but contained to `github-client.ts`.

Total files touched: `src/worker.ts`, `src/api/router.ts`, `src/db/queries.ts`, `src/ingestion/github-client.ts`, `src/ingestion/durable-object.ts`.
