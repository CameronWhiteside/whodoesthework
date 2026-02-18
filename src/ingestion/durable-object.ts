// src/ingestion/durable-object.ts
// Stateful ingestion coordinator — DurableObject<Env>.
// Handles ingest_developer (repo dispatch + completion tracking) and stubs for
// compute_scores (spec-05) and build_vectors (spec-06).
// analyzeRepo / analyzeReviews run directly in the queue Worker (see pipeline.ts).
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import { GitHubClient } from './github-client';
import { discoverRepos } from './discovery';
import { queueMessageSchema } from '../schemas/queue';

export class DeveloperIngestion extends DurableObject<Env> {
  private readonly queries: Queries;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.queries = new Queries(createDB(env.DB));
  }

  // ── HTTP entry point ────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // POST /ingest — trigger ingestion for a developer
    if (request.method === 'POST' && url.pathname === '/ingest') {
      const body = await request.json() as { username?: string };
      if (!body.username) {
        return Response.json({ error: 'username required' }, { status: 400 });
      }
      await this.env.INGESTION_QUEUE.send({
        type: 'ingest_developer',
        username: body.username,
      });
      return Response.json({ queued: true, username: body.username });
    }

    // POST /process — internal: process a queue message directly
    if (request.method === 'POST' && url.pathname === '/process') {
      const message = await request.json();
      await this.processMessage(message);
      return Response.json({ ok: true });
    }

    // POST /repo-complete — internal: called by queue handler when a repo finishes
    if (request.method === 'POST' && url.pathname === '/repo-complete') {
      const body = await request.json() as { repoFullName?: string; developerId?: string };
      if (body.developerId && body.repoFullName) {
        await this.onRepoComplete(body.developerId, body.repoFullName);
      }
      return Response.json({ ok: true });
    }

    // GET /status/:developerId
    if (request.method === 'GET' && url.pathname.startsWith('/status/')) {
      const developerId = url.pathname.replace('/status/', '');
      const dev = await this.queries.getDeveloper(developerId);
      if (!dev) return Response.json({ error: 'not found' }, { status: 404 });
      return Response.json({
        id: dev.id,
        username: dev.username,
        ingestionStatus: dev.ingestionStatus,
        lastIngestedAt: dev.lastIngestedAt,
      });
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  }

  // ── Queue message dispatcher ─────────────────────────────────────────────────

  async processMessage(message: unknown): Promise<void> {
    const msg = queueMessageSchema.parse(message);
    switch (msg.type) {
      case 'ingest_developer':
        return this.ingestDeveloper(msg.username);
      case 'analyze_repo':
      case 'analyze_reviews':
        // Handled directly by the queue Worker — should not reach the DO.
        return;
      case 'compute_scores':
        return; // stub — spec-05
      case 'build_vectors':
        return; // stub — spec-06
    }
  }

  // ── ingest_developer ─────────────────────────────────────────────────────────

  private async ingestDeveloper(username: string): Promise<void> {
    const gh = new GitHubClient(this.env.GITHUB_TOKEN);

    // 1. Fetch user profile
    const { data: user } = await gh.getUser(username);

    // 2. Upsert developer record
    const developerId = String(user.id);
    await this.queries.upsertDeveloper({ id: developerId, username: user.login });
    await this.queries.setIngestionStatus(developerId, 'in_progress');

    // 3. Discover repos
    const repos = await discoverRepos(gh, username);

    if (repos.length === 0) {
      await this.queries.setIngestionStatus(developerId, 'complete');
      return;
    }

    // 4. Track how many repos we're dispatching (stored in DO state)
    await this.ctx.storage.put(`repos_dispatched:${developerId}`, repos.length);
    await this.ctx.storage.put(`repos_completed:${developerId}`, 0);

    // 5. Enqueue analyze_repo for each repo
    for (const repo of repos) {
      await this.env.INGESTION_QUEUE.send({
        type: 'analyze_repo',
        developerId,
        username: user.login,
        repoFullName: repo.full_name,
      });
    }
  }

  // ── Repo completion tracking ─────────────────────────────────────────────────
  // Called via HTTP POST /repo-complete from the queue Worker after analyzeRepo
  // completes. The DO instance is keyed by username, matching ingestDeveloper.

  async onRepoComplete(
    developerId: string,
    _repoFullName: string,
  ): Promise<void> {
    const dispatched =
      (await this.ctx.storage.get<number>(`repos_dispatched:${developerId}`)) ?? 0;
    const completed =
      (await this.ctx.storage.get<number>(`repos_completed:${developerId}`)) ?? 0;
    const newCompleted = completed + 1;

    await this.ctx.storage.put(`repos_completed:${developerId}`, newCompleted);

    if (newCompleted >= dispatched && dispatched > 0) {
      await this.queries.setIngestionStatus(developerId, 'complete');

      await this.env.INGESTION_QUEUE.send({ type: 'compute_scores', developerId });
      await this.env.INGESTION_QUEUE.send({ type: 'build_vectors', developerId });
    }
  }
}
