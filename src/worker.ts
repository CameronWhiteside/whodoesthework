// src/worker.ts
// Main Worker entry point — wires the Hono REST router, MCP Durable Object,
// and the DeveloperIngestion Durable Object into a single Worker export.
//
// Routing strategy:
//   /mcp or /sse → WhodoestheworkMCP Durable Object (MCP + SSE protocol)
//   everything else → Hono REST API router (admin endpoints + health)
//
// Note: routeAgentRequest() expects URL pattern /agents/<namespace>/<name>
// (partyserver convention). For /mcp and /sse paths we route directly to
// the singleton WhodoestheworkMCP DO instance instead.

import { router } from './api/router';
import type { Env } from './types/env';
import { queueMessageSchema } from './schemas/queue';
import { analyzeRepo, analyzeReviews } from './ingestion/pipeline';
import { buildVectorsForDeveloper, classifyDeveloperContributions, computeScoresForDeveloper } from './scoring/pipeline';
import { createDB } from './db/client';
import { Queries } from './db/queries';
import { developers } from './db/schema';
import { eq } from 'drizzle-orm';

// Re-export Durable Object classes so Cloudflare binds them.
export { DeveloperIngestion } from './ingestion/durable-object';
export { WhodoestheworkMCP } from './mcp/server';

export default {
  // ── Fetch handler ──────────────────────────────────────────────────────────
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // MCP / SSE → Durable Object
    if (url.pathname.startsWith('/mcp') || url.pathname.startsWith('/sse')) {
      const id = env.MCP_DO.idFromName('default');
      return env.MCP_DO.get(id).fetch(request);
    }

    // API + admin → Hono router
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/admin/') ||
      url.pathname === '/health'
    ) {
      return router.fetch(request, env, ctx);
    }

    // Everything else → SvelteKit static assets (200.html fallback handles SPA routing)
    return env.ASSETS.fetch(request);
  },

  // ── Queue handler ──────────────────────────────────────────────────────────
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    console.log(`[queue] Received ${batch.messages.length} messages from ${batch.queue}`);

    for (const message of batch.messages) {
      try {
        const parsed = queueMessageSchema.safeParse(message.body);
        if (!parsed.success) {
          console.error('[queue] Unknown message shape, dropping:', message.body);
          message.ack();
          continue;
        }
        const payload = parsed.data;

        if (payload.type === 'analyze_repo') {
          // Long-running: run directly in Worker to avoid DO eviction.
          await analyzeRepo(env, payload.developerId, payload.repoFullName);
          // Notify the DO (keyed by username for correct counter tracking).
          if (payload.username) {
            const stub = env.INGESTION_DO.get(env.INGESTION_DO.idFromName(payload.username));
            await stub.fetch('http://do/repo-complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ developerId: payload.developerId, repoFullName: payload.repoFullName }),
            });
          }
        } else if (payload.type === 'analyze_reviews') {
          // Long-running: run directly in Worker.
          await analyzeReviews(env, payload.developerId, payload.repoFullName, payload.prNumbers);
        } else if (payload.type === 'compute_scores') {
          const developerId = payload.developerId;

          if (developerId === 'all') {
            const db = createDB(env.DB);
            const ids = await db.select({ id: developers.id }).from(developers).where(eq(developers.optedOut, false)).all();
            for (const row of ids) {
              await env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId: row.id });
            }
            message.ack();
            continue;
          }

          // 1) Classify contributions (domains + coarse type)
          // Run in small batches; if more remain, requeue and return.
          const { remainingLikely } = await classifyDeveloperContributions(env, developerId);
          if (remainingLikely) {
            await env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId }, { delaySeconds: 2 });
            message.ack();
            continue;
          }

          // 2) Compute developer + domain scores
          await computeScoresForDeveloper(env, developerId);

          // 3) Build vectors
          await env.INGESTION_QUEUE.send({ type: 'build_vectors', developerId });
        } else if (payload.type === 'build_vectors') {
          const vectorsBuilt = await buildVectorsForDeveloper(env, payload.developerId);
          // Safety net: mark complete only if the developer met the completeness threshold
          // and vectors were actually built. This catches developers whose DO completion
          // counter never fired (DLQ exhaustion). If the DO path already marked complete,
          // this is a no-op write. If below threshold, leave status as-is for repair.
          if (vectorsBuilt) {
            const queries = new Queries(createDB(env.DB));
            await queries.markIngestionComplete(payload.developerId);
          }
        } else {
          // ingest_developer → Durable Object.
          const stub = env.INGESTION_DO.get(env.INGESTION_DO.idFromName(payload.username));
          await stub.fetch('http://do/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.body),
          });
        }

        message.ack();
      } catch (err) {
        // When GitHub rate-limited, delay the retry until after the reset window
        // to prevent an immediate retry spiral.
        const errMsg = err instanceof Error ? err.message : String(err);
        const rateLimitMatch = errMsg.match(/Resets at (.+)$/);
        const rateLimitReset = rateLimitMatch?.[1];
        if (rateLimitReset) {
          const resetMs = new Date(rateLimitReset).getTime();
          const delaySeconds = Math.max(60, Math.ceil((resetMs - Date.now()) / 1000) + 30);
          console.warn(`[queue] Rate limited, retrying in ${delaySeconds}s`);
          message.retry({ delaySeconds });
        } else {
          console.error(`[queue] Failed to process message:`, err);
          message.retry();
        }
      }
    }
  },

  // ── Scheduled handler ─────────────────────────────────────────────────────
  // Runs on cron triggers defined in wrangler.jsonc.
  // Currently triggers the scoring pipeline for unprocessed contributions.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[scheduled] Cron triggered — running classification + scoring pipeline');

    ctx.waitUntil(
      (async () => {
        try {
          await env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId: 'all' });
        } catch (err) {
          console.error('[scheduled] Failed to trigger scoring pipeline:', err);
        }
      })(),
    );
  },
};
