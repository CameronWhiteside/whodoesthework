import { describe, it, expect } from 'vitest';
import { computeEntropy, computeTestCorrelation, computeComplexityDelta } from './complexity';

describe('computeEntropy', () => {
  it('returns 0 for an empty array', () => {
    expect(computeEntropy([])).toBe(0);
  });

  it('returns 0 for a single file (no spread)', () => {
    expect(computeEntropy([100])).toBe(0);
  });

  it('returns 0 when all files are zero-size', () => {
    expect(computeEntropy([0, 0, 0])).toBe(0);
  });

  it('returns 0 when only one file has non-zero size', () => {
    expect(computeEntropy([0, 0, 100])).toBe(0);
  });

  it('returns 1 for perfectly uniform two-file distribution', () => {
    expect(computeEntropy([50, 50])).toBeCloseTo(1, 10);
  });

  it('returns 1 for perfectly uniform N-file distribution', () => {
    expect(computeEntropy([25, 25, 25, 25])).toBeCloseTo(1, 10);
  });

  it('returns a value in (0, 1) for a skewed distribution', () => {
    const h = computeEntropy([900, 100]);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1);
  });

  it('returns higher entropy for more uniform distributions', () => {
    const uniform = computeEntropy([50, 50, 50, 50]);
    const skewed = computeEntropy([170, 10, 10, 10]);
    expect(uniform).toBeGreaterThan(skewed);
  });
});

describe('computeTestCorrelation', () => {
  it('returns -0.2 when totalChurn is 0 (no code moved)', () => {
    expect(computeTestCorrelation(0, 0)).toBe(-0.2);
  });

  it('returns -0.2 when there is production churn but no test churn', () => {
    expect(computeTestCorrelation(0, 100)).toBe(-0.2);
  });

  it('returns 0.3 when all churn is in test files', () => {
    expect(computeTestCorrelation(100, 100)).toBe(0.3);
  });

  it('returns ~0.05 for a 50/50 test-to-prod split', () => {
    // ratio=0.5, raw = 0.5*0.5 - 0.2 = 0.05
    expect(computeTestCorrelation(50, 100)).toBeCloseTo(0.05, 10);
  });

  it('clamps result to [-0.2, 0.3]', () => {
    expect(computeTestCorrelation(0, 1000)).toBeGreaterThanOrEqual(-0.2);
    expect(computeTestCorrelation(1000, 1000)).toBeLessThanOrEqual(0.3);
  });
});

describe('computeComplexityDelta', () => {
  it('returns positive delta when decision points are added', () => {
    expect(computeComplexityDelta({
      addedLines: [], removedLines: [],
      addedDecisionPoints: 5, removedDecisionPoints: 2,
    })).toBe(3);
  });

  it('returns negative delta when decision points are removed (a good commit)', () => {
    expect(computeComplexityDelta({
      addedLines: [], removedLines: [],
      addedDecisionPoints: 1, removedDecisionPoints: 4,
    })).toBe(-3);
  });

  it('returns 0 when no net change in complexity', () => {
    expect(computeComplexityDelta({
      addedLines: [], removedLines: [],
      addedDecisionPoints: 3, removedDecisionPoints: 3,
    })).toBe(0);
  });

  it('returns 0 for a zero-diff', () => {
    expect(computeComplexityDelta({
      addedLines: [], removedLines: [],
      addedDecisionPoints: 0, removedDecisionPoints: 0,
    })).toBe(0);
  });
});
