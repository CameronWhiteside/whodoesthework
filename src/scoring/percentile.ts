// src/scoring/percentile.ts
import { DOMAIN_SCORE_REF } from '../shared/constants';

export interface DomainContribution {
  domain: string;
  recencyWeightedScore: number;
  repoFullName: string;
}

export interface DomainScore {
  domain: string;
  score: number;              // 0-100
  contributionCount: number;
  evidenceRepos: string[];   // unique repos
}

// Aggregate per-domain scores across all contributions
// domainScore = min(100, ln(1 + Σ recencyWeightedScore) / ln(1 + DOMAIN_SCORE_REF) × 100)
export function aggregateDomainScores(contributions: DomainContribution[]): DomainScore[] {
  const domainMap = new Map<string, { total: number; count: number; repos: Set<string> }>();

  for (const c of contributions) {
    const existing = domainMap.get(c.domain) ?? { total: 0, count: 0, repos: new Set() };
    existing.total += c.recencyWeightedScore;
    existing.count += 1;
    existing.repos.add(c.repoFullName);
    domainMap.set(c.domain, existing);
  }

  return Array.from(domainMap.entries())
    .map(([domain, { total, count, repos }]) => ({
      domain,
      score: Math.min(100, Math.log(1 + total) / Math.log(1 + DOMAIN_SCORE_REF) * 100),
      contributionCount: count,
      evidenceRepos: Array.from(repos),
    }))
    .sort((a, b) => b.score - a.score);
}
