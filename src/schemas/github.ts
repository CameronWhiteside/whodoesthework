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
