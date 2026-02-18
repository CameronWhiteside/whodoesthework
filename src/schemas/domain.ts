// src/schemas/domain.ts
import { z } from 'zod';

export const domainScoreSchema = z.object({
  domain: z.string(),
  score: z.number().min(0).max(100),
  contributionCount: z.number().int().nonnegative(),
  evidenceRepos: z.array(z.string()),
});

export type DomainScore = z.infer<typeof domainScoreSchema>;
