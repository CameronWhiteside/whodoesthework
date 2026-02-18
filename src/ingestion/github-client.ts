// src/ingestion/github-client.ts
// GitHub REST API client. All responses validated with Zod schemas.
import { GITHUB_API_BASE, GITHUB_PER_PAGE } from '../shared/constants';
import {
  githubUserSchema,
  githubRepoSchema,
  githubCommitSchema,
  githubCommitDetailSchema,
  githubPRSchema,
  githubReviewSchema,
  githubPRCommentSchema,
  githubContributorSchema,
  githubSearchResultSchema,
  type GitHubUser,
  type GitHubRepo,
  type GitHubCommit,
  type GitHubCommitDetail,
  type GitHubPR,
  type GitHubReview,
  type GitHubPRComment,
  type GitHubContributor,
} from '../schemas/github';
import { z } from 'zod';

export interface GitHubRateLimit {
  remaining: number;
  reset: number;
}

export type GitHubSearchResult<T> = {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
};

export class GitHubClient {
  private rateLimitRemaining = 5000;
  private rateLimitReset = 0;

  constructor(private readonly token: string) {}

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
  ): Promise<{ data: T; rateLimit: GitHubRateLimit }> {
    // Back off if we're close to the rate limit
    if (this.rateLimitRemaining < 100) {
      const waitMs = this.rateLimitReset * 1000 - Date.now() + 1000;
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, Math.min(waitMs, 60_000)));
      }
    }

    const res = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'whodoesthe.work/0.1',
      },
    });

    this.rateLimitRemaining = parseInt(
      res.headers.get('X-RateLimit-Remaining') ?? '5000',
      10,
    );
    this.rateLimitReset = parseInt(
      res.headers.get('X-RateLimit-Reset') ?? '0',
      10,
    );

    if (res.status === 403 && this.rateLimitRemaining === 0) {
      throw new Error(
        `GitHub rate limit exceeded. Resets at ${new Date(this.rateLimitReset * 1000).toISOString()}`,
      );
    }

    if (!res.ok) {
      throw new Error(`GitHub API ${path} → ${res.status}`);
    }

    const json = await res.json();
    const data = schema.parse(json);
    return { data, rateLimit: this.getRateLimit() };
  }

  /** Classify a 403 response body into a machine-readable reason code. */
  private async classify403(res: Response): Promise<string> {
    let body = '';
    try { body = await res.clone().text(); } catch { /* ignore */ }
    if (this.rateLimitRemaining === 0) return 'GITHUB_RATE_LIMIT';
    if (/secondary rate limit/i.test(body)) return 'GITHUB_SECONDARY_RATE_LIMIT';
    if (/SSO|SAML|single sign-on/i.test(body)) return 'GITHUB_SSO_REQUIRED';
    return 'GITHUB_FORBIDDEN';
  }

  /** Returns true when the error is one the queue should retry (rate limits). */
  static isRetryable403(reason: string): boolean {
    return reason === 'GITHUB_RATE_LIMIT' || reason === 'GITHUB_SECONDARY_RATE_LIMIT';
  }

  /** Returns true when the error means "too big to list" (expected for contributors). */
  private static isExpectedForbidden(reason: string, path: string): boolean {
    return reason === 'GITHUB_FORBIDDEN' && path.includes('/contributors');
  }

  /** Handle 404 gracefully for list endpoints — returns empty array.
   *  403 handling is now classified:
   *  - GITHUB_RATE_LIMIT / GITHUB_SECONDARY_RATE_LIMIT → throw retryable error
   *  - GITHUB_SSO_REQUIRED → skip (throw non-retryable)
   *  - GITHUB_FORBIDDEN on contributors → allow empty (repo too large)
   *  - GITHUB_FORBIDDEN on commits/PRs → throw retryable (prevents silent empty ingestions)
   */
  private async requestList<T>(
    path: string,
    itemSchema: z.ZodType<T>,
  ): Promise<{ data: T[]; rateLimit: GitHubRateLimit }> {
    if (this.rateLimitRemaining < 100) {
      const waitMs = this.rateLimitReset * 1000 - Date.now() + 1000;
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, Math.min(waitMs, 60_000)));
      }
    }

    const res = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'whodoesthe.work/0.1',
      },
    });

    this.rateLimitRemaining = parseInt(
      res.headers.get('X-RateLimit-Remaining') ?? '5000',
      10,
    );
    this.rateLimitReset = parseInt(
      res.headers.get('X-RateLimit-Reset') ?? '0',
      10,
    );

    if (res.status === 404) {
      return { data: [], rateLimit: this.getRateLimit() };
    }

    if (res.status === 403) {
      const reason = await this.classify403(res);
      console.warn(`[github-client] 403 on ${path}: ${reason}`);

      if (reason === 'GITHUB_RATE_LIMIT') {
        throw new Error(
          `GitHub rate limit exceeded. Resets at ${new Date(this.rateLimitReset * 1000).toISOString()}`,
        );
      }
      if (reason === 'GITHUB_SECONDARY_RATE_LIMIT') {
        throw new Error(
          `GitHub secondary rate limit hit on ${path}. Resets at ${new Date(this.rateLimitReset * 1000).toISOString()}`,
        );
      }
      if (reason === 'GITHUB_SSO_REQUIRED') {
        // SSO-protected repo — not retryable, skip silently
        return { data: [], rateLimit: this.getRateLimit() };
      }
      // GITHUB_FORBIDDEN: allow empty only for contributors (repo too large to list).
      // For commits/PRs this would produce silent empty ingestions — throw instead.
      if (GitHubClient.isExpectedForbidden(reason, path)) {
        return { data: [], rateLimit: this.getRateLimit() };
      }
      throw new Error(`GitHub API ${path} → 403 ${reason}`);
    }

    if (!res.ok) {
      throw new Error(`GitHub API ${path} → ${res.status}`);
    }

    const json = await res.json();
    const data = z.array(itemSchema).parse(json);
    return { data, rateLimit: this.getRateLimit() };
  }

  getRateLimit(): GitHubRateLimit {
    return { remaining: this.rateLimitRemaining, reset: this.rateLimitReset };
  }

  // ── User ──────────────────────────────────────────────────────────────────

  async getUser(username: string): Promise<{ data: GitHubUser; rateLimit: GitHubRateLimit }> {
    return this.request(`/users/${username}`, githubUserSchema);
  }

  /** Unauthenticated fallback — 60 req/hr, no token needed.
   *  Use when the authenticated token is rate-limited at getUser() time so we
   *  can still write the developer shell row to D1 before the heavy pipeline runs. */
  async getUserPublic(username: string): Promise<GitHubUser> {
    const res = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'whodoesthe.work/0.1',
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub public API /users/${username} → ${res.status}`);
    }
    return githubUserSchema.parse(await res.json());
  }

  // ── Repos ─────────────────────────────────────────────────────────────────

  async getUserRepos(
    username: string,
    page: number = 1,
  ): Promise<{ data: GitHubRepo[]; rateLimit: GitHubRateLimit }> {
    return this.requestList(
      `/users/${username}/repos?type=owner&sort=pushed&per_page=${GITHUB_PER_PAGE}&page=${page}`,
      githubRepoSchema,
    );
  }

  async getContributors(
    repoFullName: string,
    page: number = 1,
  ): Promise<{ data: GitHubContributor[]; rateLimit: GitHubRateLimit }> {
    return this.requestList(
      `/repos/${repoFullName}/contributors?per_page=${GITHUB_PER_PAGE}&page=${page}`,
      githubContributorSchema,
    );
  }

  // ── Commits ───────────────────────────────────────────────────────────────

  async getCommits(
    repoFullName: string,
    authorLogin: string,
    page: number = 1,
    since?: string,
  ): Promise<{ data: GitHubCommit[]; rateLimit: GitHubRateLimit }> {
    let path = `/repos/${repoFullName}/commits?author=${encodeURIComponent(authorLogin)}&per_page=${GITHUB_PER_PAGE}&page=${page}`;
    if (since) path += `&since=${since}`;
    return this.requestList(path, githubCommitSchema);
  }

  async getCommitDetail(
    repoFullName: string,
    sha: string,
  ): Promise<{ data: GitHubCommitDetail; rateLimit: GitHubRateLimit }> {
    return this.request(
      `/repos/${repoFullName}/commits/${sha}`,
      githubCommitDetailSchema,
    );
  }

  // ── Pull Requests ─────────────────────────────────────────────────────────

  async getPullRequests(
    repoFullName: string,
    page: number = 1,
    state: string = 'all',
  ): Promise<{ data: GitHubPR[]; rateLimit: GitHubRateLimit }> {
    return this.requestList(
      `/repos/${repoFullName}/pulls?state=${state}&per_page=${GITHUB_PER_PAGE}&page=${page}`,
      githubPRSchema,
    );
  }

  async getReviews(
    repoFullName: string,
    prNumber: number,
  ): Promise<{ data: GitHubReview[]; rateLimit: GitHubRateLimit }> {
    return this.requestList(
      `/repos/${repoFullName}/pulls/${prNumber}/reviews`,
      githubReviewSchema,
    );
  }

  async getPRComments(
    repoFullName: string,
    prNumber: number,
  ): Promise<{ data: GitHubPRComment[]; rateLimit: GitHubRateLimit }> {
    return this.requestList(
      `/repos/${repoFullName}/pulls/${prNumber}/comments`,
      githubPRCommentSchema,
    );
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async searchRepos(
    query: string,
    page: number = 1,
  ): Promise<{ data: GitHubSearchResult<GitHubRepo>; rateLimit: GitHubRateLimit }> {
    const schema = githubSearchResultSchema(githubRepoSchema);
    return this.request(
      `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30&page=${page}`,
      schema,
    );
  }

  async searchUsers(
    query: string,
    page: number = 1,
  ): Promise<{ data: GitHubSearchResult<GitHubUser>; rateLimit: GitHubRateLimit }> {
    const schema = githubSearchResultSchema(githubUserSchema);
    return this.request(
      `/search/users?q=${encodeURIComponent(query)}&sort=repositories&per_page=30&page=${page}`,
      schema,
    );
  }
}

/** Returns true if the error is a GitHub rate limit that warrants falling back
 *  to the unauthenticated public API tier. */
export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('rate limit exceeded') ||
    msg.includes('GITHUB_RATE_LIMIT') ||
    msg.includes('secondary rate limit')
  );
}

// Re-export types for convenience
export type {
  GitHubUser,
  GitHubRepo,
  GitHubCommit,
  GitHubCommitDetail,
  GitHubPR,
  GitHubReview,
  GitHubPRComment,
  GitHubContributor,
} from '../schemas/github';
