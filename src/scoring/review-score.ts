// src/scoring/review-score.ts
import {
  REVIEW_SUBSTANTIVE_WEIGHT,
  REVIEW_DEPTH_WEIGHT,
  REVIEW_CHANGE_REQUEST_WEIGHT,
  REVIEW_NOT_RUBBER_STAMP_WEIGHT,
} from '../shared/constants';

interface ReviewRow {
  id: string;
  review_state: string;
  comment_count: number;
  total_comment_length: number;
  references_code_lines: number;    // 0 or 1
  time_to_review_minutes: number | null;
  submitted_at: string;
}

export interface ReviewScoreResult {
  reviewQuality: number;           // 0-100
  substantiveRatio: number;
  avgDepth: number;
  changeRequestRatio: number;
  totalReviews: number;
}

export function computeReviewScore(reviews: ReviewRow[]): ReviewScoreResult {
  if (reviews.length === 0) {
    return { reviewQuality: 0, substantiveRatio: 0, avgDepth: 0, changeRequestRatio: 0, totalReviews: 0 };
  }

  let substantiveCount = 0;
  let changeRequestCount = 0;
  let totalDepth = 0;
  let rubberStampCount = 0;

  for (const review of reviews) {
    // Substantive: has code-line-referencing comments
    if (review.references_code_lines) substantiveCount++;

    // Change requests
    if (review.review_state === 'CHANGES_REQUESTED') changeRequestCount++;

    // Depth: based on comment count and length
    const depthScore = reviewDepth(review);
    totalDepth += depthScore;

    // Rubber-stamp detection
    if (review.review_state === 'APPROVED' && review.comment_count === 0) {
      if (review.time_to_review_minutes !== null && review.time_to_review_minutes < 5) {
        rubberStampCount++;
      }
    }
  }

  const substantiveRatio = substantiveCount / reviews.length;
  const avgDepth = totalDepth / reviews.length;
  const changeRequestRatio = changeRequestCount / reviews.length;
  const rubberStampRatio = rubberStampCount / reviews.length;

  // Weighted composite — weights defined in constants.ts (REVIEW_*_WEIGHT)
  const raw =
    substantiveRatio * REVIEW_SUBSTANTIVE_WEIGHT +
    normalizeDepth(avgDepth) * REVIEW_DEPTH_WEIGHT +
    changeRequestRatio * REVIEW_CHANGE_REQUEST_WEIGHT +
    (1 - rubberStampRatio) * REVIEW_NOT_RUBBER_STAMP_WEIGHT;

  const reviewQuality = Math.max(0, Math.min(100, raw * 100));

  return { reviewQuality, substantiveRatio, avgDepth, changeRequestRatio, totalReviews: reviews.length };
}

function reviewDepth(review: ReviewRow): number {
  // 0-1 scale based on comment count and length
  const countScore = Math.min(1, review.comment_count / 5);    // 5+ comments = max
  const lengthScore = Math.min(1, review.total_comment_length / 500); // 500+ chars = max
  const codeRefBonus = review.references_code_lines ? 0.2 : 0;

  return Math.min(1, (countScore * 0.4 + lengthScore * 0.4 + codeRefBonus));
}

function normalizeDepth(avgDepth: number): number {
  // avgDepth is 0-1, already normalized
  return avgDepth;
}
