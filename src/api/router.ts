// src/api/router.ts
// Hono REST API router — admin endpoints and health check.
// MCP traffic is routed upstream in worker.ts before reaching this router.
import { Hono } from 'hono';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import { searchDevelopersInputSchema } from '../schemas/mcp';
import { executeSearch } from '../search/query-parser';
import type { Env } from '../types/env';
import { developers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { GitHubClient } from '../ingestion/github-client';
import { discoverDevelopers } from '../ingestion/discovery';

const router = new Hono<{ Bindings: Env }>();

// ── Health ──────────────────────────────────────────────────────────────────

router.get('/health', (c) => {
  return c.json({ status: 'ok', version: '0.1.0' });
});

// ── POST /admin/ingest ───────────────────────────────────────────────────────
// Accepts { username: string }, routes to INGESTION_DO, returns queued status.

router.post('/admin/ingest', async (c) => {
  const body = await c.req.json<{ username?: string }>();
  const username = body?.username?.trim();

  if (!username) {
    return c.json({ error: 'username is required' }, 400);
  }

  // Route to the DeveloperIngestion Durable Object (name = username for isolation)
  const id = c.env.INGESTION_DO.idFromName(username);
  const stub = c.env.INGESTION_DO.get(id);

  await stub.fetch('http://do/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  return c.json({ status: 'queued', username });
});

// ── GET /admin/ingest/status/:username ──────────────────────────────────────
// Looks up developer in D1 by username, returns ingestion status.

router.get('/admin/ingest/status/:username', async (c) => {
  const username = c.req.param('username');
  const db = createDB(c.env.DB);
  const queries = new Queries(db);

  const dev = await queries.getDeveloperByUsername(username);
  if (!dev) {
    return c.json({ error: 'developer not found', username }, 404);
  }

  return c.json({
    id: dev.id,
    username: dev.username,
    ingestionStatus: dev.ingestionStatus,
    lastIngestedAt: dev.lastIngestedAt,
    scores: {
      overallImpact: dev.overallImpact,
      codeQuality: dev.codeQuality,
      reviewQuality: dev.reviewQuality,
      documentationQuality: dev.documentationQuality,
      collaborationBreadth: dev.collaborationBreadth,
      consistencyScore: dev.consistencyScore,
      recentActivityScore: dev.recentActivityScore,
      scoredAt: dev.scoredAt,
    },
  });
});

// ── GET /admin/stats ─────────────────────────────────────────────────────────
// D1 aggregate counts — raw SQL for multi-table aggregation.

router.get('/admin/stats', async (c) => {
  // raw SQL comment: COUNT(*) across multiple tables requires direct D1 queries
  const [devCount, contribCount, classifiedCount, scoredCount, reviewCount] =
    await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as c FROM developers').first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM contributions').first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM contributions WHERE classified = 1').first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM contributions WHERE scored = 1').first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM reviews').first<{ c: number }>(),
    ]);

  return c.json({
    developers: devCount?.c ?? 0,
    contributions: contribCount?.c ?? 0,
    classified: classifiedCount?.c ?? 0,
    scored: scoredCount?.c ?? 0,
    reviews: reviewCount?.c ?? 0,
  });
});

// ── POST /admin/discover ─────────────────────────────────────────────────────
// Runs GitHub repo→contributor discovery for the given domains+languages,
// deduplicates against already-indexed developers, and queues the new ones.
//
// Body (all optional):
//   { domains?: string[], languages?: string[], minStars?: number, maxDevelopers?: number }
// Defaults: all 30 domains, all languages, minStars=50, maxDevelopers=15 per domain batch.

router.post('/admin/discover', async (c) => {
  let body: { domains?: string[]; languages?: string[]; minStars?: number; maxDevelopers?: number } = {};
  try { body = await c.req.json(); } catch { body = {}; }

  const ALL_DOMAINS = [
    'distributed-systems','networking','databases','frontend-react','ml-infrastructure',
    'fintech','kubernetes','security','cli-tools','compiler-design',
    'web-backend','api-design','frontend-vue','cloud-infrastructure','devops',
    'observability','data-engineering','llm-applications','developer-tools','testing',
    'open-source-tooling','systems-programming','embedded-systems','webassembly',
    'mobile-ios','mobile-android','authentication','search','game-development','blockchain',
  ];

  const domains    = body.domains    ?? ALL_DOMAINS;
  const languages  = body.languages  ?? [];
  const minStars   = body.minStars   ?? 50;
  const maxPerBatch = body.maxDevelopers ?? 15;

  const gh = new GitHubClient(c.env.GITHUB_TOKEN);
  const db = createDB(c.env.DB);

  // Load existing usernames so we don't re-queue already-indexed developers
  const existingRows = await db.select({ username: developers.username }).from(developers).all();
  const existingSet = new Set(existingRows.map((r) => r.username.toLowerCase()));

  const discovered = new Set<string>();
  const queued: string[] = [];

  // Run discovery in batches of 3 domains to stay within rate limits
  const BATCH = 3;
  for (let i = 0; i < domains.length; i += BATCH) {
    const domainBatch = domains.slice(i, i + BATCH);
    try {
      const usernames = await discoverDevelopers(gh, {
        domains: domainBatch,
        languages,
        minStars,
        maxDevelopers: maxPerBatch,
      });
      for (const username of usernames) {
        discovered.add(username);
      }
    } catch (err) {
      console.warn(`[discover] batch ${domainBatch.join(',')} failed:`, err);
    }
  }

  // Queue new developers for ingestion
  for (const username of discovered) {
    if (existingSet.has(username.toLowerCase())) continue;
    try {
      const stub = c.env.INGESTION_DO.get(c.env.INGESTION_DO.idFromName(username));
      await stub.fetch('http://do/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      queued.push(username);
    } catch (err) {
      console.warn(`[discover] failed to queue ${username}:`, err);
    }
  }

  return c.json({
    domains_searched: domains.length,
    discovered: discovered.size,
    already_indexed: discovered.size - queued.length,
    queued: queued.length,
    queued_usernames: queued,
  });
});

// ── POST /admin/classify ─────────────────────────────────────────────────────
// Placeholder — classification is driven by the Durable Object queue processor.

router.post('/admin/classify', (c) => {
  return c.json({
    status: 'ok',
    message: 'Classification runs via Durable Object queue',
  });
});

// ── POST /admin/unstick ──────────────────────────────────────────────────────
// Heals developers stuck in_progress after DO completion counter failure.
//
// Bucket A: in_progress + scored_at IS NOT NULL + overall_impact IS NOT NULL
//           → flip to complete (scores are valid, just status was never updated)
// Bucket B: in_progress + scored_at IS NOT NULL + overall_impact IS NULL
//           → re-queue compute_scores (scores not yet written)
//
// Idempotent — safe to call multiple times. Only moves status forward.

router.post('/admin/unstick', async (c) => {
  // Bucket A: flip to complete
  const bucketAResult = await c.env.DB.prepare(`
    UPDATE developers
    SET ingestion_status = 'complete',
        last_ingested_at = datetime('now')
    WHERE ingestion_status = 'in_progress'
      AND scored_at IS NOT NULL
      AND overall_impact IS NOT NULL
  `).run();

  // Bucket B: re-queue compute_scores
  const bucketBRows = await c.env.DB.prepare(`
    SELECT id FROM developers
    WHERE ingestion_status = 'in_progress'
      AND scored_at IS NOT NULL
      AND overall_impact IS NULL
  `).all<{ id: string }>();

  const bucketBIds = bucketBRows.results ?? [];
  for (const row of bucketBIds) {
    await c.env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId: row.id });
  }

  return c.json({
    bucket_a_fixed: bucketAResult.meta?.changes ?? 0,
    bucket_b_requeued: bucketBIds.length,
  });
});

// ── POST /admin/repair-broken-complete ───────────────────────────────────────
// Resets developers that are complete but have zero contributions (Bucket C).
// Use ?dry_run=true to preview without making changes.
//
// For each broken-complete developer:
//  1. Deletes contributions, reviews, developer_domains rows
//  2. Resets developer row to pending (clears scores + failure fields)
//  3. Re-queues ingest_developer via INGESTION_DO

router.post('/admin/repair-broken-complete', async (c) => {
  const dryRun = c.req.query('dry_run') === 'true';

  // raw SQL: identify broken-complete — complete status but zero contributions
  const brokenRows = await c.env.DB.prepare(`
    SELECT d.id, d.username
    FROM developers d
    LEFT JOIN contributions con ON con.developer_id = d.id
    WHERE d.opted_out = 0
      AND d.ingestion_status = 'complete'
    GROUP BY d.id
    HAVING COUNT(con.id) = 0
    LIMIT 200
  `).all<{ id: string; username: string }>();

  const broken = brokenRows.results ?? [];

  if (dryRun) {
    return c.json({ dry_run: true, broken_complete_count: broken.length, developers: broken });
  }

  let repaired = 0;
  for (const dev of broken) {
    // 1. Delete dependent rows
    await c.env.DB.prepare('DELETE FROM contributions WHERE developer_id = ?').bind(dev.id).run();
    await c.env.DB.prepare('DELETE FROM reviews WHERE developer_id = ?').bind(dev.id).run();
    await c.env.DB.prepare('DELETE FROM developer_domains WHERE developer_id = ?').bind(dev.id).run();

    // 2. Reset developer row
    await c.env.DB.prepare(`
      UPDATE developers
      SET ingestion_status = 'pending',
          overall_impact = NULL,
          code_quality = NULL,
          review_quality = NULL,
          documentation_quality = NULL,
          collaboration_breadth = NULL,
          consistency_score = NULL,
          recent_activity_score = NULL,
          scored_at = NULL,
          score_version = NULL,
          ingestion_failure_reason = NULL,
          ingestion_last_error = NULL,
          ingestion_started_at = NULL
      WHERE id = ?
    `).bind(dev.id).run();

    // 3. Re-queue ingestion via INGESTION_DO
    const stub = c.env.INGESTION_DO.get(c.env.INGESTION_DO.idFromName(dev.username));
    await stub.fetch('http://do/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: dev.username }),
    }).catch((err) => {
      console.error(`[repair-broken-complete] Failed to queue ${dev.username}:`, err);
    });

    repaired++;
  }

  return c.json({ repaired, developers: broken.map((d) => d.username) });
});

// ── POST /admin/reindex ───────────────────────────────────────────────────────
// Kicks off classification + scoring + Vectorize builds without any GitHub calls.
//
// Body:
//   { developerId?: string }
// If omitted, queues work for all developers currently in D1.

router.post('/admin/reindex', async (c) => {
  let body: { developerId?: string } = {};
  try {
    body = await c.req.json<{ developerId?: string }>();
  } catch {
    body = {};
  }

  if (body.developerId) {
    await c.env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId: body.developerId });
    return c.json({ status: 'queued', developerId: body.developerId });
  }

  const db = createDB(c.env.DB);
  const ids = await db.select({ id: developers.id }).from(developers).where(eq(developers.optedOut, false)).all();

  for (const row of ids) {
    await c.env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId: row.id });
  }

  return c.json({ status: 'queued', developers: ids.length });
});

// ── GET /admin/search ─────────────────────────────────────────────────────────
// Admin search endpoint — accepts SearchDevelopersInput JSON body, calls
// executeSearch from query-parser, returns raw results for admin testing.
// Note: Uses GET method with JSON body for admin testing convenience (not REST-pure
// but avoids CORS issues in curl / Cloudflare dashboard).

router.get('/admin/search', async (c) => {
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: 'request body must be valid JSON' }, 400);
  }

  const parsed = searchDevelopersInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'invalid search input', issues: parsed.error.issues }, 400);
  }

  const results = await executeSearch(c.env, parsed.data);
  return c.json({ results });
});

// ── POST /api/search ─────────────────────────────────────────────────────────
// Public search endpoint consumed by the SvelteKit UI.

router.post('/api/search', async (c) => {
  const body = await c.req.json<{ description?: string; stacks?: string[]; role?: string; limit?: number }>();

  const parsed = searchDevelopersInputSchema.safeParse({
    query: [body.description, body.role].filter(Boolean).join(' '),
    domains: body.stacks ?? [],
    limit: body.limit ?? 10,
  });
  if (!parsed.success) return c.json({ error: 'invalid input' }, 400);

  const results = await executeSearch(c.env, parsed.data);
  if (results.length === 0) return c.json([]);

  const ids = results.map((r) => r.developerId);
  const rows = await c.env.DB.prepare(
    // raw SQL: fetch multiple developers by id; gate on overall_impact > 0 to exclude empty profiles
    `SELECT id, username, overall_impact, code_quality, review_quality FROM developers WHERE id IN (${ids.map(() => '?').join(',')}) AND overall_impact > 0`,
  ).bind(...ids).all<{ id: string; username: string; overall_impact: number | null; code_quality: number | null; review_quality: number | null }>();

  const byId = new Map((rows.results ?? []).map((r) => [r.id, r]));

  const enriched = await Promise.all(
    results.map(async (r) => {
      const dev = byId.get(r.developerId);
      if (!dev) return null;

      const [domainRows, langRows] = await Promise.all([
        c.env.DB.prepare(
          'SELECT domain, score FROM developer_domains WHERE developer_id = ? ORDER BY score DESC LIMIT 3',
        ).bind(dev.id).all<{ domain: string; score: number }>(),
        c.env.DB.prepare(
          'SELECT languages FROM contributions WHERE developer_id = ? LIMIT 200',
        ).bind(dev.id).all<{ languages: string }>(),
      ]);

      const topDomains = (domainRows.results ?? []).map((d) => ({ domain: d.domain, score: d.score }));

      const langCounts = new Map<string, number>();
      for (const row of langRows.results ?? []) {
        try {
          const langs: string[] = JSON.parse(row.languages);
          for (const lang of langs) {
            if (!lang) continue;
            langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
          }
        } catch {
          // ignore bad JSON rows
        }
      }

      const totalLang = [...langCounts.values()].reduce((a, b) => a + b, 0) || 1;
      const topLanguages = [...langCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([language, count]) => ({
          language,
          percentage: Math.round((count / totalLang) * 100),
        }));

      const domainNames = topDomains.map((d) => d.domain).filter(Boolean);
      const langNames = topLanguages.map((l) => l.language).filter(Boolean);
      const whyMatched = domainNames.length || langNames.length
        ? `Strong fit: evidence in ${domainNames.slice(0, 2).join(', ') || 'relevant domains'} (${langNames.slice(0, 2).join(', ') || 'multiple languages'}).`
        : 'Strong fit: evidence-backed work similar to your query.';

      return {
        developerId: dev.id,
        username: dev.username,
        githubUrl: `https://github.com/${dev.username}`,
        overallImpact: dev.overall_impact ?? 0,
        codeQuality: dev.code_quality ?? 0,
        reviewQuality: dev.review_quality ?? 0,
        topDomains,
        topLanguages,
        matchConfidence: Math.round(r.similarity * 100),
        whyMatched,
      };
    }),
  );

  return c.json(enriched.filter(Boolean));
});

// ── GET /api/developers/:username ─────────────────────────────────────────────
// Public profile endpoint — triggers ingestion if developer not yet indexed.

router.get('/api/developers/:username', async (c) => {
  const username = c.req.param('username');
  const db = createDB(c.env.DB);
  const queries = new Queries(db);

  const dev = await queries.getDeveloperByUsername(username);

  if (!dev) {
    // Kick off ingestion in the background
    const stub = c.env.INGESTION_DO.get(c.env.INGESTION_DO.idFromName(username));
    c.executionCtx.waitUntil(
      stub.fetch('http://do/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      }).catch(() => {}),
    );
    return c.json({ error: 'not found', ingestionStatus: 'pending' }, 404);
  }

  const domains = await queries.getDomainsByDeveloper(dev.id);

  return c.json({
    id: dev.id,
    username: dev.username,
    overallImpact: dev.overallImpact,
    codeQuality: dev.codeQuality,
    reviewQuality: dev.reviewQuality,
    documentationQuality: dev.documentationQuality,
    collaborationBreadth: dev.collaborationBreadth,
    consistencyScore: dev.consistencyScore,
    recentActivityScore: dev.recentActivityScore,
    ingestionStatus: dev.ingestionStatus,
    domains: domains.map((d) => ({
      domain: d.domain,
      score: d.score ?? 0,
      contributionCount: d.contributionCount ?? 0,
      evidenceRepos: d.evidenceRepos ?? '',
    })),
  });
});

// ── GET /api/domains ─────────────────────────────────────────────────────────
// Returns all indexed domains sorted by developer count — used for UI chips.

router.get('/api/domains', async (c) => {
  // raw SQL: GROUP BY domain across developer_domains
  const rows = await c.env.DB.prepare(
    `SELECT domain,
            COUNT(DISTINCT developer_id) as developerCount,
            AVG(score)                   as avgScore
     FROM developer_domains
     GROUP BY domain
     ORDER BY developerCount DESC
     LIMIT 50`,
  ).all();
  return c.json(rows.results ?? []);
});

export { router };
