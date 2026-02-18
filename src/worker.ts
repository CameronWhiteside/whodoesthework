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
        } else {
          // Short-lived stateful ops (ingest_developer, compute_scores, build_vectors)
          // → Durable Object.
          const doName = 'username' in payload
            ? (payload as { username: string }).username
            : (payload as { developerId: string }).developerId;
          const stub = env.INGESTION_DO.get(env.INGESTION_DO.idFromName(doName));
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
        if (rateLimitMatch) {
          const resetMs = new Date(rateLimitMatch[1]).getTime();
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
        // Trigger compute_scores via the cron-trigger DO shard.
        const id = env.INGESTION_DO.idFromName('cron-trigger');
        const stub = env.INGESTION_DO.get(id);

        try {
          await stub.fetch('http://do/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'compute_scores', developerId: 'all' }),
          });
        } catch (err) {
          console.error('[scheduled] Failed to trigger scoring pipeline:', err);
        }
      })(),
    );
  },
};
