// src/db/queries.ts
// All database access lives here. Never write DB calls outside this class.
import { eq, and, desc, gte, sql, gt } from 'drizzle-orm';
import type { DrizzleDB } from './client';
import { developers, repos, contributions, reviews, developerDomains, developerRepoPortfolios } from './schema';
import type { DeveloperScore } from '../schemas/developer';

export class Queries {
  constructor(private db: DrizzleDB) {}

  // -- Developers --

  async getDeveloper(id: string) {
    return this.db.select().from(developers)
      .where(and(eq(developers.id, id), eq(developers.optedOut, false)))
      .get();
  }

  async getDeveloperByUsername(username: string) {
    return this.db.select().from(developers)
      .where(and(eq(developers.username, username), eq(developers.optedOut, false)))
      .get();
  }

  async getDeveloperById(id: string) {
    return this.getDeveloper(id);
  }

  async upsertDeveloper(data: { id: string; username: string }) {
    await this.db.insert(developers)
      .values({ id: data.id, username: data.username, ingestionStatus: 'pending' })
      .onConflictDoUpdate({
        target: developers.id,
        set: { username: data.username },
      });
  }

  // ── Ingestion lifecycle methods ─────────────────────────────────────────────
  // Each method encodes the correct semantic for its transition.
  // NEVER call the generic updateIngestionStatus for in_progress or complete —
  // it would poison last_ingested_at which controls incremental commit fetching.

  /** Transition to in_progress: stamp ingestion_started_at, increment attempt count.
   *  Does NOT touch last_ingested_at so the next analyzeRepo uses the correct `since`. */
  async setIngestionInProgress(id: string) {
    await this.db.update(developers)
      .set({
        ingestionStatus: 'in_progress',
        ingestionStartedAt: new Date().toISOString(),
        ingestionAttemptCount: sql`COALESCE(ingestion_attempt_count, 0) + 1`,
      })
      .where(eq(developers.id, id));
  }

  /** Transition to complete: stamp last_ingested_at, clear failure fields. */
  async markIngestionComplete(id: string) {
    await this.db.update(developers)
      .set({
        ingestionStatus: 'complete',
        lastIngestedAt: new Date().toISOString(),
        ingestionFailureReason: null,
        ingestionLastError: null,
      })
      .where(eq(developers.id, id));
  }

  /** Transition to failed: record why. */
  async setIngestionFailed(id: string, reason: string, errorMsg?: string) {
    await this.db.update(developers)
      .set({
        ingestionStatus: 'failed',
        ingestionFailureReason: reason,
        ingestionLastError: errorMsg ? errorMsg.slice(0, 500) : null,
      })
      .where(eq(developers.id, id));
  }

  /** Reset to pending for retry (clears failure fields, preserves last_ingested_at). */
  async resetToPending(id: string) {
    await this.db.update(developers)
      .set({
        ingestionStatus: 'pending',
        ingestionStartedAt: null,
        ingestionFailureReason: null,
        ingestionLastError: null,
      })
      .where(eq(developers.id, id));
  }

  /** Generic status setter — kept for backward compat but routes to typed methods. */
  async updateIngestionStatus(id: string, status: string) {
    if (status === 'in_progress') return this.setIngestionInProgress(id);
    if (status === 'complete') return this.markIngestionComplete(id);
    await this.db.update(developers)
      .set({ ingestionStatus: status })
      .where(eq(developers.id, id));
  }

  // Alias for internal callers
  async setIngestionStatus(id: string, status: string) {
    return this.updateIngestionStatus(id, status);
  }

  /** Returns true if this developer has meaningful ingested data (minimum completeness). */
  async meetsCompletenessThreshold(id: string): Promise<boolean> {
    // raw SQL: count contributions and check score in one pass
    const contribRow = await this.db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(contributions)
      .where(eq(contributions.developerId, id))
      .get();
    const contribCount = contribRow?.cnt ?? 0;
    if (contribCount >= 5) return true;

    const devRow = await this.db
      .select({
        overallImpact: developers.overallImpact,
        codeQuality: developers.codeQuality,
      })
      .from(developers)
      .where(eq(developers.id, id))
      .get();
    if ((devRow?.overallImpact ?? 0) > 0) return true;
    if ((devRow?.codeQuality ?? 0) > 0) return true;

    const domainRow = await this.db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(developerDomains)
      .where(eq(developerDomains.developerId, id))
      .get();
    return (domainRow?.cnt ?? 0) >= 1;
  }

  async updateScores(id: string, scores: DeveloperScore) {
    await this.db.update(developers)
      .set({
        overallImpact: scores.overallImpact,
        codeQuality: scores.codeQuality,
        reviewQuality: scores.reviewQuality,
        documentationQuality: scores.documentationQuality,
        collaborationBreadth: scores.collaborationBreadth,
        consistencyScore: scores.consistencyScore,
        recentActivityScore: scores.recentActivityScore,
        scoreVersion: scores.scoreVersion,
        scoredAt: scores.scoredAt,
      })
      .where(eq(developers.id, id));
  }

  // getDeveloperScore returns the score fields embedded in the developer row
  async getDeveloperScore(developerId: string) {
    const row = await this.db.select({
      overallImpact: developers.overallImpact,
      codeQuality: developers.codeQuality,
      reviewQuality: developers.reviewQuality,
      documentationQuality: developers.documentationQuality,
      collaborationBreadth: developers.collaborationBreadth,
      consistencyScore: developers.consistencyScore,
      recentActivityScore: developers.recentActivityScore,
      scoreVersion: developers.scoreVersion,
      scoredAt: developers.scoredAt,
    }).from(developers)
      .where(eq(developers.id, developerId))
      .get();
    return row ?? null;
  }

  async upsertDeveloperScore(data: {
    developerId: string;
    overallImpact: number;
    codeQuality: number;
    reviewQuality: number;
    documentationQuality: number;
    collaborationBreadth: number;
    consistencyScore: number;
    recentActivityScore: number;
    scoreVersion: string;
    scoredAt: string;
  }) {
    await this.db.update(developers)
      .set({
        overallImpact: data.overallImpact,
        codeQuality: data.codeQuality,
        reviewQuality: data.reviewQuality,
        documentationQuality: data.documentationQuality,
        collaborationBreadth: data.collaborationBreadth,
        consistencyScore: data.consistencyScore,
        recentActivityScore: data.recentActivityScore,
        scoreVersion: data.scoreVersion,
        scoredAt: data.scoredAt,
      })
      .where(eq(developers.id, data.developerId));
  }

  // -- Contributions --

  async getContributionsByDeveloper(developerId: string, limit: number = 100) {
    return this.db.select().from(contributions)
      .where(eq(contributions.developerId, developerId))
      .orderBy(desc(contributions.authoredAt))
      .limit(limit)
      .all();
  }

  async insertContribution(data: {
    id: string;
    developerId: string;
    repoFullName: string;
    authoredAt: string;
    messageHead?: string | null;
    additions: number;
    deletions: number;
    filesChanged: number;
    kind?: string;
  }) {
    await this.db.insert(contributions)
      .values({
        id: data.id,
        developerId: data.developerId,
        repoFullName: data.repoFullName,
        kind: data.kind ?? 'commit',
        authoredAt: data.authoredAt,
        messageHead: data.messageHead ?? null,
        additions: data.additions,
        deletions: data.deletions,
        filesChanged: data.filesChanged,
      })
      .onConflictDoNothing();
  }

  async getUnclassified(limit: number = 100) {
    return this.db.select().from(contributions)
      .where(eq(contributions.classified, false))
      .limit(limit)
      .all();
  }

  async markClassified(id: string, type: string, domains: string[]) {
    await this.db.update(contributions)
      .set({ contributionType: type, domains: JSON.stringify(domains), classified: true })
      .where(eq(contributions.id, id));
  }

  async markScored(id: string, qualityScore: number, recencyWeighted: number) {
    await this.db.update(contributions)
      .set({ qualityScore, recencyWeightedScore: recencyWeighted, scored: true })
      .where(eq(contributions.id, id));
  }

  async setContributionMetrics(
    sha: string,
    metrics: {
      churn: number;
      fileCount: number;
      normalizedEntropy: number;
      complexityDelta: number;
      complexityDeltaAbs: number;
      testRatio: number;
      languages: string[];
    },
  ) {
    await this.db.update(contributions)
      .set({
        churn: metrics.churn,
        fileCount: metrics.fileCount,
        normalizedEntropy: metrics.normalizedEntropy,
        complexityDelta: metrics.complexityDelta,
        complexityDeltaAbs: metrics.complexityDeltaAbs,
        testRatio: metrics.testRatio,
        languages: JSON.stringify(metrics.languages),
      })
      .where(eq(contributions.id, sha));
  }

  // -- Repos --

  async upsertRepo(
    fullName: string,
    language: string | null,
    stars: number,
    contributorsCount: number | null,
    hasTests: boolean,
    description: string | null,
    topics: string[],
  ) {
    const topicsJson = JSON.stringify(topics);
    const now = new Date().toISOString();
    await this.db.insert(repos)
      .values({
        fullName,
        description,
        primaryLanguage: language,
        stars,
        contributorsCount,
        hasTests,
        topics: topicsJson,
        cachedAt: now,
      })
      .onConflictDoUpdate({
        target: repos.fullName,
        set: {
          // Prefer incoming value if non-null/non-zero; otherwise preserve existing.
          // This prevents placeholder writes (null, 0, []) from clobbering real metadata.
          description: sql`COALESCE(${description}, description)`,
          primaryLanguage: sql`COALESCE(${language}, primary_language)`,
          stars: sql`CASE WHEN ${stars} > 0 THEN ${stars} ELSE stars END`,
          contributorsCount: sql`COALESCE(${contributorsCount}, contributors_count)`,
          hasTests: sql`CASE WHEN ${hasTests ? 1 : 0} = 1 THEN 1 ELSE has_tests END`,
          topics: sql`CASE WHEN ${topicsJson} != '[]' THEN ${topicsJson} ELSE topics END`,
          cachedAt: now,
        },
      });
  }

  async getRepo(fullName: string) {
    return this.db.select().from(repos).where(eq(repos.fullName, fullName)).get();
  }

  // -- Reviews --

  async insertReview(
    id: string,
    developerId: string,
    repoFullName: string,
    prNumber: number,
    prAuthorId: string | null,
    reviewState: string,
    commentCount: number,
    totalCommentLength: number,
    referencesCodeLines: boolean,
    submittedAt: string,
  ) {
    await this.db.insert(reviews)
      .values({
        id,
        developerId,
        repoFullName,
        prNumber,
        prAuthorId,
        reviewState,
        commentCount,
        totalCommentLength,
        referencesCodeLines,
        submittedAt,
      })
      .onConflictDoNothing();
  }

  async getReviewsByDeveloper(developerId: string) {
    return this.db.select().from(reviews)
      .where(eq(reviews.developerId, developerId))
      .all();
  }

  // -- Domains --

  async getDomainsByDeveloper(developerId: string) {
    return this.db.select().from(developerDomains)
      .where(eq(developerDomains.developerId, developerId))
      .orderBy(desc(developerDomains.score))
      .all();
  }

  async upsertDomainScore(data: {
    developerId: string;
    domain: string;
    score: number;
    contributionCount: number;
    evidenceRepos: string[];
  }) {
    await this.db.insert(developerDomains)
      .values({
        developerId: data.developerId,
        domain: data.domain,
        score: data.score,
        contributionCount: data.contributionCount,
        evidenceRepos: JSON.stringify(data.evidenceRepos),
      })
      .onConflictDoUpdate({
        target: [developerDomains.developerId, developerDomains.domain],
        set: {
          score: data.score,
          contributionCount: data.contributionCount,
          evidenceRepos: JSON.stringify(data.evidenceRepos),
        },
      });
  }

  // -- Search --

  async searchScoredDevelopers(opts: {
    minQuality?: number;
    minReview?: number;
    limit: number;
  }) {
    // Gate: only return developers that have meaningful data (overall_impact > 0)
    const conditions = [
      eq(developers.optedOut, false),
      eq(developers.ingestionStatus, 'complete'),
      gt(developers.overallImpact, 0),
      ...(opts.minQuality !== undefined ? [gte(developers.codeQuality, opts.minQuality)] : []),
      ...(opts.minReview !== undefined ? [gte(developers.reviewQuality, opts.minReview)] : []),
    ];

    return this.db.select().from(developers)
      .where(and(...conditions))
      .orderBy(desc(developers.overallImpact))
      .limit(opts.limit)
      .all();
  }

  // -- Discovery / Portfolio --

  async upsertDeveloperRepoPortfolio(data: {
    developerId: string;
    repoFullName: string;
    stars: number;
    contributorsCount: number | null;
    recentContribCount12mo: number;
    totalContribCount: number;
    summaryText: string;
    updatedAt: string;
  }) {
    await this.db.insert(developerRepoPortfolios)
      .values({
        developerId: data.developerId,
        repoFullName: data.repoFullName,
        stars: data.stars,
        contributorsCount: data.contributorsCount,
        recentContribCount12mo: data.recentContribCount12mo,
        totalContribCount: data.totalContribCount,
        summaryText: data.summaryText,
        updatedAt: data.updatedAt,
      })
      .onConflictDoUpdate({
        target: [developerRepoPortfolios.developerId, developerRepoPortfolios.repoFullName],
        set: {
          stars: data.stars,
          contributorsCount: data.contributorsCount,
          recentContribCount12mo: data.recentContribCount12mo,
          totalContribCount: data.totalContribCount,
          summaryText: data.summaryText,
          updatedAt: data.updatedAt,
        },
      });
  }

  async getDeveloperRepoPortfolios(developerId: string, limit: number) {
    return this.db
      .select()
      .from(developerRepoPortfolios)
      .where(eq(developerRepoPortfolios.developerId, developerId))
      .orderBy(
        desc(developerRepoPortfolios.recentContribCount12mo),
        desc(developerRepoPortfolios.totalContribCount),
        desc(developerRepoPortfolios.stars),
      )
      .limit(limit)
      .all();
  }
}
