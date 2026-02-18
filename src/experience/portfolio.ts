// src/experience/portfolio.ts
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import { contributions, developerDomains, repos } from '../db/schema';
import {
  PORTFOLIO_MAX_COMMIT_HEADS_PER_REPO,
  PORTFOLIO_MAX_COMMIT_HEAD_CHARS,
  PORTFOLIO_MAX_DESC_CHARS,
  PORTFOLIO_MAX_REPOS,
  PORTFOLIO_MAX_TOPICS_PER_REPO,
  PORTFOLIO_RECENT_MONTHS,
} from '../shared/constants';

function safeJsonStringArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : [];
  } catch {
    return [];
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 3)).trimEnd() + '...';
}

function buildSummaryText(input: {
  repoFullName: string;
  description: string | null;
  topics: string[];
  primaryLanguage: string | null;
  commitHeads: string[];
}): string {
  const parts: string[] = [];
  parts.push(`repo: ${input.repoFullName}`);
  if (input.description) parts.push(`description: ${truncate(input.description, PORTFOLIO_MAX_DESC_CHARS)}`);
  if (input.primaryLanguage) parts.push(`primary_language: ${input.primaryLanguage}`);
  const topics = input.topics.slice(0, PORTFOLIO_MAX_TOPICS_PER_REPO);
  if (topics.length > 0) parts.push(`topics: ${topics.join(', ')}`);
  const heads = input.commitHeads
    .filter(Boolean)
    .slice(0, PORTFOLIO_MAX_COMMIT_HEADS_PER_REPO)
    .map((h) => truncate(h, PORTFOLIO_MAX_COMMIT_HEAD_CHARS));
  if (heads.length > 0) parts.push(`recent_commit_heads: ${heads.join(' | ')}`);
  return parts.join('\n');
}

/** Builds per-(developer,repo) derived summaries for discovery + topic evaluation.
 *  Called after scoring so developer_domains evidence repos exist.
 */
export async function buildDeveloperRepoPortfolio(env: Env, developerId: string): Promise<void> {
  const db = createDB(env.DB);
  const queries = new Queries(db);

  // Candidate repos from domain evidence
  const domainRows = await db
    .select({ evidenceRepos: developerDomains.evidenceRepos })
    .from(developerDomains)
    .where(eq(developerDomains.developerId, developerId))
    .orderBy(desc(developerDomains.score))
    .limit(12)
    .all();

  const evidenceRepos = new Set<string>();
  for (const row of domainRows) {
    for (const repo of safeJsonStringArray(row.evidenceRepos)) evidenceRepos.add(repo);
  }

  // Fallback: if no domain evidence yet, use most recent distinct repos
  if (evidenceRepos.size === 0) {
    const recentRepos = await db
      .selectDistinct({ repoFullName: contributions.repoFullName })
      .from(contributions)
      .where(eq(contributions.developerId, developerId))
      .orderBy(desc(contributions.authoredAt))
      .limit(PORTFOLIO_MAX_REPOS)
      .all();
    for (const r of recentRepos) evidenceRepos.add(r.repoFullName);
  }

  const candidateRepos = [...evidenceRepos].slice(0, PORTFOLIO_MAX_REPOS);
  if (candidateRepos.length === 0) return;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - PORTFOLIO_RECENT_MONTHS);
  const cutoffIso = cutoff.toISOString();

  // Counts per repo (total + recent)
  const countRows = await db
    .select({
      repoFullName: contributions.repoFullName,
      totalContribCount: sql<number>`count(*)`,
      recentContribCount12mo: sql<number>`sum(case when ${contributions.authoredAt} > ${cutoffIso} then 1 else 0 end)`,
    })
    .from(contributions)
    .where(and(
      eq(contributions.developerId, developerId),
      inArray(contributions.repoFullName, candidateRepos),
    ))
    .groupBy(contributions.repoFullName)
    .all();

  const countsByRepo = new Map<string, { total: number; recent12mo: number }>();
  for (const row of countRows) {
    countsByRepo.set(row.repoFullName, {
      total: row.totalContribCount ?? 0,
      recent12mo: row.recentContribCount12mo ?? 0,
    });
  }

  // Recent commit heads (bounded, fetched in one query)
  const headRows = await db
    .select({ repoFullName: contributions.repoFullName, messageHead: contributions.messageHead })
    .from(contributions)
    .where(and(
      eq(contributions.developerId, developerId),
      inArray(contributions.repoFullName, candidateRepos),
      isNotNull(contributions.messageHead),
    ))
    .orderBy(desc(contributions.authoredAt))
    .limit(Math.min(800, candidateRepos.length * PORTFOLIO_MAX_COMMIT_HEADS_PER_REPO * 4))
    .all();

  const headsByRepo = new Map<string, string[]>();
  for (const row of headRows) {
    if (!row.messageHead) continue;
    const list = headsByRepo.get(row.repoFullName) ?? [];
    if (list.length >= PORTFOLIO_MAX_COMMIT_HEADS_PER_REPO) continue;
    list.push(row.messageHead);
    headsByRepo.set(row.repoFullName, list);
  }

  // Repo metadata
  const repoRows = await db
    .select({
      fullName: repos.fullName,
      description: repos.description,
      topics: repos.topics,
      primaryLanguage: repos.primaryLanguage,
      stars: repos.stars,
      contributorsCount: repos.contributorsCount,
    })
    .from(repos)
    .where(inArray(repos.fullName, candidateRepos))
    .all();

  const repoMeta = new Map<string, typeof repoRows[number]>();
  for (const r of repoRows) repoMeta.set(r.fullName, r);

  const now = new Date().toISOString();
  for (const repoFullName of candidateRepos) {
    const meta = repoMeta.get(repoFullName);
    const topics = meta ? safeJsonStringArray(meta.topics) : [];
    const counts = countsByRepo.get(repoFullName) ?? { total: 0, recent12mo: 0 };
    const summaryText = buildSummaryText({
      repoFullName,
      description: meta?.description ?? null,
      topics,
      primaryLanguage: meta?.primaryLanguage ?? null,
      commitHeads: headsByRepo.get(repoFullName) ?? [],
    });

    await queries.upsertDeveloperRepoPortfolio({
      developerId,
      repoFullName,
      stars: meta?.stars ?? 0,
      contributorsCount: meta?.contributorsCount ?? null,
      recentContribCount12mo: counts.recent12mo,
      totalContribCount: counts.total,
      summaryText,
      updatedAt: now,
    });
  }
}
