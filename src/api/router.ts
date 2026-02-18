// src/api/router.ts
// Hono REST API router — admin endpoints and health check.
// MCP traffic is routed upstream in worker.ts before reaching this router.
import { Hono } from 'hono';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import { searchDevelopersInputSchema } from '../schemas/mcp';
import { executeSearch } from '../search/query-parser';
import type { Env } from '../types/env';

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

// ── POST /admin/classify ─────────────────────────────────────────────────────
// Placeholder — classification is driven by the Durable Object queue processor.

router.post('/admin/classify', (c) => {
  return c.json({
    status: 'ok',
    message: 'Classification runs via Durable Object queue',
  });
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
    // raw SQL: fetch multiple developers by id in one query
    `SELECT id, username, overall_impact, code_quality, review_quality FROM developers WHERE id IN (${ids.map(() => '?').join(',')})`,
  ).bind(...ids).all<{ id: string; username: string; overall_impact: number | null; code_quality: number | null; review_quality: number | null }>();

  const byId = new Map((rows.results ?? []).map((r) => [r.id, r]));

  return c.json(
    results.flatMap((r) => {
      const dev = byId.get(r.developerId);
      if (!dev) return [];
      return [{
        developerId: dev.id,
        username: dev.username,
        githubUrl: `https://github.com/${dev.username}`,
        overallImpact: dev.overall_impact ?? 0,
        codeQuality: dev.code_quality ?? 0,
        reviewQuality: dev.review_quality ?? 0,
        topDomains: [],
        topLanguages: [],
        matchConfidence: Math.round(r.similarity * 100),
        whyMatched: 'Matched based on contribution history and domain overlap.',
      }];
    }),
  );
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
