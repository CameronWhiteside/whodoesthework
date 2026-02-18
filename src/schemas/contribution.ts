// src/schemas/contribution.ts
import { z } from 'zod';

export const contributionKind = z.enum(['commit', 'documentation']);

export const contributionType = z.enum([
  'feature', 'bugfix', 'refactor', 'test', 'documentation',
  'infrastructure', 'dependency', 'formatting', 'generated',
]);

export type ContributionKind = z.infer<typeof contributionKind>;
export type ContributionType = z.infer<typeof contributionType>;

// Schema for a contribution row as returned by Drizzle / used in scoring
export const contributionSchema = z.object({
  id: z.string(),                               // commit SHA
  developerId: z.string(),
  repoFullName: z.string(),
  kind: contributionKind,
  contributionType: contributionType.nullable(),
  authoredAt: z.string().datetime(),
  messageHead: z.string().max(120).nullable(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
  complexityDelta: z.number().nullable(),
  entropy: z.number().nonnegative().nullable(),
  testCorrelated: z.number().min(-0.2).max(0.3).nullable(),
  qualityScore: z.number().min(0).max(100).nullable(),
  recencyWeightedScore: z.number().min(0).max(100).nullable(),
  domains: z.array(z.string()),
  languages: z.array(z.string()),
  classified: z.boolean(),
  scored: z.boolean(),
});

export type Contribution = z.infer<typeof contributionSchema>;

export const qualityMetricsSchema = z.object({
  complexityDelta: z.number(),
  entropy: z.number().nonnegative(),
  testCorrelated: z.number(),
  repoWeight: z.number().positive(),
});

export type QualityMetrics = z.infer<typeof qualityMetricsSchema>;
