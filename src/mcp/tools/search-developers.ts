// src/mcp/tools/search-developers.ts
import { searchDevelopersInputSchema, type SearchDevelopersOutput, type DeveloperSummary } from '../../schemas/mcp';
import type { Env } from '../../types/env';
import { executeSearch } from '../../search/query-parser';
import { createDB } from '../../db/client';
import { Queries } from '../../db/queries';

async function generateMatchExplanation(
  env: Env,
  query: string,
  username: string,
  topDomainNames: string[],
  topLangNames: string[],
  overallImpact: number,
  repoCount: number,
): Promise<string> {
  const prompt = `Write one sentence explaining why this developer matches the search query for the role described.
Query: "${query}"
Developer: domains=${topDomainNames.join(', ')}, languages=${topLangNames.join(', ')}, impact=${overallImpact}/100, ${repoCount} repos.
Start with "They've" or "Strong match:". One sentence only.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiResponse = await (env.AI as any).run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a technical recruiting analyst. Write a single, specific, factual sentence.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 80,
    temperature: 0.4,
  }) as { response: string };

  return aiResponse.response.trim().replace(/\n.*/s, ''); // first sentence only
}

export async function searchDevelopers(
  input: unknown,
  env: Env,
): Promise<SearchDevelopersOutput> {
  const parsed = searchDevelopersInputSchema.parse(input);
  const db = new Queries(createDB(env.DB));
  const limit = parsed.limit ?? 10;

  // Execute combined vector + SQL search
  const searchResults = await executeSearch(env, parsed);

  const developers: DeveloperSummary[] = [];

  for (const result of searchResults) {
    const dev = await db.getDeveloper(result.developerId);
    if (!dev) continue;

    // raw SQL for complex aggregation: top 3 domains
    const domainRows = await env.DB.prepare(
      'SELECT domain, score FROM developer_domains WHERE developer_id = ? ORDER BY score DESC LIMIT 3'
    ).bind(dev.id).all();

    // raw SQL for complex aggregation: language frequency
    const langRows = await env.DB.prepare(
      'SELECT languages FROM contributions WHERE developer_id = ? AND languages IS NOT NULL LIMIT 100'
    ).bind(dev.id).all();

    const langCounts = new Map<string, number>();
    for (const row of langRows.results) {
      const langs: string[] = JSON.parse(row.languages as string);
      for (const lang of langs) {
        langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
      }
    }
    const totalLang = [...langCounts.values()].reduce((a, b) => a + b, 0) || 1;
    const topLanguages = [...langCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => ({ language: lang, percentage: Math.round(count / totalLang * 100) }));

    // raw SQL: active repo count
    const repoCount = await env.DB.prepare(
      'SELECT COUNT(DISTINCT repo_full_name) as cnt FROM contributions WHERE developer_id = ?'
    ).bind(dev.id).first() as { cnt: number } | null;

    const overallImpact = (dev as unknown as { overallImpact: number }).overallImpact ?? 0;
    const recentActivityScore = (dev as unknown as { recentActivityScore: number }).recentActivityScore ?? 0;
    const recentActivity: DeveloperSummary['recentActivity'] =
      recentActivityScore > 70 ? 'highly_active' :
      recentActivityScore > 40 ? 'active' :
      recentActivityScore > 15 ? 'moderate' : 'low';

    const topDomains = domainRows.results.map(r => ({ domain: r.domain as string, score: r.score as number }));
    const topDomainNames = topDomains.map(d => d.domain);
    const topLangNames = topLanguages.map(l => l.language);
    const cnt = repoCount?.cnt ?? 0;

    const matchExplanation = await generateMatchExplanation(
      env, parsed.query, dev.username, topDomainNames, topLangNames, overallImpact, cnt,
    );

    developers.push({
      githubUsername: dev.username,
      githubUrl: `https://github.com/${dev.username}`,
      overallImpact,
      codeQualityPercentile: (dev as unknown as { codeQuality: number }).codeQuality ?? 0,
      reviewQualityPercentile: (dev as unknown as { reviewQuality: number }).reviewQuality ?? 0,
      topDomains,
      topLanguages,
      activeReposCount: cnt,
      recentActivity,
      matchExplanation,
    });
  }

  return {
    developers,
    totalMatches: developers.length,
    queryInterpretation: `Searched for: "${parsed.query}"${parsed.domains ? ` in domains: ${parsed.domains.join(', ')}` : ''}${parsed.languages ? ` with languages: ${parsed.languages.join(', ')}` : ''}. Filtered by: quality >= ${parsed.minQualityScore ?? 'any'}, review >= ${parsed.minReviewScore ?? 'any'}.`,
  };
}
