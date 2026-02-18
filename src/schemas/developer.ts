// src/schemas/developer.ts
import { z } from 'zod';
import { domainScoreSchema } from './domain';

export const ingestionStatus = z.enum(['pending', 'in_progress', 'complete', 'failed']);

export type IngestionStatus = z.infer<typeof ingestionStatus>;

export const developerSchema = z.object({
  id: z.string(),
  username: z.string(),
  lastIngestedAt: z.string().datetime().nullable(),
  ingestionStatus,
  optedOut: z.boolean(),
});

export type Developer = z.infer<typeof developerSchema>;

export const developerScoreSchema = z.object({
  overallImpact: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  reviewQuality: z.number().min(0).max(100),
  documentationQuality: z.number().min(0).max(100),
  collaborationBreadth: z.number().min(0).max(100),
  consistencyScore: z.number().min(0).max(100),
  recentActivityScore: z.number().min(0).max(100),
  scoreVersion: z.string(),
  scoredAt: z.string().datetime(),
});

export type DeveloperScore = z.infer<typeof developerScoreSchema>;

export const developerProfileSchema = developerScoreSchema.extend({
  githubUsername: z.string(),
  githubUrl: z.string().url(),
  domains: z.array(domainScoreSchema),
  topLanguages: z.array(z.object({
    language: z.string(),
    percentage: z.number().int().min(0).max(100),
  })),
  activeReposCount: z.number().int().nonnegative(),
  totalContributions: z.number().int().nonnegative(),
  contributionSpanMonths: z.number().int().nonnegative(),
  evidence: z.object({
    topCommits: z.array(z.object({
      url: z.string().url(),
      description: z.string().max(120),
      qualityScore: z.number().min(0).max(100),
    })),
    topReviews: z.array(z.object({
      url: z.string().url(),
      depthScore: z.number().min(0).max(100),
    })),
  }),

  // Discovery-oriented, evidence-backed summaries.
  discovery: z.object({
    scale: z.object({
      score: z.number().min(0).max(100),
      note: z.string(),
      evidenceRepos: z.array(z.object({
        repoFullName: z.string(),
        stars: z.number().int().min(0),
        contributorsCount: z.number().int().min(0).nullable(),
        recentContribCount12mo: z.number().int().min(0),
        totalContribCount: z.number().int().min(0),
      })),
      evidenceCommits: z.array(z.object({
        url: z.string().url(),
        description: z.string().max(120),
      })),
    }),
    topicExperience: z.array(z.object({
      topic: z.string(),
      score: z.number().min(0).max(1),
      evidenceRepos: z.array(z.object({
        repoFullName: z.string(),
        similarity: z.number(),
        stars: z.number().int().min(0),
        contributorsCount: z.number().int().min(0).nullable(),
        recentContribCount12mo: z.number().int().min(0),
        totalContribCount: z.number().int().min(0),
      })),
      evidenceCommits: z.array(z.object({
        url: z.string().url(),
        description: z.string().max(120),
      })),
    })),
  }).optional(),
});

export type DeveloperProfile = z.infer<typeof developerProfileSchema>;
