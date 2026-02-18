// src/experience/scale.ts
import {
  SCALE_CONTRIBUTORS_REF,
  SCALE_RECENT_REPO_CONTRIB_REF,
  SCALE_STARS_REF,
  SCALE_WEIGHT_CONTRIBUTORS,
  SCALE_WEIGHT_RECENT_CONTRIB,
  SCALE_WEIGHT_STARS,
} from '../shared/constants';

export interface RepoScaleSignals {
  repoFullName: string;
  stars: number;
  contributorsCount: number | null;
  recentContribCount12mo: number;
  totalContribCount: number;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function logNorm(value: number, ref: number): number {
  if (value <= 0) return 0;
  return clamp01(Math.log1p(value) / Math.log1p(ref));
}

export function computeRepoScaleScore(signals: RepoScaleSignals): number {
  const starsScore = logNorm(signals.stars, SCALE_STARS_REF) * 100;
  const contribScore = logNorm(signals.contributorsCount ?? 0, SCALE_CONTRIBUTORS_REF) * 100;
  const recentScore = logNorm(signals.recentContribCount12mo, SCALE_RECENT_REPO_CONTRIB_REF) * 100;
  const score =
    starsScore * SCALE_WEIGHT_STARS +
    contribScore * SCALE_WEIGHT_CONTRIBUTORS +
    recentScore * SCALE_WEIGHT_RECENT_CONTRIB;
  return Math.round(score * 100) / 100;
}
