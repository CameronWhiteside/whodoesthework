# Spec 06 — Vectorize Semantic Search

**Status:** Not Started
**Blocks:** spec-07 (MCP search tool needs vector search for domain matching)
**Blocked By:** spec-00 (types), spec-01 (D1 schema), spec-04 (domain tags), spec-05 (domain scores)
**Parallelizable with:** Can build the infrastructure in parallel; needs domain data to be useful
**Estimated effort:** 3-4 hours

---

## Objective

Build the vector search layer using Cloudflare Vectorize. When a user queries "find me a developer who does distributed consensus," we embed that query and find developers whose domain profiles are semantically similar — even if the exact term "distributed consensus" doesn't appear in their domain tags.

---

## Research: Step 0

**Question:** Vectorize dimensions and distance metric. What embedding model is available via Workers AI, and what vector size does it produce?

**Resolution path:**
1. Check Workers AI docs for available embedding models
2. Likely: `@cf/baai/bge-base-en-v1.5` (768 dimensions) or `@cf/baai/bge-small-en-v1.5` (384 dimensions)
3. Smaller = faster + cheaper. Use `bge-small-en-v1.5` (384) for MVP unless accuracy is unacceptable.
4. Distance metric: cosine similarity (standard for text embeddings)

**Time-box:** 30 minutes.

---

## Execution Steps

### Step 1: Create the Vectorize index

```bash
npx wrangler vectorize create wdtw-vectors \
  --dimensions=384 \
  --metric=cosine
```

Update `wrangler.jsonc` with the returned index info (should already be declared from spec-00).

### Step 2: Embedding Helper

Create `src/search/embeddings.ts`.

```typescript
// src/search/embeddings.ts

const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5';

export async function embed(ai: Ai, text: string): Promise<number[]> {
  const result = await ai.run(EMBEDDING_MODEL, {
    text: [text],
  }) as { data: number[][] };

  return result.data[0];
}

export async function embedBatch(ai: Ai, texts: string[]): Promise<number[][]> {
  // Workers AI supports batch embedding
  const result = await ai.run(EMBEDDING_MODEL, {
    text: texts,
  }) as { data: number[][] };

  return result.data;
}
```

### Step 3: Vector Store Interface

Create `src/search/vector-store.ts` — manages inserting and querying developer domain vectors.

```typescript
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
    values: vectors[i],
    metadata: {
      developerId,
      domain: d.domain,
      score: d.score,
      contributionCount: 0, // filled later if needed
    },
  }));

  await vectorIndex.upsert(vectorEntries);
}
```

### Step 4: Build Vectors Queue Handler

Handle the `build_vectors` message — called after scoring completes.

```typescript
// Add to queue-handler.ts
case 'build_vectors': {
  const { upsertDeveloperVector, upsertDomainVectors } = await import('../search/vector-store');
  const { createDB } = await import('../db/client');
  const { developerDomains, contributions: contributionsTable } = await import('../db/schema');
  const { eq, isNotNull, and } = await import('drizzle-orm');

  const db = createDB(env.DB);
  const developerId = msg.body.developerId;

  // Fetch domain scores
  const domainRows = await db
    .select({
      domain: developerDomains.domain,
      score: developerDomains.score,
      evidenceRepos: developerDomains.evidenceRepos,
    })
    .from(developerDomains)
    .where(eq(developerDomains.developerId, developerId))
    .all();

  const domains = domainRows.map(r => ({
    domain: r.domain,
    score: r.score,
    evidenceRepos: JSON.parse(r.evidenceRepos ?? '[]') as string[],
  }));

  // Fetch languages from contributions
  const langRows = await db
    .select({ languages: contributionsTable.languages })
    .from(contributionsTable)
    .where(and(
      eq(contributionsTable.developerId, developerId),
      isNotNull(contributionsTable.languages),
    ))
    .all();

  const languageSet = new Set<string>();
  for (const row of langRows) {
    const langs: string[] = JSON.parse(row.languages as string);
    langs.forEach(l => languageSet.add(l));
  }
  const languages = [...languageSet];

  // Upsert vectors
  await upsertDeveloperVector(env.AI, env.VECTOR_INDEX, developerId, domains, languages);
  await upsertDomainVectors(env.AI, env.VECTOR_INDEX, developerId, domains);

  // Update embedding_id in developer_domains
  for (const d of domains) {
    await db.update(developerDomains)
      .set({ embeddingId: `dom-${developerId}-${d.domain}` })
      .where(and(
        eq(developerDomains.developerId, developerId),
        eq(developerDomains.domain, d.domain),
      ))
      .run();
  }

  console.log(`Built ${domains.length + 1} vectors for developer ${developerId}`);
  break;
}
```

### Step 5: Query Parser

Create `src/search/query-parser.ts` — takes natural language queries and produces a structured search combining vector similarity with D1 filters.

```typescript
// src/search/query-parser.ts
import type { SearchDevelopersInput } from '../schemas/mcp';
import { searchDevelopersByDomain } from './vector-store';
import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { developers } from '../db/schema';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';

export async function executeSearch(
  env: Env,
  input: SearchDevelopersInput
): Promise<{ developerId: string; similarity: number }[]> {
  // Step 1: Semantic search via Vectorize
  const searchText = buildSearchText(input);
  const vectorResults = await searchDevelopersByDomain(
    env.AI, env.VECTOR_INDEX, searchText, (input.limit ?? 10) * 5 // over-fetch for filtering
  );

  if (vectorResults.length === 0) return [];

  const db = createDB(env.DB);
  const candidateIds = vectorResults.map(r => r.developerId);

  // Step 2: Filter via Drizzle with optional score thresholds
  const conditions = [
    inArray(developers.id, candidateIds),
    eq(developers.optedOut, false),
    eq(developers.ingestionStatus, 'complete'),
  ];

  if (input.minQualityScore !== undefined) {
    conditions.push(gte(developers.codeQuality, input.minQualityScore));
  }
  if (input.minReviewScore !== undefined) {
    conditions.push(gte(developers.reviewQuality, input.minReviewScore));
  }
  if (input.activeWithinMonths !== undefined) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - input.activeWithinMonths);
    conditions.push(sql`${developers.lastIngestedAt} > ${cutoff.toISOString()}`);
  }

  const filtered = await db
    .select({ id: developers.id, overallImpact: developers.overallImpact })
    .from(developers)
    .where(and(...conditions))
    .orderBy(developers.overallImpact)
    .limit(input.limit ?? 10)
    .all();

  const filteredIds = new Set(filtered.map(r => r.id));

  // Merge: keep vector similarity order but only return filtered results
  return vectorResults
    .filter(r => filteredIds.has(r.developerId))
    .slice(0, input.limit ?? 10);
}

function buildSearchText(input: SearchDevelopersInput): string {
  const parts: string[] = [];
  if (input.query) parts.push(input.query);
  if (input.domains?.length) parts.push(`domains: ${input.domains.join(', ')}`);
  if (input.languages?.length) parts.push(`languages: ${input.languages.join(', ')}`);
  return parts.join('. ');
}
```

### Step 6: Admin endpoint for testing

```typescript
if (url.pathname === '/admin/search' && request.method === 'POST') {
  const input = await request.json() as SearchDevelopersInput;
  const { executeSearch } = await import('./search/query-parser');
  const results = await executeSearch(env, input);
  return Response.json(results);
}
```

---

## Definition of Done

- [ ] Vectorize index created and accessible from Worker
- [ ] `embed` produces a 384-dimensional vector for a text input
- [ ] `upsertDeveloperVector` inserts a developer vector that can be retrieved
- [ ] `searchDevelopersByDomain` returns relevant results for "distributed systems" query
- [ ] `executeSearch` combines vector results with D1 score filters
- [ ] After a developer is scored and vectorized, they appear in search results
- [ ] `/admin/search` returns ranked results for a test query

## Output Artifacts

- `src/search/embeddings.ts`
- `src/search/vector-store.ts`
- `src/search/query-parser.ts`
