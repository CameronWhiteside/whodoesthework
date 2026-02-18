// src/scoring/pipeline.ts
// Queue-driven post-ingestion pipeline:
// - classify contributions (domains + coarse type)
// - compute developer scores
// - build Vectorize embeddings

import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { contributions, developerDomains, repos } from '../db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { scoreDeveloper } from './aggregate';
import { upsertDeveloperVector } from '../search/vector-store';

const CLASSIFY_BATCH_SIZE = 25;
const DEFAULT_DOMAIN = 'general-software';

const DOMAIN_BY_LANGUAGE: Record<string, string[]> = {
  TypeScript: ['web-frontend', 'developer-tools'],
  JavaScript: ['web-frontend', 'developer-tools'],
  Python: ['data-engineering', 'machine-learning'],
  Go: ['distributed-systems', 'web-backend'],
  Rust: ['distributed-systems', 'systems-programming'],
  Java: ['web-backend'],
  Kotlin: ['mobile-android'],
  Swift: ['mobile-ios'],
  Ruby: ['web-backend'],
  'C++': ['systems-programming'],
  'C#': ['web-backend'],
};

function domainsFromRepoName(repoFullName: string): string[] {
  const name = repoFullName.toLowerCase();
  const out: string[] = [];

  if (name.includes('cloudflare') || name.includes('workers') || name.includes('wrangler')) out.push('cloud-infrastructure');
  if (name.includes('auth') || name.includes('oauth') || name.includes('jwt')) out.push('authentication');
  if (name.includes('payment') || name.includes('billing') || name.includes('stripe')) out.push('payments');
  if (name.includes('search') || name.includes('vector')) out.push('search');
  if (name.includes('grafana') || name.includes('otel') || name.includes('observ')) out.push('observability');
  if (name.includes('crypto') || name.includes('tls') || name.includes('ssh')) out.push('cryptography');
  if (name.includes('k8s') || name.includes('kube') || name.includes('terraform')) out.push('cloud-infrastructure');

  return out;
}

function domainsFromLanguages(languages: string[]): string[] {
  const out: string[] = [];
  for (const lang of languages) {
    for (const d of DOMAIN_BY_LANGUAGE[lang] ?? []) out.push(d);
  }
  return out;
}

function safeJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function classifyDeveloperContributions(
  env: Env,
  developerId: string,
): Promise<{ classified: number; remainingLikely: boolean }> {
  const db = createDB(env.DB);

  const rows = await db
    .select({
      id: contributions.id,
      repoFullName: contributions.repoFullName,
      messageHead: contributions.messageHead,
      languages: contributions.languages,
      repoTopics: repos.topics,
      repoDescription: repos.description,
    })
    .from(contributions)
    .leftJoin(repos, eq(contributions.repoFullName, repos.fullName))
    .where(and(
      eq(contributions.developerId, developerId),
      eq(contributions.classified, false),
    ))
    .limit(CLASSIFY_BATCH_SIZE)
    .all();

  if (rows.length === 0) {
    return { classified: 0, remainingLikely: false };
  }

  let classified = 0;

  for (const row of rows) {
    const languages = safeJsonArray(row.languages);
    const domains = [
      ...domainsFromRepoName(row.repoFullName),
      ...domainsFromLanguages(languages),
    ];

    const finalDomains = [...new Set(domains)].slice(0, 5);

    await db
      .update(contributions)
      .set({
        contributionType: 'feature',
        domains: JSON.stringify(finalDomains.length > 0 ? finalDomains : [DEFAULT_DOMAIN]),
        classified: true,
      })
      .where(eq(contributions.id, row.id))
      .run();

    classified++;
  }

  return { classified, remainingLikely: rows.length === CLASSIFY_BATCH_SIZE };
}

export async function computeScoresForDeveloper(env: Env, developerId: string): Promise<void> {
  // scoreDeveloper handles: scoring contributions, aggregating domains, and writing developer scores.
  await scoreDeveloper(env, developerId);
}

export async function buildVectorsForDeveloper(env: Env, developerId: string): Promise<void> {
  const db = createDB(env.DB);

  const domainRows = await db
    .select({ domain: developerDomains.domain, score: developerDomains.score, evidenceRepos: developerDomains.evidenceRepos })
    .from(developerDomains)
    .where(eq(developerDomains.developerId, developerId))
    .orderBy(desc(developerDomains.score))
    .limit(12)
    .all();

  const domains = domainRows.map((d) => ({
    domain: d.domain,
    score: d.score,
    evidenceRepos: safeJsonArray(d.evidenceRepos),
  }));

  const langRows = await db
    .select({ languages: contributions.languages })
    .from(contributions)
    .where(eq(contributions.developerId, developerId))
    .limit(300)
    .all();

  const langCounts = new Map<string, number>();
  for (const row of langRows) {
    for (const lang of safeJsonArray(row.languages)) {
      if (!lang) continue;
      langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
    }
  }

  const topLanguages = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang]) => lang);

  // Ensure at least one domain so the vector exists.
  const finalDomains = domains.length > 0
    ? domains
    : [{ domain: DEFAULT_DOMAIN, score: 1, evidenceRepos: [] }];

  await upsertDeveloperVector(env.AI, env.VECTOR_INDEX, developerId, finalDomains, topLanguages);
}
