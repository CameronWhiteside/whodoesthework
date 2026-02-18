import { describe, expect, it } from 'vitest';
import { computeRepoScaleScore } from './scale';

describe('computeRepoScaleScore', () => {
  it('is non-negative and bounded', () => {
    const s = computeRepoScaleScore({
      repoFullName: 'org/repo',
      stars: 0,
      contributorsCount: 0,
      recentContribCount12mo: 0,
      totalContribCount: 0,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it('monotonically increases with stars, holding other signals constant', () => {
    const low = computeRepoScaleScore({
      repoFullName: 'org/repo',
      stars: 10,
      contributorsCount: 50,
      recentContribCount12mo: 5,
      totalContribCount: 50,
    });
    const high = computeRepoScaleScore({
      repoFullName: 'org/repo',
      stars: 10_000,
      contributorsCount: 50,
      recentContribCount12mo: 5,
      totalContribCount: 50,
    });
    expect(high).toBeGreaterThan(low);
  });
});
