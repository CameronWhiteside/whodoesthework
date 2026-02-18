// src/search/vector-store.ts
import { embed, embedBatch } from './embeddings';

export interface DeveloperDomainVector {
  developerId: string;
  domain: string;
  score: number;
  contributionCount: number;
}

/**
 * Build a rich, discriminating text representation of a developer's domain expertise.
 *
 * The key insight: repo names (e.g. "tokio-rs/tokio", "vercel/next.js") are the
 * strongest discriminating signal in the embedding space. Two developers with the
 * same language (TypeScript) but different repos (react vs. nestjs vs. deno) will
 * land in very different vector regions. Generic domain labels alone cluster everyone
 * together. Repo names pull them apart.
 */
function buildDomainText(
  domains: { domain: string; score: number; evidenceRepos: string[] }[],
  languages: string[],
  portfolioRepos: { repoFullName: string; stars: number }[],
): string {
  const topDomains = [...domains].sort((a, b) => b.score - a.score).slice(0, 6);

  // Collect concrete repo names — the primary discriminating signal.
  const allRepos = [
    ...new Set(topDomains.flatMap(d => d.evidenceRepos.slice(0, 3))),
  ].slice(0, 10);

  const primaryDomain = topDomains[0]?.domain ?? 'software development';
  const domainList = topDomains.map(d => `${d.domain} (${Math.round(d.score)}/100)`).join(', ');
  const repoLine   = allRepos.length  > 0 ? `Key repositories: ${allRepos.join(', ')}. ` : '';
  const langLine   = languages.length > 0 ? `Primary languages: ${languages.join(', ')}. ` : '';

  const portfolioLine = portfolioRepos.length > 0
    ? `Portfolio repos: ${portfolioRepos.slice(0, 8).map(r => `${r.repoFullName} (${r.stars}★)`).join(', ')}. `
    : '';

  return (
    `Software engineer specializing in ${primaryDomain}. ` +
    repoLine +
    langLine +
    portfolioLine +
    `Domain expertise: ${domainList}.`
  );
}

/**
 * Upsert a developer's domain vector into Vectorize.
 * We store ONE vector per developer, representing their overall domain profile.
 */
export async function upsertDeveloperVector(
  ai: Ai,
  vectorIndex: VectorizeIndex,
  developerId: string,
  domains: { domain: string; score: number; evidenceRepos: string[] }[],
  languages: string[],
  portfolioRepos: { repoFullName: string; stars: number }[] = [],
): Promise<string> {
  if (domains.length === 0) return '';

  const text = buildDomainText(domains, languages, portfolioRepos);
  const vector = await embed(ai, text);
  const vectorId = `dev-${developerId}`;

  // Store all domain names + languages in metadata so hybrid rescoring
  // in executeSearch can filter/boost without additional D1 round-trips.
  const sortedDomains = [...domains].sort((a, b) => b.score - a.score);
  await vectorIndex.upsert([{
    id: vectorId,
    values: vector,
    metadata: {
      developerId,
      domains:   sortedDomains.slice(0, 8).map(d => d.domain).join(','),
      topDomain: sortedDomains[0]?.domain ?? 'unknown',
      topScore:  sortedDomains[0]?.score  ?? 0,
      languages: languages.slice(0, 6).join(','),
      facets: 'scale,topics',
    },
  }]);

  return vectorId;
}

export interface VectorMatch {
  developerId: string;
  similarity:  number;
  domains:     string[];   // from Vectorize metadata — no extra D1 query needed
  languages:   string[];
}

/**
 * Search for developers whose domain profile is semantically similar to a query.
 * Returns metadata alongside similarity so callers can apply hybrid rescoring.
 */
export async function searchDevelopersByDomain(
  ai: Ai,
  vectorIndex: VectorizeIndex,
  query: string,
  topK: number = 50
): Promise<VectorMatch[]> {
  const queryVector = await embed(ai, query);

  const results = await vectorIndex.query(queryVector, {
    topK,
    returnMetadata: 'all',
  });

  return results.matches.map(m => ({
    developerId: (m.metadata?.developerId as string) ?? m.id.replace('dev-', ''),
    similarity:  m.score,
    domains:     ((m.metadata?.domains   as string) ?? '').split(',').filter(Boolean),
    languages:   ((m.metadata?.languages as string) ?? '').split(',').filter(Boolean),
  }));
}

/**
 * Also store individual domain vectors for more granular matching.
 * One vector per (developer, domain) pair.
 */
export async function upsertDomainVectors(
  ai: Ai,
  vectorIndex: VectorizeIndex,
  developerId: string,
  domains: { domain: string; score: number; evidenceRepos: string[] }[]
): Promise<void> {
  if (domains.length === 0) return;

  // Build texts for batch embedding
  const texts = domains.map(d =>
    `${d.domain}: developer with score ${Math.round(d.score)} in ${d.domain}, working on ${d.evidenceRepos.slice(0, 3).join(', ')}`
  );

  const vectors = await embedBatch(ai, texts);

  const vectorEntries = domains.map((d, i) => ({
    id: `dom-${developerId}-${d.domain}`,
    values: vectors[i]!,
    metadata: {
      developerId,
      domain: d.domain,
      score: d.score,
      contributionCount: 0, // filled later if needed
    },
  }));

  await vectorIndex.upsert(vectorEntries);
}
