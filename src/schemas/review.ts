// src/schemas/review.ts
import { z } from 'zod';

export const reviewState = z.enum(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED']);

export type ReviewState = z.infer<typeof reviewState>;

export const reviewSchema = z.object({
  id: z.string(),
  developerId: z.string(),
  repoFullName: z.string(),
  prNumber: z.number().int().positive(),
  prAuthorId: z.string().nullable(),
  reviewState,
  commentCount: z.number().int().nonnegative(),
  totalCommentLength: z.number().int().nonnegative(),
  referencesCodeLines: z.boolean(),
  submittedAt: z.string().datetime(),
  depthScore: z.number().min(0).max(100).nullable(),
});

export type Review = z.infer<typeof reviewSchema>;

export const reviewStatsSchema = z.object({
  reviewsGiven: z.number().int().nonnegative(),
  avgReviewDepth: z.number().nonnegative(),
  substantiveReviewRatio: z.number().min(0).max(1),
  changeRequestRatio: z.number().min(0).max(1),
});

export type ReviewStats = z.infer<typeof reviewStatsSchema>;
