// src/schemas/mcp.ts
import { z } from 'zod';
import { TOPIC_MAX_TOPICS_PER_REQUEST } from '../shared/constants';

export const searchDevelopersInputSchema = z.object({
  query: z.string().min(1),
  domains: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  minQualityScore: z.number().min(0).max(100).optional(),
  minReviewScore: z.number().min(0).max(100).optional(),
  requiresDocumentation: z.boolean().optional(),
  activeWithinMonths: z.number().int().positive().optional().default(12),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type SearchDevelopersInput = z.infer<typeof searchDevelopersInputSchema>;

export const developerSummarySchema = z.object({
  githubUsername: z.string(),
  githubUrl: z.string().url(),
  overallImpact: z.number(),
  codeQualityPercentile: z.number(),
  reviewQualityPercentile: z.number(),
  topDomains: z.array(z.object({ domain: z.string(), score: z.number() })),
  topLanguages: z.array(z.object({ language: z.string(), percentage: z.number() })),
  activeReposCount: z.number().int(),
  recentActivity: z.enum(['highly_active', 'active', 'moderate', 'low']),
  matchExplanation: z.string(),
});

export type DeveloperSummary = z.infer<typeof developerSummarySchema>;

export const searchDevelopersOutputSchema = z.object({
  developers: z.array(developerSummarySchema),
  totalMatches: z.number().int().nonnegative(),
  queryInterpretation: z.string(),
});

export type SearchDevelopersOutput = z.infer<typeof searchDevelopersOutputSchema>;

export const getDeveloperProfileInputSchema = z.object({
  githubUsername: z.string().min(1),
  includeEvidence: z.boolean().optional().default(true),
  domains: z.array(z.string()).optional(),
  topics: z.array(z.string().min(1)).max(TOPIC_MAX_TOPICS_PER_REQUEST).optional(),
});

export type GetDeveloperProfileInput = z.infer<typeof getDeveloperProfileInputSchema>;

export const compareDevelopersInputSchema = z.object({
  githubUsernames: z.array(z.string()).min(2).max(5),
  focusDomains: z.array(z.string()).optional(),
});

export type CompareDevelopersInput = z.infer<typeof compareDevelopersInputSchema>;

export const comparisonResultSchema = z.object({
  developers: z.array(z.any()), // uses DeveloperProfile — circular ref handled at runtime
  comparisonSummary: z.string(),
  dimensionRankings: z.array(z.object({
    dimension: z.string(),
    rankedUsernames: z.array(z.string()),
  })),
});

export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
