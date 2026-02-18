// src/scoring/pipeline.ts
// Queue-driven post-ingestion pipeline:
// - classify contributions (domains + coarse type)
// - compute developer scores
// - build Vectorize embeddings

import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { contributions, developerDomains, developerRepoPortfolios, repos } from '../db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { scoreDeveloper } from './aggregate';
import { upsertDeveloperVector } from '../search/vector-store';
import { Queries } from '../db/queries';

const CLASSIFY_BATCH_SIZE = 25;
const DEFAULT_DOMAIN = 'general-software';

const DOMAIN_BY_LANGUAGE: Record<string, string[]> = {
  TypeScript:   ['web-backend', 'developer-tools', 'api-design', 'frontend-react'],
  JavaScript:   ['web-backend', 'developer-tools', 'frontend-react'],
  Python:       ['data-engineering', 'ml-infrastructure', 'llm-applications', 'web-backend'],
  Go:           ['distributed-systems', 'web-backend', 'devops', 'cloud-infrastructure'],
  Rust:         ['distributed-systems', 'systems-programming', 'webassembly', 'developer-tools'],
  Java:         ['web-backend', 'distributed-systems', 'mobile-android'],
  Kotlin:       ['mobile-android', 'web-backend'],
  Swift:        ['mobile-ios'],
  Ruby:         ['web-backend', 'developer-tools'],
  'C++':        ['systems-programming', 'game-development', 'embedded-systems', 'compiler-design'],
  'C#':         ['web-backend', 'game-development'],
  PHP:          ['web-backend'],
  Scala:        ['distributed-systems', 'data-engineering'],
  Elixir:       ['web-backend', 'distributed-systems'],
  Haskell:      ['compiler-design'],
  Dart:         ['mobile-ios', 'mobile-android'],
  Zig:          ['systems-programming', 'embedded-systems'],
  C:            ['systems-programming', 'embedded-systems', 'networking'],
  Shell:        ['devops', 'developer-tools', 'cli-tools'],
  SQL:          ['databases', 'data-engineering'],
  Terraform:    ['cloud-infrastructure', 'devops'],
};

function domainsFromRepoName(repoFullName: string): string[] {
  const name = repoFullName.toLowerCase();
  const out: string[] = [];

  // Infrastructure & DevOps
  if (name.includes('cloudflare') || name.includes('workers') || name.includes('wrangler')) out.push('cloud-infrastructure');
  if (name.includes('k8s') || name.includes('kube') || name.includes('terraform') || name.includes('pulumi') || name.includes('helm')) out.push('cloud-infrastructure');
  if (name.includes('docker') || name.includes('ci') || name.includes('github-action') || name.includes('gitops')) out.push('devops');
  if (name.includes('grafana') || name.includes('otel') || name.includes('observ') || name.includes('prometheus') || name.includes('tracing')) out.push('observability');

  // Auth & Security
  if (name.includes('auth') || name.includes('oauth') || name.includes('jwt') || name.includes('passkey') || name.includes('saml')) out.push('authentication');
  if (name.includes('crypto') || name.includes('tls') || name.includes('ssh') || name.includes('vault') || name.includes('secret')) out.push('security');

  // Data & AI
  if (name.includes('search') || name.includes('vector') || name.includes('elastic')) out.push('search');
  if (name.includes('llm') || name.includes('langchain') || name.includes('rag') || name.includes('embed') || name.includes('openai')) out.push('llm-applications');
  if (name.includes('pipeline') || name.includes('etl') || name.includes('dbt') || name.includes('airflow') || name.includes('spark')) out.push('data-engineering');
  if (name.includes('ml') || name.includes('model') || name.includes('train') || name.includes('inference')) out.push('ml-infrastructure');

  // Payment & Fintech
  if (name.includes('payment') || name.includes('billing') || name.includes('stripe') || name.includes('fintech') || name.includes('trading')) out.push('fintech');

  // Frontend
  if (name.includes('react') || name.includes('nextjs') || name.includes('next-app')) out.push('frontend-react');
  if (name.includes('vue') || name.includes('nuxt')) out.push('frontend-vue');

  // Systems
  if (name.includes('wasm') || name.includes('webassembly')) out.push('webassembly');
  if (name.includes('embed') || name.includes('firmware') || name.includes('rtos') || name.includes('arduino')) out.push('embedded-systems');
  if (name.includes('compiler') || name.includes('parser') || name.includes('-lang') || name.includes('language')) out.push('compiler-design');

  // Database
  if (name.includes('db') || name.includes('database') || name.includes('storage') || name.includes('sql')) out.push('databases');

  // API & Tooling
  if (name.includes('graphql') || name.includes('openapi') || name.includes('swagger') || name.includes('grpc')) out.push('api-design');
  if (name.includes('cli') || name.includes('terminal') || name.includes('shell')) out.push('cli-tools');
  if (name.includes('test') || name.includes('spec') || name.includes('e2e') || name.includes('playwright')) out.push('testing');
  if (name.includes('lint') || name.includes('format') || name.includes('lsp') || name.includes('build')) out.push('developer-tools');

  // Blockchain
  if (name.includes('ethereum') || name.includes('solidity') || name.includes('web3') || name.includes('blockchain')) out.push('blockchain');

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

/** Returns true if vectors were built (developer met completeness threshold),
 *  false if skipped. The caller uses this to decide whether to mark complete. */
export async function buildVectorsForDeveloper(env: Env, developerId: string): Promise<boolean> {
  const db = createDB(env.DB);

  // Completeness gate: don't write to Vectorize for empty profiles.
  // Empty profiles appear as valid search matches and pollute results.
  const queries = new Queries(db);
  const meetsThreshold = await queries.meetsCompletenessThreshold(developerId);
  if (!meetsThreshold) {
    console.warn(`[buildVectors] Developer ${developerId} below completeness threshold — skipping Vectorize upsert`);
    return false;
  }

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

  const portfolioRows = await db
    .select({ repoFullName: developerRepoPortfolios.repoFullName, stars: developerRepoPortfolios.stars })
    .from(developerRepoPortfolios)
    .where(eq(developerRepoPortfolios.developerId, developerId))
    .orderBy(desc(developerRepoPortfolios.recentContribCount12mo), desc(developerRepoPortfolios.stars))
    .limit(10)
    .all();

  // Ensure at least one domain so the vector exists.
  const finalDomains = domains.length > 0
    ? domains
    : [{ domain: DEFAULT_DOMAIN, score: 1, evidenceRepos: [] }];

  await upsertDeveloperVector(env.AI, env.VECTOR_INDEX, developerId, finalDomains, topLanguages, portfolioRows);
  return true;
}
