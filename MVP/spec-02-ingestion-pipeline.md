# Spec 02 — GitHub Ingestion Pipeline + Discovery

**Status:** Not Started
**Blocks:** spec-03 (analysis needs data), spec-05 (scoring needs contributions)
**Blocked By:** spec-00 (types), spec-01 (D1 schema)
**Parallelizable with:** spec-04, spec-06, spec-07 (after spec-00/01 land)
**Estimated effort:** 6-8 hours

---

## Objective

Build the data ingestion pipeline that fetches a developer's public GitHub activity and stores **only computed metrics** in D1. Also build the discovery layer — how we actually find developers and repos worth scoring, since "given a username" isn't a real product.

**No R2.** We fetch commit details from GitHub, analyze them inline during ingestion, and store only the resulting metrics. Raw diffs are not persisted — they can be re-fetched from GitHub via the immutable commit SHA at any time.

---

## Research: Step 0

### R0.1: GitHub Discovery APIs — What's Actually Available?

This is the most important research item. The old spec hand-waved "given a username, ingest." In reality, we need to answer: **how does a recruiter's query like "Rust distributed systems developer" turn into a set of GitHub usernames to score?**

**APIs to evaluate:**

| API | Endpoint | What It Gives Us | Limits |
|---|---|---|---|
| **GitHub Search: Repositories** | `GET /search/repositories?q={query}` | Find repos by topic, language, stars. Returns owner + top contributors. | 30 req/min, 1000 results max |
| **GitHub Search: Users** | `GET /search/users?q={query}` | Find users by language, location, follower count, repo count | 30 req/min, 1000 results max |
| **GitHub Search: Commits** | `GET /search/commits?q={query}` | Find commits by keyword, author, repo, date range | 30 req/min, preview header required |
| **Repo Contributors** | `GET /repos/{owner}/{repo}/contributors` | Ranked list of contributors by commit count for a specific repo | 500 max per repo |
| **Repo Topics** | `GET /repos/{owner}/{repo}/topics` | Topic tags (e.g., "distributed-systems", "raft", "consensus") | Free |
| **GitHub GraphQL** | `POST /graphql` | Batch queries, nested data, fewer round trips | 5000 points/hr |

**Resolution path:**
1. Test each Search API endpoint — what query syntax is supported? Can you search by topic + language + stars?
2. Test contributor listing for a known repo (e.g., `etcd-io/etcd`) — does it give us enough data to seed our pipeline?
3. Evaluate: is GraphQL worth the complexity for MVP, or is REST sufficient?
4. Document the exact query patterns we'll use for the discovery flow.

**Time-box:** 2 hours. This is critical path — the discovery model determines the product.

### R0.2: Agents SDK Durable Object Coexistence

Same as before: verify ingestion DO and MCP DO can coexist. Time-box 30 min.

---

## Discovery Model

### How We Find Developers (Three Entry Points)

**Entry Point 1: Direct Username (Explicit)**

A user asks about a specific developer by username. Simplest case — just ingest that developer.

```
MCP query: "Get me the profile for torvalds"
→ Ingest torvalds directly
```

**Entry Point 2: Repository-Seeded Discovery (Primary for MVP)**

A user describes a skill domain. We find relevant repos via GitHub Search, then extract top contributors from those repos.

```
MCP query: "Find Rust developers with distributed systems experience"
→ GitHub Search: repos with topic:distributed-systems language:Rust stars:>50
→ For each top repo: GET /repos/{repo}/contributors → top 10 contributors
→ Ingest and score those developers
```

This is the core discovery loop. It answers: "who is actually building things in this space?"

**Entry Point 3: User Search (Supplement)**

GitHub's User Search can find developers by language and activity, but it's weak on domain specificity. Use as a supplement, not primary.

```
GitHub Search: users with language:rust repos:>5 followers:>10
→ Returns users, but no domain signal
→ Better to find repos first, then extract contributors
```

### Discovery Implementation

Create `src/ingestion/discovery.ts`:

```typescript
// src/ingestion/discovery.ts
import { GitHubClient } from './github-client';

export interface DiscoveryQuery {
  domains: string[];       // e.g., ["distributed-systems", "consensus"]
  languages: string[];     // e.g., ["rust", "go"]
  minStars: number;        // repo star threshold
  maxDevelopers: number;   // cap on how many developers to discover
}

// Maps domain keywords to GitHub Search queries.
// GitHub repo topics and search terms don't always match our domain taxonomy.
const DOMAIN_SEARCH_TERMS: Record<string, string[]> = {
  'distributed-systems': ['distributed-systems', 'raft', 'consensus', 'paxos', 'distributed'],
  'networking': ['networking', 'tcp', 'http', 'grpc', 'protocol'],
  'databases': ['database', 'sql', 'nosql', 'storage-engine', 'query-engine'],
  'frontend-react': ['react', 'nextjs', 'react-hooks', 'react-components'],
  'ml-infrastructure': ['machine-learning', 'mlops', 'ml-pipeline', 'feature-store'],
  'fintech': ['fintech', 'payments', 'banking', 'trading'],
  'kubernetes': ['kubernetes', 'k8s', 'operator', 'controller'],
  'security': ['security', 'cryptography', 'authentication', 'zero-trust'],
  'cli-tools': ['cli', 'command-line', 'terminal'],
  'compiler-design': ['compiler', 'parser', 'ast', 'language-design'],
};

/**
 * Discover developers by finding relevant repos and extracting contributors.
 * Returns a deduplicated list of GitHub usernames to ingest.
 */
export async function discoverDevelopers(
  gh: GitHubClient,
  query: DiscoveryQuery
): Promise<string[]> {
  const repos = await findRelevantRepos(gh, query);
  const developers = await extractContributors(gh, repos, query.maxDevelopers);
  return developers;
}

async function findRelevantRepos(
  gh: GitHubClient,
  query: DiscoveryQuery
): Promise<string[]> {
  const repos = new Set<string>();

  // Build GitHub Search query
  // Example: "topic:distributed-systems language:rust stars:>50"
  for (const domain of query.domains) {
    const searchTerms = DOMAIN_SEARCH_TERMS[domain] ?? [domain];

    for (const term of searchTerms.slice(0, 2)) { // limit queries per domain
      const parts: string[] = [];
      parts.push(`topic:${term}`);
      for (const lang of query.languages) {
        parts.push(`language:${lang}`);
      }
      parts.push(`stars:>=${query.minStars}`);

      const searchQuery = parts.join(' ');
      const { data } = await gh.searchRepos(searchQuery, 1);

      for (const repo of data.items?.slice(0, 10) ?? []) {
        repos.add(repo.full_name);
      }
    }
  }

  // Also try keyword search in repo name/description
  for (const domain of query.domains) {
    const terms = DOMAIN_SEARCH_TERMS[domain] ?? [domain];
    const langFilter = query.languages.map(l => `language:${l}`).join(' ');
    const searchQuery = `${terms[0]} ${langFilter} stars:>=${query.minStars}`;

    const { data } = await gh.searchRepos(searchQuery, 1);
    for (const repo of data.items?.slice(0, 10) ?? []) {
      repos.add(repo.full_name);
    }
  }

  return [...repos];
}

async function extractContributors(
  gh: GitHubClient,
  repos: string[],
  maxDevelopers: number
): Promise<string[]> {
  const developerCounts = new Map<string, number>(); // username → number of repos they appear in

  for (const repoFullName of repos) {
    const { data: contributors } = await gh.getRepoContributors(repoFullName);

    for (const contributor of contributors.slice(0, 15)) {
      if (contributor.type !== 'User') continue; // skip bots
      const count = developerCounts.get(contributor.login) ?? 0;
      developerCounts.set(contributor.login, count + 1);
    }
  }

  // Rank by how many relevant repos they contribute to
  // Developers who appear across multiple relevant repos are more likely to be
  // genuine domain experts vs. one-off contributors
  return [...developerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxDevelopers)
    .map(([username]) => username);
}
```

---

## Execution Steps

### Step 1: GitHub API Client

Create `src/ingestion/github-client.ts` — typed, rate-limit-aware. **Now includes Search API methods.**

```typescript
// src/ingestion/github-client.ts
import { GITHUB_API_BASE, GITHUB_PER_PAGE } from '../shared/constants';
import {
  githubUserSchema, githubRepoSchema, githubCommitSchema,
  githubCommitDetailSchema, githubPRSchema, githubReviewSchema,
  githubPRCommentSchema, githubContributorSchema, githubSearchResultSchema,
  type GitHubUser, type GitHubRepo, type GitHubCommit,
  type GitHubCommitDetail, type GitHubPR, type GitHubReview,
  type GitHubPRComment, type GitHubContributor,
} from '../schemas/github';
import { z } from 'zod';

export interface GitHubRateLimit {
  remaining: number;
  reset: number;
}

export class GitHubClient {
  private rateLimitRemaining = 5000;
  private rateLimitReset = 0;

  constructor(private token: string) {}

  private async request<T>(path: string, accept?: string): Promise<{ data: T; rateLimit: GitHubRateLimit }> {
    if (this.rateLimitRemaining < 100) {
      const waitMs = (this.rateLimitReset * 1000) - Date.now() + 1000;
      if (waitMs > 0) await new Promise(r => setTimeout(r, Math.min(waitMs, 60_000)));
    }

    const resp = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': accept ?? 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'whodoesthe.work/0.1.0',
      },
    });

    this.rateLimitRemaining = parseInt(resp.headers.get('X-RateLimit-Remaining') ?? '5000');
    this.rateLimitReset = parseInt(resp.headers.get('X-RateLimit-Reset') ?? '0');

    if (resp.status === 404) return { data: (Array.isArray(undefined) ? [] : {}) as T, rateLimit: this.getRateLimit() };
    if (resp.status === 403 && this.rateLimitRemaining === 0) {
      throw new Error(`GitHub rate limit exceeded. Resets at ${new Date(this.rateLimitReset * 1000).toISOString()}`);
    }
    if (!resp.ok) throw new Error(`GitHub API ${resp.status} on ${path}`);

    // Parse response. The caller is responsible for passing a Zod schema
    // for runtime validation at this boundary. For MVP, we use `as T` with
    // Zod validation in the calling code where it matters (commit details).
    return { data: await resp.json() as T, rateLimit: this.getRateLimit() };
  }

  getRateLimit(): GitHubRateLimit {
    return { remaining: this.rateLimitRemaining, reset: this.rateLimitReset };
  }

  // -- Search APIs (30 req/min separate rate limit) --

  async searchRepos(query: string, page: number = 1) {
    return this.request<GitHubSearchResult<GitHubRepo>>(
      `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30&page=${page}`
    );
  }

  async searchUsers(query: string, page: number = 1) {
    return this.request<GitHubSearchResult<GitHubUser>>(
      `/search/users?q=${encodeURIComponent(query)}&sort=repositories&per_page=30&page=${page}`
    );
  }

  // -- User --
  async getUser(username: string) {
    return this.request<GitHubUser>(`/users/${username}`);
  }

  // -- Repos --
  async getUserRepos(username: string, page: number = 1) {
    return this.request<GitHubRepo[]>(
      `/users/${username}/repos?type=owner&sort=pushed&per_page=${GITHUB_PER_PAGE}&page=${page}`
    );
  }

  async getRepoContributors(repoFullName: string, page: number = 1) {
    return this.request<GitHubContributor[]>(
      `/repos/${repoFullName}/contributors?per_page=${GITHUB_PER_PAGE}&page=${page}`
    );
  }

  async getRepoTopics(repoFullName: string) {
    return this.request<{ names: string[] }>(
      `/repos/${repoFullName}/topics`
    );
  }

  // -- Commits --
  async getRepoCommits(repoFullName: string, author: string, page: number = 1, since?: string) {
    let path = `/repos/${repoFullName}/commits?author=${author}&per_page=${GITHUB_PER_PAGE}&page=${page}`;
    if (since) path += `&since=${since}`;
    return this.request<GitHubCommit[]>(path);
  }

  // Get commit detail with file-level stats and patches.
  // This is the ONLY place we see diffs — we analyze inline and discard.
  async getCommitDetail(repoFullName: string, sha: string) {
    return this.request<GitHubCommitDetail>(`/repos/${repoFullName}/commits/${sha}`);
  }

  // -- PRs & Reviews --
  async getRepoPRs(repoFullName: string, state: string = 'all', page: number = 1) {
    return this.request<GitHubPR[]>(
      `/repos/${repoFullName}/pulls?state=${state}&per_page=${GITHUB_PER_PAGE}&page=${page}`
    );
  }

  async getPRReviews(repoFullName: string, prNumber: number) {
    return this.request<GitHubReview[]>(
      `/repos/${repoFullName}/pulls/${prNumber}/reviews`
    );
  }

  async getPRComments(repoFullName: string, prNumber: number) {
    return this.request<GitHubPRComment[]>(
      `/repos/${repoFullName}/pulls/${prNumber}/comments`
    );
  }
}

// -- Types --
// All types imported from '../schemas/github' (Zod inferred).
// No hand-written interfaces. GitHub API responses are validated
// with schema.parse() at the boundary in the request() method.

// Re-export for convenience
export type {
  GitHubUser, GitHubRepo, GitHubCommit, GitHubCommitDetail,
  GitHubPR, GitHubReview, GitHubPRComment, GitHubContributor,
} from '../schemas/github';
```

### Step 2: Repo Filter

```typescript
// src/ingestion/repo-filter.ts
import { GitHubRepo } from './github-client';

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

export function shouldProcessRepo(repo: GitHubRepo): boolean {
  if (repo.fork) return false;
  const lastPushed = new Date(repo.pushed_at).getTime();
  if (Date.now() - lastPushed > THREE_YEARS_MS) return false;
  return true;
}

export function repoWeight(stars: number, contributorsCount: number | null): number {
  let weight = 1.0;
  if (stars >= 1000) weight *= 1.5;
  else if (stars >= 100) weight *= 1.2;
  else if (stars >= 10) weight *= 1.1;
  const c = contributorsCount ?? 1;
  if (c >= 20) weight *= 1.3;
  else if (c >= 5) weight *= 1.15;
  return weight;
}
```

### Step 3: Durable Object — Ingestion Coordinator

Same structure as before, but **no R2 writes**. The DO fetches repos, dispatches per-repo queue messages, and tracks completion.

Key change in the ingestion DO: the `upsertDeveloper` call is now minimal — just `(id, username)`. All DB access goes through Drizzle via `Queries`:

```typescript
// In startIngestion():
import { createDB } from '../db/client';
import { Queries } from '../db/queries';

const db = new Queries(createDB(this.env.DB));
await db.upsertDeveloper(String(user.id), user.login);
await db.setIngestionStatus(String(user.id), 'in_progress');
```

The rest of the DO is unchanged from the original spec — it manages pagination, dispatches to queues, tracks `reposDispatched` vs `reposCompleted`, and sets alarms.

### Step 4: Queue Consumer — Inline Analysis

This is the biggest change. The `analyze_repo` handler now **fetches commit details from GitHub AND analyzes them inline**, storing only computed metrics in D1. No R2 intermediate storage.

```typescript
// src/ingestion/queue-handler.ts (analyze_repo handler)
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import { queueMessageSchema, type QueueMessage } from '../schemas/queue';

async function handleAnalyzeRepo(
  body: Extract<QueueMessage, { type: 'analyze_repo' }>,
  gh: GitHubClient, queries: Queries, env: Env
): Promise<void> {
  const { developerId, repoFullName } = body;
  const dev = await queries.getDeveloper(developerId);
  if (!dev) return;

  // Fetch repo metadata for weighting
  // (We already have basic repo data from the DO's repo discovery step,
  //  but we may need contributor count)
  const { data: contributors } = await gh.getRepoContributors(repoFullName);

  await queries.upsertRepo(
    repoFullName,
    null,  // language filled from commit analysis
    0,     // stars filled from search results or repo detail if needed
    contributors.length,
    false  // has_tests — updated during commit analysis
  );

  let page = 1;
  let hasMore = true;
  let detectedTests = false;
  const languagesFound = new Set<string>();

  while (hasMore) {
    const { data: commits } = await gh.getRepoCommits(repoFullName, dev.username as string, page);

    for (const commit of commits) {
      if (commit.parents.length > 1) continue; // skip merges

      // Fetch full commit detail (files + patches)
      const { data: detail } = await gh.getCommitDetail(repoFullName, commit.sha);

      // Skip excessively large commits (likely generated/vendored)
      if (detail.stats.total > 10_000) continue;

      // --- INLINE ANALYSIS (replaces R2 → analysis worker flow) ---
      const { analyzeCommitDetail } = await import('../analysis/metrics');
      const metrics = analyzeCommitDetail(detail);

      if (metrics.hasTests) detectedTests = true;
      metrics.languages.forEach(l => languagesFound.add(l));

      // Store ONLY the computed metrics — not the raw diff
      const messageHead = commit.commit.message.slice(0, 120);

      await queries.insertContribution(
        commit.sha, developerId, repoFullName,
        commit.commit.author.date, messageHead,
        detail.stats.additions, detail.stats.deletions,
        detail.files.length
      );

      // Write computed metrics via Drizzle
      await queries.setContributionMetrics(
        commit.sha, metrics.complexityDelta, metrics.entropy,
        metrics.testCorrelation, metrics.languages,
      );
    }

    hasMore = commits.length === GITHUB_PER_PAGE;
    page++;
  }

  // Update repo metadata
  if (detectedTests || languagesFound.size > 0) {
    await queries.upsertRepo(repoFullName, [...languagesFound][0] ?? null, 0,
      contributors.length, detectedTests);
  }

  // Fetch reviews (same as before — reviews are already signals-only)
  await fetchAndStoreReviews(gh, queries, env, developerId, repoFullName);

  // Notify DO that this repo is complete
  const doId = env.INGESTION_DO.idFromName(developerId);
  const doStub = env.INGESTION_DO.get(doId);
  await doStub.fetch(new Request('http://do/repo-complete', {
    method: 'POST',
    body: JSON.stringify({ repoFullName }),
  }));
}
```

### Step 5: Wire discovery into the MCP search flow

When `search_developers` is called and we don't have enough scored developers matching the query, we trigger discovery:

```typescript
// In the MCP search_developers tool handler (spec-07):
if (results.length < params.limit) {
  // Not enough scored developers — discover more
  const { discoverDevelopers } = await import('../ingestion/discovery');
  const newUsernames = await discoverDevelopers(gh, {
    domains: params.domains ?? [],
    languages: params.languages ?? [],
    minStars: 50,
    maxDevelopers: 20,
  });

  // Queue ingestion for discovered developers
  for (const username of newUsernames) {
    await env.INGESTION_QUEUE.send({ type: 'ingest_developer', username });
  }

  // Return what we have now + tell the agent more are coming
  output.message = `Found ${results.length} scored developers. Discovered ${newUsernames.length} more — they'll be scored within 15 minutes. Retry for updated results.`;
}
```

### Step 6: Admin endpoints

```typescript
// Ingest a specific developer
POST /admin/ingest { "username": "..." }

// Ingest status
GET /admin/ingest/status/:username

// Discover developers for a domain (for testing the discovery pipeline)
POST /admin/discover { "domains": ["distributed-systems"], "languages": ["rust"], "minStars": 50, "maxDevelopers": 10 }

// System stats
GET /admin/stats
```

### Step 7: Test locally

```bash
npx wrangler dev

# Test direct ingestion
curl -X POST http://localhost:8787/admin/ingest \
  -H 'Content-Type: application/json' \
  -d '{"username": "BurntSushi"}'

# Test discovery
curl -X POST http://localhost:8787/admin/discover \
  -H 'Content-Type: application/json' \
  -d '{"domains": ["cli-tools"], "languages": ["rust"], "minStars": 100, "maxDevelopers": 5}'
```

---

## GitHub API Budget (Revised — No R2)

The inline analysis model uses the same number of GitHub API calls as before — we just don't write to R2 afterward.

For a developer with 20 repos, ~500 commits, ~100 PRs:

| Endpoint | Calls | Notes |
|---|---|---|
| Get user | 1 | |
| List repos | ~1 | Paginated |
| Repo contributors | ~20 | One per repo |
| List commits (per repo) | ~20 | Avg 25 commits |
| Get commit detail | ~500 | One per commit — this is the big one |
| List PRs | ~20 | Per repo |
| PR reviews | ~100 | Per PR |
| PR comments | ~100 | Per PR |
| **Total** | **~762** | Well within 5,000/hr |

Discovery (finding repos + extracting contributors) adds ~20-50 Search API calls, which have a separate 30/min rate limit.

---

## Definition of Done

- [ ] `discoverDevelopers` returns a ranked list of usernames given a domain + language query
- [ ] `POST /admin/ingest` triggers ingestion for a real GitHub user
- [ ] Commits are fetched, analyzed inline, and only computed metrics are stored in D1
- [ ] Reviews are fetched and signals stored in D1
- [ ] **No R2 usage anywhere in the pipeline**
- [ ] `POST /admin/discover` returns discovered developers for a domain query
- [ ] DO tracks progress and marks completion
- [ ] A developer with ~20 repos ingests fully in <15 minutes

## Output Artifacts

- `src/ingestion/github-client.ts` (with Search API methods)
- `src/ingestion/discovery.ts`
- `src/ingestion/repo-filter.ts`
- `src/ingestion/durable-object.ts`
- `src/ingestion/queue-handler.ts`
- Updated `src/index.ts`
