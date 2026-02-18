// src/mcp/tools/compare-developers.ts
import { compareDevelopersInputSchema, type ComparisonResult } from '../../schemas/mcp';
import type { Env } from '../../types/env';
import { createDB } from '../../db/client';
import { Queries } from '../../db/queries';

export async function compareDevelopers(
  input: unknown,
  env: Env,
): Promise<ComparisonResult> {
  const params = compareDevelopersInputSchema.parse(input);
  const db = new Queries(createDB(env.DB));

  const profiles: {
    github_username: string;
    overall_impact: number;
    code_quality: number;
    review_quality: number;
    documentation_quality: number;
    collaboration_breadth: number;
    consistency_score: number;
    domains: { domain: string; score: number }[];
  }[] = [];
  const missing: string[] = [];

  for (const username of params.githubUsernames) {
    const dev = await db.getDeveloperByUsername(username);
    if (!dev || (dev as unknown as { ingestionStatus: string }).ingestionStatus !== 'complete') {
      missing.push(username);
      continue;
    }

    const domainRows = await env.DB.prepare(
      'SELECT domain, score FROM developer_domains WHERE developer_id = ? ORDER BY score DESC LIMIT 5'
    ).bind(dev.id).all();

    const devRow = dev as unknown as {
      overallImpact: number | null;
      codeQuality: number | null;
      reviewQuality: number | null;
      documentationQuality: number | null;
      collaborationBreadth: number | null;
      consistencyScore: number | null;
    };

    profiles.push({
      github_username: dev.username,
      overall_impact: devRow.overallImpact ?? 0,
      code_quality: devRow.codeQuality ?? 0,
      review_quality: devRow.reviewQuality ?? 0,
      documentation_quality: devRow.documentationQuality ?? 0,
      collaboration_breadth: devRow.collaborationBreadth ?? 0,
      consistency_score: devRow.consistencyScore ?? 0,
      domains: domainRows.results.map(r => ({ domain: r.domain as string, score: r.score as number })),
    });
  }

  // Trigger ingestion for missing developers
  for (const username of missing) {
    const doId = env.INGESTION_DO.idFromName(username);
    const doStub = env.INGESTION_DO.get(doId);
    await doStub.fetch(new Request('http://do/ingest', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }));
  }

  if (profiles.length < 2) {
    return {
      developers: profiles,
      comparisonSummary: `Need at least 2 scored developers to compare. Missing/unscored: ${missing.join(', ')}. Ingestion has been triggered — please retry in 10-15 minutes.`,
      dimensionRankings: [],
    };
  }

  // Dimension rankings
  const dimensions = [
    'overall_impact', 'code_quality', 'review_quality',
    'documentation_quality', 'collaboration_breadth', 'consistency_score',
  ];

  const dimensionRankings = dimensions.map(dim => ({
    dimension: dim,
    rankedUsernames: [...profiles]
      .sort((a, b) => ((b as unknown as Record<string, number>)[dim] ?? 0) - ((a as unknown as Record<string, number>)[dim] ?? 0))
      .map(p => p.github_username),
  }));

  // Domain-specific rankings for focus domains
  if (params.focusDomains) {
    for (const domain of params.focusDomains) {
      const domainScores = profiles.map(p => ({
        username: p.github_username,
        score: p.domains.find(d => d.domain === domain)?.score ?? 0,
      }));
      dimensionRankings.push({
        dimension: `domain:${domain}`,
        rankedUsernames: domainScores.sort((a, b) => b.score - a.score).map(d => d.username),
      });
    }
  }

  // AI comparison summary
  const summaryPrompt = `Compare these software developers based on their scores. Be concise (2-3 sentences).

${profiles.map(p => `${p.github_username}: overall=${p.overall_impact}, code_quality=${p.code_quality}, review_quality=${p.review_quality}, doc_quality=${p.documentation_quality}, domains=${p.domains.map(d => `${d.domain}(${d.score})`).join(', ')}`).join('\n')}

${params.focusDomains ? `Focus areas: ${params.focusDomains.join(', ')}` : ''}

Summary:`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiResponse = await (env.AI as any).run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a technical recruiting analyst. Provide brief, factual comparisons.' },
      { role: 'user', content: summaryPrompt },
    ],
    max_tokens: 200,
    temperature: 0.3,
  }) as { response: string };

  return {
    developers: profiles,
    comparisonSummary: aiResponse.response.trim(),
    dimensionRankings,
    ...(missing.length > 0 ? { pendingIngestion: missing } : {}),
  };
}
