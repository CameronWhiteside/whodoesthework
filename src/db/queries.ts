// src/db/queries.ts
// All database access lives here. Never write DB calls outside this class.
import { eq, and, desc, gte } from 'drizzle-orm';
import type { DrizzleDB } from './client';
import { developers, repos, contributions, reviews, developerDomains } from './schema';
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

  async updateIngestionStatus(id: string, status: string) {
    await this.db.update(developers)
      .set({ ingestionStatus: status, lastIngestedAt: new Date().toISOString() })
      .where(eq(developers.id, id));
  }

  // Alias kept for internal use by other methods
  async setIngestionStatus(id: string, status: string) {
    return this.updateIngestionStatus(id, status);
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
    await this.db.insert(repos)
      .values({
        fullName,
        description,
        primaryLanguage: language,
        stars,
        contributorsCount,
        hasTests,
        topics: JSON.stringify(topics),
        cachedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: repos.fullName,
        set: {
          description,
          stars,
          contributorsCount,
          hasTests,
          topics: JSON.stringify(topics),
          cachedAt: new Date().toISOString(),
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
    const conditions = [
      eq(developers.optedOut, false),
      eq(developers.ingestionStatus, 'complete'),
      ...(opts.minQuality !== undefined ? [gte(developers.codeQuality, opts.minQuality)] : []),
      ...(opts.minReview !== undefined ? [gte(developers.reviewQuality, opts.minReview)] : []),
    ];

    return this.db.select().from(developers)
      .where(and(...conditions))
      .orderBy(desc(developers.overallImpact))
      .limit(opts.limit)
      .all();
  }
}
