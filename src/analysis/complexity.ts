// src/analysis/complexity.ts
// Pure functions — no I/O. Compute cyclomatic complexity delta, Shannon entropy,
// and test correlation from parsed diff data.

import type { ParsedDiff } from './diff-parser';

/**
 * Compute the cyclomatic complexity delta for a single parsed diff.
 *
 * delta = addedDecisionPoints - removedDecisionPoints
 *   > 0 → commit added complexity (bad)
 *   < 0 → commit reduced complexity (good)
 *   = 0 → no net change
 */
export function computeComplexityDelta(diff: ParsedDiff): number {
  return diff.addedDecisionPoints - diff.removedDecisionPoints;
}

/**
 * Compute normalized Shannon entropy H ∈ [0, 1] from an array of per-file
 * churn sizes (additions + deletions).
 *
 *   H_raw = -Σ(p_i × log₂(p_i))   where p_i = fileSizes[i] / totalChurn
 *   H     = H_raw / log₂(N)        normalizes to [0, 1]
 *
 * Special cases:
 *   N = 0 or N = 1 → return 0 (no spread)
 *   totalChurn = 0 → return 0
 */
export function computeEntropy(fileSizes: number[]): number {
  const nonZero = fileSizes.filter(s => s > 0);
  const N = nonZero.length;

  if (N <= 1) return 0;

  const totalChurn = nonZero.reduce((sum, s) => sum + s, 0);
  if (totalChurn === 0) return 0;

  let H_raw = 0;
  for (const size of nonZero) {
    const p = size / totalChurn;
    H_raw -= p * Math.log2(p);
  }

  return H_raw / Math.log2(N); // ∈ [0, 1]
}

/**
 * Compute the test correlation signal: what fraction of total churn is in test files?
 *
 * Raw ratio = testChurn / totalChurn
 *
 * The result is then shifted and clamped to [-0.2, 0.3]:
 *   - 0 test churn out of non-zero total → -0.2 (small penalty for no tests)
 *   - Equal test + prod churn            →  ~0.15 (neutral-positive)
 *   - All churn is tests                 →  0.3  (reward, capped)
 *
 * The transformation is: raw × 0.5 - 0.2, clamped to [-0.2, 0.3].
 * This maps [0, 1] → [-0.2, 0.3] linearly.
 */
export function computeTestCorrelation(testChurn: number, totalChurn: number): number {
  if (totalChurn <= 0) return -0.2;
  const ratio = testChurn / totalChurn; // ∈ [0, 1]
  // Linear map: 0 → -0.2, 1 → 0.3
  const raw = ratio * 0.5 - 0.2;
  return Math.max(-0.2, Math.min(0.3, raw));
}
