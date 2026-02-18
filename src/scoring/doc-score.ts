// src/scoring/doc-score.ts

interface DocContribution {
  id: string;
  additions: number;
  authored_at: string;
}

/**
 * Documentation score based on two reliable signals:
 *   1. Volume (log-scaled): number of substantive doc contributions
 *   2. Recency: any docs written in the last 6 months
 *
 * Substantive = more than 10 line additions (filters out typo/formatting fixes).
 * Log-scale: 32+ docs → countScore = 1.0; 1 doc → ~0.2.
 *
 * ADR detection removed — commit message scanning is too unreliable for a signal
 * this small. Add it back when we have file-path-based detection (docs/adr/*.md).
 */
export function computeDocumentationScore(docContributions: DocContribution[]): number {
  if (docContributions.length === 0) return 0;

  const substantiveDocs = docContributions.filter(d => d.additions > 10);
  if (substantiveDocs.length === 0) return 5; // minimal credit for any doc work

  // log2(1+n)/5 → n=31 → 1.0
  const countScore = Math.min(1, Math.log2(1 + substantiveDocs.length) / 5);
  const substantiveRatio = substantiveDocs.length / docContributions.length;

  const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
  const hasRecentDocs = substantiveDocs.some(d => new Date(d.authored_at).getTime() > sixMonthsAgo);
  const recencyBonus = hasRecentDocs ? 0.2 : 0;

  const raw = countScore * 0.5 + substantiveRatio * 0.3 + recencyBonus;
  return Math.max(0, Math.min(100, raw * 100));
}
