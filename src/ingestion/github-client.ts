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

  /** Handle 404 gracefully for list endpoints — returns empty array. */
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

    if (res.status === 403 && this.rateLimitRemaining === 0) {
      throw new Error(
        `GitHub rate limit exceeded. Resets at ${new Date(this.rateLimitReset * 1000).toISOString()}`,
      );
    }

    // GitHub returns 403 (not rate-limit) for repos whose contributor/history
    // list is too large (e.g. torvalds/linux). Treat as empty rather than
    // failing the whole queue message.
    if (res.status === 403) {
      return { data: [], rateLimit: this.getRateLimit() };
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
