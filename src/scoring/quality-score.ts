// src/scoring/quality-score.ts
import {
  CONTRIBUTION_TYPE_WEIGHTS,
  RECENCY_LAMBDA,
  SEU_FILE_COEFF,
  SEU_ENTROPY_COEFF,
  EFFORH_CC_COEFF,
  EFFORH_CENTRALITY_COEFF,
  QUALITY_BASE,
  QUALITY_MAINTAINABLE_WEIGHT,
  QUALITY_TEST_WEIGHT,
  QUALITY_MIN,
  QUALITY_MAX,
  CODE_QUALITY_REF,
} from '../shared/constants';

// Matches columns in the contributions table (spec-01).
// All analysis fields are written by spec-03 analyzeCommitDetail().
interface ContributionRow {
  id: string;
  contribution_type: string | null;
  churn: number | null;
  file_count: number | null;
  normalized_entropy: number | null;    // H ∈ [0,1]
  complexity_delta: number | null;      // signed ΔCC (for maintainableShare)
  complexity_delta_abs: number | null;  // |ΔCC| (for EffortH)
  test_ratio: number | null;            // [0,1] (for QualityH)
  authored_at: string;
}

interface RepoMeta {
  stars: number;
  contributors_count: number | null;
}

export interface ContributionValueResult {
  qualityScore: number;        // normalized ValueH → [0, 100]; stored in D1
  recencyWeighted: number;     // qualityScore × recencyWeight; used in aggregation
}

/**
 * SEU = ln(1+churn) × (1 + SEU_FILE_COEFF × ln(1+F)) × (1 + SEU_ENTROPY_COEFF × H)
 *
 * - Log churn: diminishing returns on raw line count, resists padding
 * - File term: coordination overhead grows sub-linearly with file count
 * - Entropy term: rewards cross-cutting changes over single-file edits
 */
export function computeSEU(churn: number, fileCount: number, normalizedEntropy: number): number {
  const logChurn = Math.log1p(churn);
  const fileMultiplier = 1 + SEU_FILE_COEFF * Math.log1p(fileCount);
  const entropyMultiplier = 1 + SEU_ENTROPY_COEFF * normalizedEntropy;
  return logChurn * fileMultiplier * entropyMultiplier;
}

/**
 * Centrality proxy ∈ [0, 1] — approximates how central the repo is in the
 * dependency graph. MVP proxy: stars (reach) + contributor count (adoption).
 *
 * starScore:    ≥1000 → 0.5,  ≥100 → 0.3,  ≥10 → 0.1,  else 0
 * contribScore: ≥50   → 0.5,  ≥20  → 0.3,  ≥5  → 0.1,  else 0
 * centrality = min(1.0, starScore + contribScore)
 */
export function computeCentralityProxy(stars: number, contributorsCount: number): number {
  const starScore =
    stars >= 1000 ? 0.5 :
    stars >= 100  ? 0.3 :
    stars >= 10   ? 0.1 : 0;

  const contribScore =
    contributorsCount >= 50 ? 0.5 :
    contributorsCount >= 20 ? 0.3 :
    contributorsCount >= 5  ? 0.1 : 0;

  return Math.min(1.0, starScore + contribScore);
}

/**
 * EffortH = SEU × (1 + CC_COEFF × |ΔCC|) × (1 + CENTRALITY_COEFF × centrality)
 *
 * - CC term: complex changes require more cognitive effort
 * - Centrality term: impact amplified when the repo is widely depended on
 */
export function computeEffortH(seu: number, complexityDeltaAbs: number, centrality: number): number {
  const ccMultiplier = 1 + EFFORH_CC_COEFF * complexityDeltaAbs;
  const centralityMultiplier = 1 + EFFORH_CENTRALITY_COEFF * centrality;
  return seu * ccMultiplier * centralityMultiplier;
}

/**
 * QualityH ∈ [QUALITY_MIN, QUALITY_MAX] — a multiplier applied to EffortH.
 *
 *   maintainableShare = max(0, 1 − clamp(complexityDelta, 0, 20) / 20)
 *     → 1.0 when complexity is unchanged or reduced
 *     → 0.0 when +20 or more decision points added
 *
 *   reworkRate: V1 — not yet computable (requires cross-commit analysis).
 *               Always 0. When implemented, it subtracts QUALITY_REWORK_WEIGHT × reworkRate.
 *
 * QualityH = clamp(BASE + W_MAINT × maintShare + W_TEST × testRatio, MIN, MAX)
 */
export function computeQualityH(complexityDelta: number, testRatio: number): number {
  const maintainableShare = Math.max(0, 1 - Math.min(complexityDelta, 20) / 20);
  const raw =
    QUALITY_BASE +
    QUALITY_MAINTAINABLE_WEIGHT * maintainableShare +
    QUALITY_TEST_WEIGHT * testRatio;
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, raw));
}

/**
 * Computes the normalized quality score for a single contribution.
 *
 * ValueH  = EffortH × QualityH × typeWeight
 * score   = min(100, ln(1 + ValueH) / ln(1 + CODE_QUALITY_REF) × 100)
 *
 * Log-scale normalization: a calibrated "strong" contribution scores ~100;
 * small commits score proportionally lower. CODE_QUALITY_REF is the tuning knob.
 */
export function computeContributionValue(
  contrib: ContributionRow,
  repoMeta: RepoMeta | null,
): ContributionValueResult {
  const typeWeight = CONTRIBUTION_TYPE_WEIGHTS[contrib.contribution_type ?? 'feature'] ?? 0.5;
  if (typeWeight === 0) return { qualityScore: 0, recencyWeighted: 0 };

  const churn = contrib.churn ?? 0;
  const fileCount = contrib.file_count ?? 1;
  const normalizedEntropy = contrib.normalized_entropy ?? 0;
  const complexityDeltaAbs = contrib.complexity_delta_abs ?? 0;
  const complexityDelta = contrib.complexity_delta ?? 0;
  const testRatio = contrib.test_ratio ?? 0;

  const seu = computeSEU(churn, fileCount, normalizedEntropy);

  const centrality = repoMeta
    ? computeCentralityProxy(repoMeta.stars, repoMeta.contributors_count ?? 1)
    : 0;

  const effortH = computeEffortH(seu, complexityDeltaAbs, centrality);
  const qualityH = computeQualityH(complexityDelta, testRatio);

  const valueH = effortH * qualityH * typeWeight;

  // Log-scale normalization to [0, 100]
  const qualityScore = Math.min(100, (Math.log1p(valueH) / Math.log1p(CODE_QUALITY_REF)) * 100);

  const monthsAgo = monthsSince(contrib.authored_at);
  const recencyWeight = Math.exp(-RECENCY_LAMBDA * monthsAgo);

  return {
    qualityScore: Math.round(qualityScore * 100) / 100,
    recencyWeighted: Math.round(qualityScore * recencyWeight * 100) / 100,
  };
}

function monthsSince(isoDate: string): number {
  return Math.max(0, (Date.now() - new Date(isoDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
}
