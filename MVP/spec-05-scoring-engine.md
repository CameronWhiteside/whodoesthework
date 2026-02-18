# Spec 05 — Scoring Engine

**Status:** Not Started
**Blocks:** spec-07 (MCP needs scores to return), spec-06 (vectors need domain scores)
**Blocked By:** spec-00, spec-01, spec-03 (needs quality metrics), spec-04 (needs contribution types and domains)
**Parallelizable with:** spec-06, spec-07 (can build against seed data)
**Estimated effort:** 4-5 hours

---

## Objective

Build the scoring engine that aggregates per-contribution metrics (from spec-03) and classifications (from spec-04) into developer-level scores across six dimensions: code quality, review quality, documentation quality, collaboration breadth, consistency, and recency. Produces the `DeveloperScore` object.

---

## Execution Steps

### Step 1: Per-Contribution Quality Score

Create `src/scoring/quality-score.ts` — computes the value of a single contribution using the SEU/EffortH/QualityH model from the research spec.

**Model summary:**

```
SEU     = ln(1+churn) × (1 + FILE_COEFF × ln(1+F)) × (1 + ENTROPY_COEFF × H)
EffortH = SEU × (1 + CC_COEFF × |ΔCC|) × (1 + CENTRALITY_COEFF × centrality)
QualityH = clamp(BASE + W_MAINT × maintShare + W_TEST × testRatio, MIN, MAX)
ValueH  = EffortH × QualityH × typeWeight

qualityScore = min(100, ln(1 + ValueH) / ln(1 + CODE_QUALITY_REF) × 100)
```

Each function is exported so callers can unit-test them independently and tune coefficients in `constants.ts`.

```typescript
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
```

### Step 2: Review Score

Create `src/scoring/review-score.ts`.

```typescript
// src/scoring/review-score.ts
import {
  REVIEW_SUBSTANTIVE_WEIGHT,
  REVIEW_DEPTH_WEIGHT,
  REVIEW_CHANGE_REQUEST_WEIGHT,
  REVIEW_NOT_RUBBER_STAMP_WEIGHT,
} from '../shared/constants';

interface ReviewRow {
  id: string;
  review_state: string;
  comment_count: number;
  total_comment_length: number;
  references_code_lines: number;    // 0 or 1
  time_to_review_minutes: number | null;
  submitted_at: string;
}

export interface ReviewScoreResult {
  reviewQuality: number;           // 0-100
  substantiveRatio: number;
  avgDepth: number;
  changeRequestRatio: number;
  totalReviews: number;
}

export function computeReviewScore(reviews: ReviewRow[]): ReviewScoreResult {
  if (reviews.length === 0) {
    return { reviewQuality: 0, substantiveRatio: 0, avgDepth: 0, changeRequestRatio: 0, totalReviews: 0 };
  }

  let substantiveCount = 0;
  let changeRequestCount = 0;
  let totalDepth = 0;
  let rubberStampCount = 0;

  for (const review of reviews) {
    // Substantive: has code-line-referencing comments
    if (review.references_code_lines) substantiveCount++;

    // Change requests
    if (review.review_state === 'CHANGES_REQUESTED') changeRequestCount++;

    // Depth: based on comment count and length
    const depthScore = reviewDepth(review);
    totalDepth += depthScore;

    // Rubber-stamp detection
    if (review.review_state === 'APPROVED' && review.comment_count === 0) {
      if (review.time_to_review_minutes !== null && review.time_to_review_minutes < 5) {
        rubberStampCount++;
      }
    }
  }

  const substantiveRatio = substantiveCount / reviews.length;
  const avgDepth = totalDepth / reviews.length;
  const changeRequestRatio = changeRequestCount / reviews.length;
  const rubberStampRatio = rubberStampCount / reviews.length;

  // Weighted composite — weights defined in constants.ts (REVIEW_*_WEIGHT)
  const raw =
    substantiveRatio * REVIEW_SUBSTANTIVE_WEIGHT +
    normalizeDepth(avgDepth) * REVIEW_DEPTH_WEIGHT +
    changeRequestRatio * REVIEW_CHANGE_REQUEST_WEIGHT +
    (1 - rubberStampRatio) * REVIEW_NOT_RUBBER_STAMP_WEIGHT;

  const reviewQuality = Math.max(0, Math.min(100, raw * 100));

  return { reviewQuality, substantiveRatio, avgDepth, changeRequestRatio, totalReviews: reviews.length };
}

function reviewDepth(review: ReviewRow): number {
  // 0-1 scale based on comment count and length
  const countScore = Math.min(1, review.comment_count / 5);    // 5+ comments = max
  const lengthScore = Math.min(1, review.total_comment_length / 500); // 500+ chars = max
  const codeRefBonus = review.references_code_lines ? 0.2 : 0;

  return Math.min(1, (countScore * 0.4 + lengthScore * 0.4 + codeRefBonus));
}

function normalizeDepth(avgDepth: number): number {
  // avgDepth is 0-1, already normalized
  return avgDepth;
}
```

### Step 3: Documentation Score

Create `src/scoring/doc-score.ts`.

```typescript
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
```

### Step 4: Collaboration Breadth

Create `src/scoring/collaboration.ts`.

```typescript
// src/scoring/collaboration.ts

interface CollaborationData {
  uniqueRepos: number;
  uniqueOrgs: number;           // distinct org/ prefixes in repo names
  uniqueCollaborators: number;  // distinct PR authors reviewed
}

export function computeCollaborationBreadth(data: CollaborationData): number {
  // Log-normalized product
  const repoScore = Math.log2(data.uniqueRepos + 1) / 6;    // 64 repos = 1.0
  const orgScore = Math.log2(data.uniqueOrgs + 1) / 4;      // 16 orgs = 1.0
  const collabScore = Math.log2(data.uniqueCollaborators + 1) / 5; // 32 collaborators = 1.0

  const raw = (repoScore * 0.4 + orgScore * 0.3 + collabScore * 0.3);
  return Math.max(0, Math.min(100, raw * 100));
}
```

### Step 5: Consistency Score

Create `src/scoring/consistency.ts`.

```typescript
// src/scoring/consistency.ts

export function computeConsistency(contributionDates: string[]): number {
  if (contributionDates.length < 3) return 0;

  // Bucket contributions by month (last 24 months)
  const now = new Date();
  const months = new Array(24).fill(0);

  for (const dateStr of contributionDates) {
    const date = new Date(dateStr);
    const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 24) {
      months[monthsAgo]++;
    }
  }

  // Only consider months within the developer's active window
  const activeMonths = months.filter(m => m > 0);
  if (activeMonths.length <= 1) return 10; // Minimal consistency for single-month activity

  // Coefficient of variation
  const mean = activeMonths.reduce((a, b) => a + b, 0) / activeMonths.length;
  const variance = activeMonths.reduce((sum, m) => sum + (m - mean) ** 2, 0) / activeMonths.length;
  const cv = Math.sqrt(variance) / mean;

  // Also factor in coverage: what % of last 24 months had activity?
  const coverage = activeMonths.length / 24;

  // consistency = (1 - cv) * coverage, normalized to 0-100
  const raw = Math.max(0, (1 - cv) * coverage);
  return Math.max(0, Math.min(100, raw * 100));
}
```

### Step 6: Aggregate Scorer

Create `src/scoring/aggregate.ts` — pulls everything together and computes the final `DeveloperScore`.

```typescript
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
```

### Step 7: Queue Integration

Handle the `compute_scores` message in the queue handler:

```typescript
// Add to queue-handler.ts
case 'compute_scores': {
  const { scoreDeveloper } = await import('../scoring/aggregate');
  const score = await scoreDeveloper(env, msg.body.developerId);
  console.log(`Scored developer ${msg.body.developerId}: overall=${score.overallImpact}`);

  // Trigger vector building
  await env.INGESTION_QUEUE.send({
    type: 'build_vectors',
    developerId: msg.body.developerId,
  } satisfies QueueMessage);
  break;
}
```

### Step 8: Test with seed data

After seeding D1 with real ingested data (from spec-02), run:

```bash
curl -X POST http://localhost:8787/admin/score/DEVELOPER_ID
```

Add an admin endpoint:

```typescript
if (url.pathname.startsWith('/admin/score/') && request.method === 'POST') {
  const developerId = url.pathname.split('/').pop()!;
  const { scoreDeveloper } = await import('./scoring/aggregate');
  const score = await scoreDeveloper(env, developerId);
  return Response.json(score);
}
```

---

## Definition of Done

- [ ] `computeSEU`, `computeEffortH`, `computeQualityH`, `computeCentralityProxy` are individually unit-testable pure functions
- [ ] `computeContributionValue` returns `qualityScore ∈ [0, 100]` for varied realistic inputs
- [ ] A 300-line single-file commit with no tests → qualityScore ≈ 30–50 (calibration check)
- [ ] A 300-line multi-file feature commit with 30% test ratio → qualityScore ≈ 50–70
- [ ] `computeReviewScore` correctly scores rubber-stamps (APPROVED, 0 comments, <5 min) as low quality
- [ ] `computeDocumentationScore` gives non-zero score for substantive doc contributions, 0 for empty input
- [ ] `computeConsistency` returns high scores for steady contributors, low for burst contributors
- [ ] `scoreDeveloper` writes all six dimension scores + overall impact to D1 `developers` table
- [ ] Domain scores use sum(recencyWeighted) with log normalization — not simple average
- [ ] `recentActivityScore` uses log-scale count (not recentRatio × 120)
- [ ] End-to-end: after ingestion + classification + scoring, developer has complete score profile in D1
- [ ] All tunable coefficients are imported from `constants.ts` — no magic numbers in scoring functions
- [ ] `/admin/score/{id}` returns the computed score

## Output Artifacts

- `src/scoring/quality-score.ts`
- `src/scoring/review-score.ts`
- `src/scoring/doc-score.ts`
- `src/scoring/collaboration.ts`
- `src/scoring/consistency.ts`
- `src/scoring/aggregate.ts`
