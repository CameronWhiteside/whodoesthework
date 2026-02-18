// src/analysis/metrics.ts
// Core scoring math. Pure functions — no I/O.
// All coefficients imported from src/shared/constants.ts — never hardcoded.

import {
  SEU_FILE_COEFF,
  SEU_ENTROPY_COEFF,
  EFFORH_CC_COEFF,
  EFFORH_CENTRALITY_COEFF,
  QUALITY_BASE,
  QUALITY_MAINTAINABLE_WEIGHT,
  QUALITY_TEST_WEIGHT,
  QUALITY_REWORK_WEIGHT,
  QUALITY_MIN,
  QUALITY_MAX,
  CODE_QUALITY_REF,
  RECENCY_LAMBDA,
  CONTRIBUTION_TYPE_WEIGHTS,
} from '../shared/constants';
import { classifyFile } from './file-classifier';
import { parsePatch } from './diff-parser';
import { computeComplexityDelta, computeEntropy, computeTestCorrelation } from './complexity';

export interface CommitAnalysisResult {
  complexityDelta: number;
  entropy: number;
  testCorrelated: number;
  seu: number;
  effortH: number;
  qualityH: number;
  valueH: number;
  qualityScore: number;   // normalized 0–100
}

/**
 * SEU = ln(1+churn) × (1 + SEU_FILE_COEFF × ln(1+F)) × (1 + SEU_ENTROPY_COEFF × H)
 *
 * Resists gaming:
 *   - log-scale churn → large commits aren't proportionally rewarded
 *   - file coordination overhead via ln(1+F)
 *   - spread bonus for cross-cutting changes via entropy H
 */
export function computeSEU(churn: number, fileCount: number, entropy: number): number {
  const logChurn = Math.log(1 + churn);
  const fileFactor = 1 + SEU_FILE_COEFF * Math.log(1 + fileCount);
  const entropyFactor = 1 + SEU_ENTROPY_COEFF * entropy;
  return logChurn * fileFactor * entropyFactor;
}

/**
 * EffortH = SEU × (1 + EFFORH_CC_COEFF × |ΔCC|) × (1 + EFFORH_CENTRALITY_COEFF × centrality)
 *
 * centrality: 0–1, proxy for repo importance (e.g. derived from stars/forks).
 */
export function computeEffortH(seu: number, complexityDelta: number, centrality: number): number {
  const ccFactor = 1 + EFFORH_CC_COEFF * Math.abs(complexityDelta);
  const centralityFactor = 1 + EFFORH_CENTRALITY_COEFF * centrality;
  return seu * ccFactor * centralityFactor;
}

/**
 * QualityH = clamp(BASE + W_MAINT×maintShare + W_TEST×testRatio − W_REWORK×reworkRate, MIN, MAX)
 *
 * maintShare: 1 if complexityDelta < 0 (commit reduced complexity), else 0.
 * testRatio:  testCorrelated value (already ∈ [-0.2, 0.3]).
 * reworkRate: always 0 in V1 (not yet computed).
 */
export function computeQualityH(complexityDelta: number, testCorrelated: number): number {
  const maintShare = complexityDelta < 0 ? 1 : 0;
  const reworkRate = 0; // V1: not yet computed
  const raw =
    QUALITY_BASE +
    QUALITY_MAINTAINABLE_WEIGHT * maintShare +
    QUALITY_TEST_WEIGHT * testCorrelated -
    QUALITY_REWORK_WEIGHT * reworkRate;
  return Math.max(QUALITY_MIN, Math.min(QUALITY_MAX, raw));
}

/**
 * ValueH = EffortH × QualityH × typeWeight
 *
 * typeWeight comes from CONTRIBUTION_TYPE_WEIGHTS[contributionType].
 * Defaults to 0.5 if the type is not recognized.
 */
export function computeContributionValue(
  effortH: number,
  qualityH: number,
  contributionType: string,
): number {
  const typeWeight = CONTRIBUTION_TYPE_WEIGHTS[contributionType] ?? 0.5;
  return effortH * qualityH * typeWeight;
}

/**
 * qualityScore = min(100, ln(1+valueH) / ln(1+CODE_QUALITY_REF) × 100)
 *
 * Normalized to [0, 100]. Calibrated so that a 300-line feature commit
 * with moderate spread → qualityScore ≈ 50.
 */
export function normalizeToScore(valueH: number): number {
  if (valueH <= 0) return 0;
  const score = (Math.log(1 + valueH) / Math.log(1 + CODE_QUALITY_REF)) * 100;
  return Math.min(100, score);
}

/**
 * recencyWeightedScore = qualityScore × exp(-RECENCY_LAMBDA × monthsAgo)
 *
 * Applies exponential time decay: λ=0.05 → ~78% at 5 months, ~55% at 12 months.
 */
export function applyRecencyDecay(qualityScore: number, monthsAgo: number): number {
  return qualityScore * Math.exp(-RECENCY_LAMBDA * monthsAgo);
}

/**
 * analyzeCommitDetail — main entry point.
 *
 * Given a GitHubCommitDetail and context (centrality, contributionType),
 * computes all intermediate analysis values and returns a CommitAnalysisResult.
 *
 * Steps:
 *  1. Classify each file and compute per-file churn
 *  2. Parse each file's patch for decision points
 *  3. Sum total churn, test churn, file count
 *  4. Compute entropy from per-file churn sizes
 *  5. Sum complexity deltas across all files
 *  6. Compute testCorrelated signal
 *  7. SEU → EffortH → QualityH → ValueH → qualityScore
 */
export function analyzeCommitDetail(
  detail: import('../schemas/github').GitHubCommitDetail,
  context: { centrality: number; contributionType: string },
): CommitAnalysisResult {
  const files = detail.files;

  // Per-file churn and classification
  const fileSizes: number[] = [];
  let totalChurn = 0;
  let testChurn = 0;
  let totalComplexityDelta = 0;

  for (const file of files) {
    const churn = file.additions + file.deletions;
    fileSizes.push(churn);
    totalChurn += churn;

    const category = classifyFile(file.filename);
    if (category === 'test') {
      testChurn += churn;
    }

    // Only count complexity for non-generated, non-documentation files
    if (category === 'source' || category === 'test' || category === 'config') {
      const patch = file.patch ?? '';
      const parsed = parsePatch(patch);
      totalComplexityDelta += computeComplexityDelta(parsed);
    }
  }

  const fileCount = files.length;
  const entropy = computeEntropy(fileSizes);
  const testCorrelated = computeTestCorrelation(testChurn, totalChurn);

  // Core formula chain
  const seu = computeSEU(totalChurn, fileCount, entropy);
  const effortH = computeEffortH(seu, totalComplexityDelta, context.centrality);
  const qualityH = computeQualityH(totalComplexityDelta, testCorrelated);
  const valueH = computeContributionValue(effortH, qualityH, context.contributionType);
  const qualityScore = normalizeToScore(valueH);

  return {
    complexityDelta: totalComplexityDelta,
    entropy,
    testCorrelated,
    seu,
    effortH,
    qualityH,
    valueH,
    qualityScore,
  };
}
