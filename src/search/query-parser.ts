// src/search/query-parser.ts
import type { SearchDevelopersInput } from '../schemas/mcp';
import { searchDevelopersByDomain, type VectorMatch } from './vector-store';
import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { developers } from '../db/schema';
import { and, desc, eq, gte, inArray, isNotNull, gt, sql } from 'drizzle-orm';

// ── Keyword extraction ────────────────────────────────────────────────────────
// Maps query text tokens to canonical domain/language labels so we can boost
// candidates whose Vectorize metadata actually contains those signals.

const LANGUAGE_ALIASES: Record<string, string> = {
  rust: 'Rust', go: 'Go', golang: 'Go',
  python: 'Python', py: 'Python',
  typescript: 'TypeScript', ts: 'TypeScript',
  javascript: 'JavaScript', js: 'JavaScript',
  java: 'Java', kotlin: 'Kotlin',
  swift: 'Swift', ruby: 'Ruby',
  scala: 'Scala', elixir: 'Elixir',
  haskell: 'Haskell', dart: 'Dart',
  zig: 'Zig', lua: 'Lua',
  'c++': 'C++', cpp: 'C++', 'c#': 'C#', csharp: 'C#',
  php: 'PHP', shell: 'Shell', sql: 'SQL',
};

const DOMAIN_SIGNALS: Array<{ terms: string[]; domain: string }> = [
  { terms: ['distributed', 'raft', 'consensus', 'paxos'],     domain: 'distributed-systems' },
  { terms: ['network', 'tcp', 'grpc', 'http', 'protocol'],    domain: 'networking' },
  { terms: ['database', 'sql', 'nosql', 'storage', 'query'],  domain: 'databases' },
  { terms: ['react', 'nextjs', 'next.js', 'jsx', 'tsx'],      domain: 'frontend-react' },
  { terms: ['vue', 'nuxt'],                                    domain: 'frontend-vue' },
  { terms: ['ml', 'machine learning', 'mlops', 'model'],       domain: 'ml-infrastructure' },
  { terms: ['llm', 'rag', 'langchain', 'openai', 'agent'],    domain: 'llm-applications' },
  { terms: ['payment', 'fintech', 'banking', 'trading'],       domain: 'fintech' },
  { terms: ['kubernetes', 'k8s', 'operator', 'helm'],         domain: 'kubernetes' },
  { terms: ['security', 'crypto', 'auth', 'zero trust'],      domain: 'security' },
  { terms: ['cli', 'terminal', 'command line', 'shell'],       domain: 'cli-tools' },
  { terms: ['compiler', 'parser', 'ast', 'bytecode'],         domain: 'compiler-design' },
  { terms: ['backend', 'api', 'server', 'rest', 'microservice'], domain: 'web-backend' },
  { terms: ['graphql', 'openapi', 'grpc', 'gateway'],         domain: 'api-design' },
  { terms: ['terraform', 'pulumi', 'cdk', 'infra', 'iac'],    domain: 'cloud-infrastructure' },
  { terms: ['ci', 'cd', 'devops', 'docker', 'gitops'],        domain: 'devops' },
  { terms: ['otel', 'tracing', 'metrics', 'grafana', 'prometheus'], domain: 'observability' },
  { terms: ['data pipeline', 'etl', 'dbt', 'airflow', 'spark'], domain: 'data-engineering' },
  { terms: ['devtool', 'linter', 'formatter', 'lsp', 'build'], domain: 'developer-tools' },
  { terms: ['test', 'e2e', 'qa', 'playwright', 'property'],   domain: 'testing' },
  { terms: ['systems', 'kernel', 'embedded', 'firmware'],     domain: 'systems-programming' },
  { terms: ['wasm', 'webassembly'],                            domain: 'webassembly' },
  { terms: ['ios', 'swift', 'swiftui', 'cocoa'],              domain: 'mobile-ios' },
  { terms: ['android', 'jetpack', 'compose'],                 domain: 'mobile-android' },
  { terms: ['oauth', 'iam', 'identity', 'passkey', 'saml'],   domain: 'authentication' },
  { terms: ['search', 'elasticsearch', 'vector search'],      domain: 'search' },
  { terms: ['game', 'godot', 'unity', 'ecs'],                 domain: 'game-development' },
  { terms: ['ethereum', 'solidity', 'web3', 'blockchain'],    domain: 'blockchain' },
];

interface QuerySignals {
  domains:   string[];
  languages: string[];
}

function extractSignals(input: SearchDevelopersInput): QuerySignals {
  const text = (input.query ?? '').toLowerCase();

  // Explicit inputs take priority
  const domains   = new Set<string>(input.domains ?? []);
  const languages = new Set<string>(input.languages ?? []);

  // Detect language names in free text
  for (const [alias, canonical] of Object.entries(LANGUAGE_ALIASES)) {
    if (text.includes(alias)) languages.add(canonical);
  }

  // Detect domain signals in free text
  for (const { terms, domain } of DOMAIN_SIGNALS) {
    if (terms.some(t => text.includes(t))) domains.add(domain);
  }

  return { domains: [...domains], languages: [...languages] };
}

// ── Hybrid scoring ────────────────────────────────────────────────────────────
// Blend semantic vector similarity (what the developer does) with explicit
// keyword overlap (does the developer actually know Rust / distributed-systems?).
//
// When the query has no extractable signals, fall back to pure vector similarity
// so broad queries ("great senior engineer") still return meaningful results.

function hybridScore(
  match: VectorMatch,
  signals: QuerySignals,
): number {
  const { similarity, domains: devDomains, languages: devLangs } = match;
  const hasSignals = signals.domains.length > 0 || signals.languages.length > 0;
  if (!hasSignals) return similarity;

  // Domain overlap: fraction of query domains present in this developer's domains
  const domainHits = signals.domains.filter(qd =>
    devDomains.some(dd => dd === qd || dd.includes(qd) || qd.includes(dd))
  ).length;
  const domainScore = signals.domains.length > 0
    ? domainHits / signals.domains.length
    : 0;

  // Language overlap: fraction of query languages present in this developer
  const langHits = signals.languages.filter(ql =>
    devLangs.some(dl => dl.toLowerCase() === ql.toLowerCase())
  ).length;
  const langScore = signals.languages.length > 0
    ? langHits / signals.languages.length
    : 0;

  const keywordScore = Math.max(domainScore, langScore);

  // 50/50 blend: semantics keep results coherent, keywords enforce specificity.
  // A developer who matches semantically but not on keywords gets penalised;
  // one who matches both gets a strong boost.
  return similarity * 0.5 + keywordScore * 0.5;
}

// ── Query text builder ────────────────────────────────────────────────────────
// Produce richer query text that mirrors the structure of our developer vectors.

function buildSearchText(input: SearchDevelopersInput): string {
  const parts: string[] = [];
  if (input.query)           parts.push(input.query);
  if (input.domains?.length) parts.push(`specializing in ${input.domains.join(', ')}`);
  if (input.languages?.length) parts.push(`using ${input.languages.join(', ')}`);
  return `Software engineer with expertise in: ${parts.join('. ')}`;
}

// ── Main search ───────────────────────────────────────────────────────────────

export async function executeSearch(
  env: Env,
  input: SearchDevelopersInput
): Promise<{ developerId: string; similarity: number }[]> {
  const searchText = buildSearchText(input);

  // 1. Semantic vector search — over-fetch so hybrid rescoring has headroom.
  const vectorResults = await searchDevelopersByDomain(
    env.AI, env.VECTOR_INDEX, searchText, Math.max(50, (input.limit ?? 10) * 8),
  );

  const db = createDB(env.DB);

  // Fallback when index is empty (pipeline still catching up)
  if (vectorResults.length === 0) {
    const rows = await db
      .select({ id: developers.id })
      .from(developers)
      .where(and(
        eq(developers.optedOut, false),
        eq(developers.ingestionStatus, 'complete'),
        gt(developers.overallImpact, 0),
      ))
      .orderBy(desc(developers.overallImpact))
      .limit(input.limit ?? 10)
      .all();
    return rows.map((r, i) => ({ developerId: r.id, similarity: 1 - i * 0.05 }));
  }

  // 2. Extract keyword signals from the query for hybrid rescoring.
  const signals = extractSignals(input);

  // 3. Rescore every candidate: blend vector similarity with keyword overlap.
  const rescored = vectorResults.map(m => ({
    developerId: m.developerId,
    similarity:  hybridScore(m, signals),
  })).sort((a, b) => b.similarity - a.similarity);

  // 4. Resolve the top candidates against D1 to enforce status + score gates.
  const candidateIds = rescored.map(r => r.developerId);
  const conditions = [
    inArray(developers.id, candidateIds),
    eq(developers.optedOut, false),
    eq(developers.ingestionStatus, 'complete'),
    gt(developers.overallImpact, 0),
  ];

  if (input.minQualityScore !== undefined)
    conditions.push(gte(developers.codeQuality, input.minQualityScore));
  if (input.minReviewScore !== undefined)
    conditions.push(gte(developers.reviewQuality, input.minReviewScore));
  if (input.activeWithinMonths !== undefined) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - input.activeWithinMonths);
    conditions.push(sql`${developers.lastIngestedAt} > ${cutoff.toISOString()}`);
  }

  const qualified = await db
    .select({ id: developers.id })
    .from(developers)
    .where(and(...conditions))
    .all();

  const qualifiedSet = new Set(qualified.map(r => r.id));

  // 5. Return in hybrid-score order, limited to qualified developers.
  return rescored
    .filter(r => qualifiedSet.has(r.developerId))
    .slice(0, input.limit ?? 10);
}
