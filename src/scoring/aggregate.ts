// src/scoring/aggregate.ts
import type { Env } from '../types/env';
import type { DeveloperScore } from '../schemas/developer';
import { SCORE_WEIGHTS, SCORE_VERSION, CODE_QUALITY_REF, DOMAIN_SCORE_REF, RECENT_ACTIVITY_REF } from '../shared/constants';
import { computeContributionValue } from './quality-score';
import { computeReviewScore } from './review-score';
import { computeDocumentationScore } from './doc-score';
import { computeCollaborationBreadth } from './collaboration';
import { computeConsistency } from './consistency';
import { createDB } from '../db/client';
import {
  developers,
  contributions as contributionsTable,
  reviews as reviewsTable,
  developerDomains,
  repos,
} from '../db/schema';
import { eq, and, notInArray, isNotNull, sql, desc } from 'drizzle-orm';

export async function scoreDeveloper(env: Env, developerId: string): Promise<DeveloperScore> {
  const db = createDB(env.DB);

  // 1. Score all unscored contributions (with repo metadata join)
  const unscoredContribs = await db
    .select({
      id: contributionsTable.id,
      contributionType: contributionsTable.contributionType,
      churn: contributionsTable.churn,
      fileCount: contributionsTable.fileCount,
      normalizedEntropy: contributionsTable.normalizedEntropy,
      complexityDelta: contributionsTable.complexityDelta,
      complexityDeltaAbs: contributionsTable.complexityDeltaAbs,
      testRatio: contributionsTable.testRatio,
      authoredAt: contributionsTable.authoredAt,
      repoFullName: contributionsTable.repoFullName,
      stars: repos.stars,
      contributorsCount: repos.contributorsCount,
    })
    .from(contributionsTable)
    .leftJoin(repos, eq(contributionsTable.repoFullName, repos.fullName))
    .where(and(
      eq(contributionsTable.developerId, developerId),
      eq(contributionsTable.classified, true),
      eq(contributionsTable.scored, false),
    ))
    .all();

  for (const row of unscoredContribs) {
    const { qualityScore, recencyWeighted } = computeContributionValue(
      {
        id: row.id,
        contribution_type: row.contributionType,
        churn: row.churn,
        file_count: row.fileCount,
        normalized_entropy: row.normalizedEntropy,
        complexity_delta: row.complexityDelta,
        complexity_delta_abs: row.complexityDeltaAbs,
        test_ratio: row.testRatio,
        authored_at: row.authoredAt,
      },
      row.stars !== null ? { stars: row.stars, contributors_count: row.contributorsCount } : null,
    );
    await db.update(contributionsTable)
      .set({ qualityScore, recencyWeightedScore: recencyWeighted, scored: true })
      .where(eq(contributionsTable.id, row.id))
      .run();
  }

  // 2. Code quality: log-scale normalization of total recency-weighted value.
  //    Rewards both quality and depth. Resistant to outlier single commits.
  //    codeQuality = min(100, ln(1 + Σ recencyWeighted) / ln(1 + CODE_QUALITY_REF) × 100)
  const qualityRows = await db
    .select({ recencyWeightedScore: contributionsTable.recencyWeightedScore })
    .from(contributionsTable)
    .where(and(
      eq(contributionsTable.developerId, developerId),
      eq(contributionsTable.scored, true),
      notInArray(contributionsTable.contributionType, ['formatting', 'generated', 'dependency']),
      isNotNull(contributionsTable.recencyWeightedScore),
    ))
    .all();

  const totalRecencyWeighted = qualityRows.reduce((sum, r) => sum + (r.recencyWeightedScore as number), 0);
  const codeQuality = Math.min(100, (Math.log1p(totalRecencyWeighted) / Math.log1p(CODE_QUALITY_REF)) * 100);

  // 3. Review quality
  const reviewRows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.developerId, developerId))
    .all();
  const reviewResult = computeReviewScore(reviewRows as any[]);

  // 4. Documentation quality
  const docRows = await db
    .select()
    .from(contributionsTable)
    .where(and(
      eq(contributionsTable.developerId, developerId),
      eq(contributionsTable.contributionType, 'documentation'),
    ))
    .all();
  const documentationQuality = computeDocumentationScore(docRows as any[]);

  // 5. Collaboration breadth
  const uniqueRepoRows = await db
    .selectDistinct({ repoFullName: contributionsTable.repoFullName })
    .from(contributionsTable)
    .where(eq(contributionsTable.developerId, developerId))
    .all();

  const uniqueCollaboratorRows = await db
    .selectDistinct({ prAuthorId: reviewsTable.prAuthorId })
    .from(reviewsTable)
    .where(and(
      eq(reviewsTable.developerId, developerId),
      isNotNull(reviewsTable.prAuthorId),
    ))
    .all();

  const uniqueOrgs = new Set(uniqueRepoRows.map(r => r.repoFullName.split('/')[0])).size;
  const collaborationBreadth = computeCollaborationBreadth({
    uniqueRepos: uniqueRepoRows.length,
    uniqueOrgs,
    uniqueCollaborators: uniqueCollaboratorRows.length,
  });

  // 6. Consistency
  const dateRows = await db
    .select({ authoredAt: contributionsTable.authoredAt })
    .from(contributionsTable)
    .where(eq(contributionsTable.developerId, developerId))
    .orderBy(desc(contributionsTable.authoredAt))
    .all();
  const consistencyScore = computeConsistency(dateRows.map(r => r.authoredAt));

  // 7. Recency: log-scale count of contributions in last 12 months.
  //    recentActivityScore = min(100, ln(1+recentCount) / ln(1+RECENT_ACTIVITY_REF) × 100)
  //    Calibration: RECENT_ACTIVITY_REF=20 → 20 contributions in last year → score=100.
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const recentRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(contributionsTable)
    .where(and(
      eq(contributionsTable.developerId, developerId),
      sql`${contributionsTable.authoredAt} > ${twelveMonthsAgo.toISOString()}`,
    ))
    .all();
  const recentCount = recentRows[0]?.count ?? 0;
  const recentActivityScore = Math.min(100, (Math.log1p(recentCount) / Math.log1p(RECENT_ACTIVITY_REF)) * 100);

  // 8. Overall impact: weighted mean
  const overallImpact =
    codeQuality * SCORE_WEIGHTS.codeQuality +
    reviewResult.reviewQuality * SCORE_WEIGHTS.reviewQuality +
    documentationQuality * SCORE_WEIGHTS.documentationQuality +
    collaborationBreadth * SCORE_WEIGHTS.collaborationBreadth +
    consistencyScore * SCORE_WEIGHTS.consistencyScore +
    recentActivityScore * SCORE_WEIGHTS.recentActivityScore;

  const score: DeveloperScore = {
    overallImpact: round(overallImpact),
    codeQuality: round(codeQuality),
    reviewQuality: round(reviewResult.reviewQuality),
    documentationQuality: round(documentationQuality),
    collaborationBreadth: round(collaborationBreadth),
    consistencyScore: round(consistencyScore),
    recentActivityScore: round(recentActivityScore),
    scoreVersion: SCORE_VERSION,
    scoredAt: new Date().toISOString(),
  };

  // Write scores to D1
  await db.update(developers)
    .set({
      overallImpact: score.overallImpact,
      codeQuality: score.codeQuality,
      reviewQuality: score.reviewQuality,
      documentationQuality: score.documentationQuality,
      collaborationBreadth: score.collaborationBreadth,
      consistencyScore: score.consistencyScore,
      recentActivityScore: score.recentActivityScore,
      scoreVersion: score.scoreVersion,
      scoredAt: score.scoredAt,
    })
    .where(eq(developers.id, developerId))
    .run();

  // Aggregate domain scores
  await aggregateDomainScores(db, developerId);

  return score;
}

/**
 * Aggregates per-contribution recency-weighted scores into per-domain scores.
 *
 * Domain score formula:
 *   totalWeighted = Σ recencyWeightedScore for contributions tagged with this domain
 *   domainScore   = min(100, ln(1 + totalWeighted) / ln(1 + DOMAIN_SCORE_REF) × 100)
 *
 * This rewards depth (more contributions → higher score) while being resistant to
 * a single high-quality commit inflating a domain score. DOMAIN_SCORE_REF is the
 * calibration constant: ~500 total weighted score → domain score ≈ 100.
 *
 * Evidence repos: top 5 repos by contribution count in that domain (for display).
 */
async function aggregateDomainScores(
  db: ReturnType<typeof createDB>,
  developerId: string,
): Promise<void> {
  const domainRows = await db
    .select({
      domains: contributionsTable.domains,
      recencyWeightedScore: contributionsTable.recencyWeightedScore,
      repoFullName: contributionsTable.repoFullName,
    })
    .from(contributionsTable)
    .where(and(
      eq(contributionsTable.developerId, developerId),
      isNotNull(contributionsTable.domains),
      isNotNull(contributionsTable.recencyWeightedScore),
      eq(contributionsTable.scored, true),
    ))
    .all();

  // Accumulate per-domain: sum of recency-weighted scores + repo count map
  const domainMap = new Map<string, { totalWeighted: number; repoCounts: Map<string, number> }>();

  for (const row of domainRows) {
    const domains: string[] = JSON.parse(row.domains as string);
    const score = row.recencyWeightedScore as number;

    for (const domain of domains) {
      if (!domainMap.has(domain)) {
        domainMap.set(domain, { totalWeighted: 0, repoCounts: new Map() });
      }
      const entry = domainMap.get(domain)!;
      entry.totalWeighted += score;
      entry.repoCounts.set(row.repoFullName, (entry.repoCounts.get(row.repoFullName) ?? 0) + 1);
    }
  }

  for (const [domain, data] of domainMap) {
    // Log-scale normalization: calibrated so ~DOMAIN_SCORE_REF total weighted → 100
    const domainScore = Math.min(100, (Math.log1p(data.totalWeighted) / Math.log1p(DOMAIN_SCORE_REF)) * 100);

    // Top 5 repos by contribution count in this domain
    const evidenceRepos = [...data.repoCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([repo]) => repo);

    const contributionCount = [...data.repoCounts.values()].reduce((a, b) => a + b, 0);

    await db.insert(developerDomains)
      .values({
        developerId,
        domain,
        score: round(domainScore),
        contributionCount,
        evidenceRepos: JSON.stringify(evidenceRepos),
      })
      .onConflictDoUpdate({
        target: [developerDomains.developerId, developerDomains.domain],
        set: {
          score: round(domainScore),
          contributionCount,
          evidenceRepos: JSON.stringify(evidenceRepos),
        },
      })
      .run();
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
