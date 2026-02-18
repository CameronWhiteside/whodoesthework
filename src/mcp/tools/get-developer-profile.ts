// src/mcp/tools/get-developer-profile.ts
import { getDeveloperProfileInputSchema } from '../../schemas/mcp';
import type { DeveloperProfile } from '../../schemas/developer';
import type { Env } from '../../types/env';
import { createDB } from '../../db/client';
import { Queries } from '../../db/queries';
import {
  SCALE_COMMIT_KEYWORDS,
  SCALE_EVIDENCE_COMMIT_LIMIT,
  SCALE_EVIDENCE_REPO_LIMIT,
  SCALE_MIN_REPO_SCORE_FOR_EVIDENCE,
  TOPIC_EVIDENCE_COMMIT_LIMIT,
  TOPIC_MAX_REPO_CANDIDATES,
} from '../../shared/constants';
import { computeRepoScaleScore } from '../../experience/scale';
import { evaluateTopicExperience } from '../../experience/topic-experience';

export async function getDeveloperProfile(
  input: unknown,
  env: Env,
): Promise<DeveloperProfile | null> {
  const params = getDeveloperProfileInputSchema.parse(input);
  const db = new Queries(createDB(env.DB));
  const dev = await db.getDeveloperByUsername(params.githubUsername);

  if (!dev) {
    // Trigger ingestion for unknown developer
    const doId = env.INGESTION_DO.idFromName(params.githubUsername);
    const doStub = env.INGESTION_DO.get(doId);
    await doStub.fetch(new Request('http://do/ingest', {
      method: 'POST',
      body: JSON.stringify({ username: params.githubUsername }),
    }));
    return null;
  }

  const domainRows = await db.getDomainsByDeveloper(dev.id);
  const domains = domainRows.map(r => ({
    domain: r.domain,
    score: r.score,
    contributionCount: r.contributionCount,
    evidenceRepos: JSON.parse(r.evidenceRepos as string ?? '[]') as string[],
  }));

  // Evidence: top commits and reviews — raw SQL for ORDER BY quality_score
  let topCommits: { url: string; description: string; qualityScore: number }[] = [];
  let topReviews: { url: string; depthScore: number }[] = [];

  if (params.includeEvidence !== false) {
    const commitRows = await env.DB.prepare(
      `SELECT id, repo_full_name, message_head, quality_score FROM contributions
       WHERE developer_id = ? AND kind = 'commit' AND quality_score IS NOT NULL
       ORDER BY quality_score DESC LIMIT 5`
    ).bind(dev.id).all();

    topCommits = commitRows.results.map(r => ({
      url: `https://github.com/${r.repo_full_name}/commit/${r.id}`,
      description: (r.message_head as string ?? '').slice(0, 120),
      qualityScore: r.quality_score as number,
    }));

    const reviewRows = await env.DB.prepare(
      `SELECT id, repo_full_name, pr_number, depth_score FROM reviews
       WHERE developer_id = ? AND depth_score IS NOT NULL
       ORDER BY depth_score DESC LIMIT 5`
    ).bind(dev.id).all();

    topReviews = reviewRows.results.map(r => ({
      url: `https://github.com/${r.repo_full_name}/pull/${r.pr_number}#pullrequestreview-${r.id}`,
      depthScore: r.depth_score as number,
    }));
  }

  // Languages breakdown — raw SQL for aggregation
  const langRows = await env.DB.prepare(
    'SELECT languages FROM contributions WHERE developer_id = ? AND languages IS NOT NULL'
  ).bind(dev.id).all();

  const langCounts = new Map<string, number>();
  for (const row of langRows.results) {
    const langs: string[] = JSON.parse(row.languages as string);
    for (const lang of langs) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
  }
  const totalLang = [...langCounts.values()].reduce((a, b) => a + b, 0) || 1;
  const topLanguages = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => ({ language: lang, percentage: Math.round(count / totalLang * 100) }));

  // Contribution stats — raw SQL for MIN/MAX/COUNT aggregation
  const stats = await env.DB.prepare(
    `SELECT COUNT(*) as total, MIN(authored_at) as first_at, MAX(authored_at) as last_at
     FROM contributions WHERE developer_id = ?`
  ).bind(dev.id).first() as { total: number; first_at: string | null; last_at: string | null } | null;

  const spanMonths = stats?.first_at && stats?.last_at
    ? Math.round((new Date(stats.last_at).getTime() - new Date(stats.first_at).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0;

  // raw SQL: active repo count
  const repoCount = await env.DB.prepare(
    'SELECT COUNT(DISTINCT repo_full_name) as cnt FROM contributions WHERE developer_id = ?'
  ).bind(dev.id).first() as { cnt: number } | null;

  const devRow = dev as unknown as {
    overallImpact: number | null;
    codeQuality: number | null;
    reviewQuality: number | null;
    documentationQuality: number | null;
    collaborationBreadth: number | null;
    consistencyScore: number | null;
    recentActivityScore: number | null;
    scoreVersion: string | null;
    scoredAt: string | null;
  };

  // ---------------------------------------------------------------------------
  // Discovery: scale heuristic + topic experience
  // ---------------------------------------------------------------------------

  const portfolios = await db.getDeveloperRepoPortfolios(dev.id, TOPIC_MAX_REPO_CANDIDATES);
  const repoScale = portfolios
    .map((p) => ({
      repoFullName: p.repoFullName,
      stars: p.stars,
      contributorsCount: p.contributorsCount,
      recentContribCount12mo: p.recentContribCount12mo,
      totalContribCount: p.totalContribCount,
      scaleScore: computeRepoScaleScore({
        repoFullName: p.repoFullName,
        stars: p.stars,
        contributorsCount: p.contributorsCount,
        recentContribCount12mo: p.recentContribCount12mo,
        totalContribCount: p.totalContribCount,
      }),
    }))
    .sort((a, b) => b.scaleScore - a.scaleScore);

  const scaleEvidenceRepos = repoScale
    .filter((r) => r.scaleScore >= SCALE_MIN_REPO_SCORE_FOR_EVIDENCE)
    .slice(0, SCALE_EVIDENCE_REPO_LIMIT)
    .map(({ scaleScore: _scaleScore, ...rest }) => rest);

  const topScaleScores = repoScale.slice(0, 3).map((r) => r.scaleScore);
  const scaleScore = topScaleScores.length === 0
    ? 0
    : Math.round((topScaleScores.reduce((a, b) => a + b, 0) / topScaleScores.length) * 100) / 100;

  const scaleEvidenceCommits: { url: string; description: string }[] = [];
  if (scaleEvidenceRepos.length > 0) {
    const repoSet = new Set(scaleEvidenceRepos.map((r) => r.repoFullName));
    const recentRows = await env.DB.prepare(
      `SELECT id, repo_full_name, message_head FROM contributions
       WHERE developer_id = ? AND message_head IS NOT NULL
       ORDER BY authored_at DESC
       LIMIT 600`
    ).bind(dev.id).all();

    const keywords = SCALE_COMMIT_KEYWORDS.map((k) => k.toLowerCase());
    for (const row of recentRows.results) {
      const repoFullName = row.repo_full_name as string;
      if (!repoSet.has(repoFullName)) continue;
      const head = (row.message_head as string) ?? '';
      const lower = head.toLowerCase();
      if (!keywords.some((k) => lower.includes(k))) continue;
      scaleEvidenceCommits.push({
        url: `https://github.com/${repoFullName}/commit/${row.id}`,
        description: head.slice(0, 120),
      });
      if (scaleEvidenceCommits.length >= SCALE_EVIDENCE_COMMIT_LIMIT) break;
    }
  }

  const topicExperience = params.topics && params.topics.length > 0
    ? await evaluateTopicExperience(env, dev.id, params.topics)
    : [];

  const topicExperienceOut = topicExperience.map((t) => ({
    topic: t.topic,
    score: Math.max(0, Math.min(1, t.repos[0]?.similarity ?? 0)),
    evidenceRepos: t.repos,
    evidenceCommits: [] as { url: string; description: string }[],
  }));

  if (topicExperienceOut.length > 0) {
    const recentTopicRows = await env.DB.prepare(
      `SELECT id, repo_full_name, message_head FROM contributions
       WHERE developer_id = ? AND message_head IS NOT NULL
       ORDER BY authored_at DESC
       LIMIT 800`
    ).bind(dev.id).all();

    for (const topicRow of topicExperienceOut) {
      const allowed = new Set(topicRow.evidenceRepos.map((r) => r.repoFullName));
      for (const row of recentTopicRows.results) {
        const repoFullName = row.repo_full_name as string;
        if (!allowed.has(repoFullName)) continue;
        const head = (row.message_head as string) ?? '';
        topicRow.evidenceCommits.push({
          url: `https://github.com/${repoFullName}/commit/${row.id}`,
          description: head.slice(0, 120),
        });
        if (topicRow.evidenceCommits.length >= TOPIC_EVIDENCE_COMMIT_LIMIT) break;
      }
    }
  }

  const discovery: DeveloperProfile['discovery'] = {
    scale: {
      score: scaleScore,
      note: 'Scale is a heuristic proxy (stars, contributor counts, and sustained activity). Not a user-count claim.',
      evidenceRepos: scaleEvidenceRepos,
      evidenceCommits: scaleEvidenceCommits,
    },
    topicExperience: topicExperienceOut,
  };

  return {
    githubUsername: dev.username,
    githubUrl: `https://github.com/${dev.username}`,
    overallImpact: devRow.overallImpact ?? 0,
    codeQuality: devRow.codeQuality ?? 0,
    reviewQuality: devRow.reviewQuality ?? 0,
    documentationQuality: devRow.documentationQuality ?? 0,
    collaborationBreadth: devRow.collaborationBreadth ?? 0,
    consistencyScore: devRow.consistencyScore ?? 0,
    recentActivityScore: devRow.recentActivityScore ?? 0,
    scoreVersion: devRow.scoreVersion ?? '0.0',
    scoredAt: devRow.scoredAt ?? new Date().toISOString(),
    domains,
    topLanguages,
    activeReposCount: repoCount?.cnt ?? 0,
    totalContributions: stats?.total ?? 0,
    contributionSpanMonths: spanMonths,
    evidence: {
      topCommits,
      topReviews,
    },
    discovery,
  };
}
