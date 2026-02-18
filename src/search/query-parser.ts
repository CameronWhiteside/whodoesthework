// src/search/query-parser.ts
import type { SearchDevelopersInput } from '../schemas/mcp';
import { searchDevelopersByDomain } from './vector-store';
import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { developers } from '../db/schema';
import { and, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';

export async function executeSearch(
  env: Env,
  input: SearchDevelopersInput
): Promise<{ developerId: string; similarity: number }[]> {
  // Step 1: Semantic search via Vectorize
  const searchText = buildSearchText(input);
  const vectorResults = await searchDevelopersByDomain(
    env.AI, env.VECTOR_INDEX, searchText, (input.limit ?? 10) * 5 // over-fetch for filtering
  );

  // If the vector index is empty (or not built yet), fall back to a simple
  // top-scored list so the demo remains usable while the pipeline catches up.
  if (vectorResults.length === 0) {
    const db = createDB(env.DB);
    const rows = await db
      .select({ id: developers.id })
      .from(developers)
      .where(and(
        eq(developers.optedOut, false),
        eq(developers.ingestionStatus, 'complete'),
        isNotNull(developers.overallImpact),
      ))
      .orderBy(desc(developers.overallImpact))
      .limit(input.limit ?? 10)
      .all();

    return rows.map((r, i) => ({ developerId: r.id, similarity: 1 - i * 0.01 }));
  }

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
    .orderBy(desc(developers.overallImpact))
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
