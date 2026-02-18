// src/search/vector-store.ts
import { embed, embedBatch } from './embeddings';

export interface DeveloperDomainVector {
  developerId: string;
  domain: string;
  score: number;
  contributionCount: number;
}

/**
 * Build the text representation of a developer's domain expertise
 * that will be embedded into the vector space.
 */
function buildDomainText(
  developerId: string,
  domains: { domain: string; score: number; evidenceRepos: string[] }[],
  languages: string[]
): string {
  const domainParts = domains
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(d => `${d.domain} (score: ${Math.round(d.score)}, repos: ${d.evidenceRepos.slice(0, 3).join(', ')})`);

  return `Software developer with expertise in: ${domainParts.join('; ')}. Languages: ${languages.join(', ')}.`;
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
  languages: string[]
): Promise<string> {
  if (domains.length === 0) return '';

  const text = buildDomainText(developerId, domains, languages);
  const vector = await embed(ai, text);
  const vectorId = `dev-${developerId}`;

  await vectorIndex.upsert([{
    id: vectorId,
    values: vector,
    metadata: {
      developerId,
      topDomain: domains[0]?.domain ?? 'unknown',
      topScore: domains[0]?.score ?? 0,
      domainCount: domains.length,
      languages: languages.join(','),
    },
  }]);

  return vectorId;
}

/**
 * Search for developers whose domain profile is semantically similar to a query.
 */
export async function searchDevelopersByDomain(
  ai: Ai,
  vectorIndex: VectorizeIndex,
  query: string,
  topK: number = 50
): Promise<{ developerId: string; similarity: number }[]> {
  const queryVector = await embed(ai, query);

  const results = await vectorIndex.query(queryVector, {
    topK,
    returnMetadata: 'all',
  });

  return results.matches.map(m => ({
    developerId: (m.metadata?.developerId as string) ?? m.id.replace('dev-', ''),
    similarity: m.score,
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
