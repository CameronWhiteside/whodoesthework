import { describe, it, expect } from 'vitest';
import {
  computeSEU,
  computeCentralityProxy,
  computeEffortH,
  computeQualityH,
  computeContributionValue,
} from './quality-score';
import {
  SEU_FILE_COEFF,
  SEU_ENTROPY_COEFF,
  EFFORH_CC_COEFF,
  EFFORH_CENTRALITY_COEFF,
  QUALITY_BASE,
  QUALITY_MIN,
  QUALITY_MAX,
} from '../shared/constants';

describe('computeSEU', () => {
  it('returns 0 for zero churn', () => {
    expect(computeSEU(0, 0, 0)).toBe(0);
  });

  it('is log-scaled: doubling churn does not double SEU', () => {
    const seu100 = computeSEU(100, 1, 0);
    const seu200 = computeSEU(200, 1, 0);
    expect(seu200).toBeLessThan(seu100 * 2);
  });

  it('increases with file count (coordination overhead)', () => {
    const oneFile = computeSEU(100, 1, 0);
    const tenFiles = computeSEU(100, 10, 0);
    expect(tenFiles).toBeGreaterThan(oneFile);
  });

  it('increases with entropy (spread bonus)', () => {
    const noSpread = computeSEU(100, 5, 0);
    const fullSpread = computeSEU(100, 5, 1);
    expect(fullSpread).toBeGreaterThan(noSpread);
    expect(fullSpread).toBeCloseTo(noSpread * (1 + SEU_ENTROPY_COEFF), 10);
  });

  it('matches formula: ln(1+churn) × (1 + fc × ln(1+F)) × (1 + ec × H)', () => {
    const churn = 300;
    const F = 5;
    const H = 0.6;
    const expected =
      Math.log1p(churn) *
      (1 + SEU_FILE_COEFF * Math.log1p(F)) *
      (1 + SEU_ENTROPY_COEFF * H);
    expect(computeSEU(churn, F, H)).toBeCloseTo(expected, 10);
  });
});

describe('computeCentralityProxy', () => {
  it('returns 0 for unknown/tiny repo', () => {
    expect(computeCentralityProxy(0, 0)).toBe(0);
  });

  it('gives partial credit for a mid-tier repo (≥100 stars, ≥20 contributors)', () => {
    const c = computeCentralityProxy(100, 20);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });

  it('returns 1.0 for a high-star, high-contributor repo', () => {
    expect(computeCentralityProxy(1000, 50)).toBe(1.0);
  });

  it('caps at 1.0', () => {
    expect(computeCentralityProxy(100_000, 10_000)).toBe(1.0);
  });

  it('star score thresholds are correct', () => {
    expect(computeCentralityProxy(9, 0)).toBe(0);
    expect(computeCentralityProxy(10, 0)).toBe(0.1);
    expect(computeCentralityProxy(100, 0)).toBe(0.3);
    expect(computeCentralityProxy(1000, 0)).toBe(0.5);
  });

  it('contributor score thresholds are correct', () => {
    expect(computeCentralityProxy(0, 4)).toBe(0);
    expect(computeCentralityProxy(0, 5)).toBe(0.1);
    expect(computeCentralityProxy(0, 20)).toBe(0.3);
    expect(computeCentralityProxy(0, 50)).toBe(0.5);
  });
});

describe('computeEffortH', () => {
  it('returns 0 when SEU is 0', () => {
    expect(computeEffortH(0, 10, 0.5)).toBe(0);
  });

  it('increases with complexity delta', () => {
    const low = computeEffortH(5, 0, 0);
    const high = computeEffortH(5, 20, 0);
    expect(high).toBeGreaterThan(low);
  });

  it('increases with centrality', () => {
    const low = computeEffortH(5, 0, 0);
    const high = computeEffortH(5, 0, 1);
    expect(high).toBeCloseTo(low * (1 + EFFORH_CENTRALITY_COEFF), 10);
  });

  it('matches formula: SEU × (1 + CC × |ΔCC|) × (1 + cent × centrality)', () => {
    const seu = 4.2;
    const cc = 7;
    const cent = 0.6;
    const expected = seu * (1 + EFFORH_CC_COEFF * cc) * (1 + EFFORH_CENTRALITY_COEFF * cent);
    expect(computeEffortH(seu, cc, cent)).toBeCloseTo(expected, 10);
  });
});

describe('computeQualityH', () => {
  it('returns QUALITY_BASE + QUALITY_MAINTAINABLE_WEIGHT for a neutral commit (complexityDelta=0 earns full maintainableShare)', () => {
    // maintainableShare = max(0, 1 - min(0,20)/20) = 1 when delta ≤ 0
    // raw = 0.80 + 0.20×1 + 0.30×0 = 1.00
    expect(computeQualityH(0, 0)).toBeCloseTo(QUALITY_BASE + 0.20, 5);
  });

  it('is higher when complexity is reduced (maintainableShare = 1)', () => {
    const neutral = computeQualityH(0, 0);
    const improving = computeQualityH(-1, 0);
    expect(improving).toBeGreaterThan(neutral);
  });

  it('decreases as complexity delta increases', () => {
    const q0 = computeQualityH(0, 0);
    const q5 = computeQualityH(5, 0);
    const q20 = computeQualityH(20, 0);
    expect(q5).toBeLessThan(q0);
    expect(q20).toBeLessThan(q5);
  });

  it('increases with test ratio', () => {
    const noTests = computeQualityH(0, 0);
    const withTests = computeQualityH(0, 0.5);
    expect(withTests).toBeGreaterThan(noTests);
  });

  it('never goes below QUALITY_MIN', () => {
    expect(computeQualityH(1000, 0)).toBeGreaterThanOrEqual(QUALITY_MIN);
  });

  it('never exceeds QUALITY_MAX', () => {
    expect(computeQualityH(-100, 1)).toBeLessThanOrEqual(QUALITY_MAX);
  });
});

describe('computeContributionValue', () => {
  const baseContrib = {
    id: 'c1',
    contribution_type: 'feature',
    churn: 300,
    file_count: 5,
    normalized_entropy: 0.6,
    complexity_delta: 2,
    complexity_delta_abs: 2,
    test_ratio: 0.2,
    authored_at: new Date().toISOString(),
  };

  it('returns qualityScore in [0, 100]', () => {
    const { qualityScore } = computeContributionValue(baseContrib, null);
    expect(qualityScore).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeLessThanOrEqual(100);
  });

  it('returns qualityScore = 0 for a generated contribution (typeWeight = 0)', () => {
    const { qualityScore } = computeContributionValue(
      { ...baseContrib, contribution_type: 'generated' },
      null,
    );
    expect(qualityScore).toBe(0);
  });

  it('scores higher with a high-centrality repo than a zero-centrality one', () => {
    const withoutRepo = computeContributionValue(baseContrib, null);
    const withBigRepo = computeContributionValue(baseContrib, { stars: 5000, contributors_count: 100 });
    expect(withBigRepo.qualityScore).toBeGreaterThan(withoutRepo.qualityScore);
  });

  it('recencyWeighted <= qualityScore (decay only reduces)', () => {
    const result = computeContributionValue(
      { ...baseContrib, authored_at: '2020-01-01T00:00:00Z' },
      null,
    );
    expect(result.recencyWeighted).toBeLessThanOrEqual(result.qualityScore);
  });

  it('recencyWeighted ≈ qualityScore for a very recent contribution', () => {
    const result = computeContributionValue(baseContrib, null); // authored_at = now
    expect(result.recencyWeighted).toBeCloseTo(result.qualityScore, 0);
  });
});
