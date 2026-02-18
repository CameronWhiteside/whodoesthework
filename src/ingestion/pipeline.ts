// src/ingestion/pipeline.ts
// Standalone analyze_repo and analyze_reviews handlers.
// Run directly in the queue Worker (not inside a Durable Object) to avoid
// DO eviction errors during long-running GitHub API operations.
import type { Env } from '../types/env';
import { GitHubClient } from './github-client';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import { GITHUB_PER_PAGE, MAX_COMMIT_LINES, COMMIT_LOOKBACK_DAYS } from '../shared/constants';

function commitLookbackSince(): string {
  const d = new Date();
  d.setDate(d.getDate() - COMMIT_LOOKBACK_DAYS);
  return d.toISOString();
}

// ── analyze_repo ──────────────────────────────────────────────────────────────

export async function analyzeRepo(
  env: Env,
  developerId: string,
  repoFullName: string,
): Promise<void> {
  const gh = new GitHubClient(env.GITHUB_TOKEN);
  const queries = new Queries(createDB(env.DB));

  const dev = await queries.getDeveloper(developerId);
  if (!dev) return;

  // Fetch contributor list for contributor count
  const { data: contributors } = await gh.getContributors(repoFullName);
  const contributorsCount = contributors.length;

  await queries.upsertRepo(repoFullName, null, 0, contributorsCount, false, null, []);

  const centrality = 0.1;

  // Incremental fetch: only commits since last ingestion.
  // For first-time ingestion, use a 2-year lookback rather than all history.
  const since = dev.lastIngestedAt ?? commitLookbackSince();

  let page = 1;
  let hasMore = true;
  let detectedTests = false;
  const languagesFound = new Set<string>();
  const prNumbers: number[] = [];

  while (hasMore) {
    const { data: commits } = await gh.getCommits(repoFullName, dev.username, page, since);

    for (const commit of commits) {
      if (commit.parents.length > 1) continue;

      let detail: import('../schemas/github').GitHubCommitDetail;
      try {
        const res = await gh.getCommitDetail(repoFullName, commit.sha);
        detail = res.data;
      } catch {
        continue;
      }

      if (detail.stats.total > MAX_COMMIT_LINES) continue;

      for (const file of detail.files) {
        const ext = file.filename.split('.').pop()?.toLowerCase();
        if (ext) {
          const lang = EXT_TO_LANGUAGE[ext];
          if (lang) languagesFound.add(lang);
          if (
            file.filename.includes('test') ||
            file.filename.includes('spec') ||
            file.filename.endsWith('_test.' + ext) ||
            file.filename.includes('__tests__')
          ) {
            detectedTests = true;
          }
        }
      }

      let analyzeResult = {
        qualityScore: 50,
        complexityDelta: 0,
        entropy: 0,
        testCorrelated: 0,
        churn: detail.stats.total,
        fileCount: detail.files.length,
        normalizedEntropy: 0,
        complexityDeltaAbs: 0,
        testRatio: 0,
      };

      try {
        const { analyzeCommitDetail } = await import('../analysis/metrics');
        const result = analyzeCommitDetail(detail, { centrality, contributionType: 'feature' });
        const totalChurn = detail.stats.additions + detail.stats.deletions;
        const testChurn = detail.files
          .filter(f => {
            const name = f.filename.toLowerCase();
            return name.includes('test') || name.includes('spec') || name.includes('__tests__');
          })
          .reduce((s, f) => s + f.additions + f.deletions, 0);
        analyzeResult = {
          qualityScore: result.qualityScore,
          complexityDelta: result.complexityDelta,
          entropy: result.entropy,
          testCorrelated: result.testCorrelated,
          churn: totalChurn,
          fileCount: detail.files.length,
          normalizedEntropy: result.entropy,
          complexityDeltaAbs: Math.abs(result.complexityDelta),
          testRatio: totalChurn > 0 ? testChurn / totalChurn : 0,
        };
      } catch {
        // spec-03 not yet available — use defaults
      }

      await queries.insertContribution({
        id: commit.sha,
        developerId,
        repoFullName,
        authoredAt: commit.commit.author.date,
        messageHead: commit.commit.message.slice(0, 120),
        additions: detail.stats.additions,
        deletions: detail.stats.deletions,
        filesChanged: detail.files.length,
        kind: 'commit',
      });

      await queries.setContributionMetrics(commit.sha, {
        churn: analyzeResult.churn,
        fileCount: analyzeResult.fileCount,
        normalizedEntropy: analyzeResult.normalizedEntropy,
        complexityDelta: analyzeResult.complexityDelta,
        complexityDeltaAbs: analyzeResult.complexityDeltaAbs,
        testRatio: analyzeResult.testRatio,
        languages: [...languagesFound],
      });
    }

    hasMore = commits.length === GITHUB_PER_PAGE;
    page++;
  }

  await queries.upsertRepo(
    repoFullName,
    [...languagesFound][0] ?? null,
    0,
    contributorsCount,
    detectedTests,
    null,
    [],
  );

  // Fetch PR numbers for review analysis
  let prPage = 1;
  let prHasMore = true;
  while (prHasMore) {
    const { data: prs } = await gh.getPullRequests(repoFullName, prPage);
    for (const pr of prs) {
      prNumbers.push(pr.number);
    }
    prHasMore = prs.length === GITHUB_PER_PAGE;
    prPage++;
    if (prNumbers.length >= 500) break;
  }

  if (prNumbers.length > 0) {
    for (let i = 0; i < prNumbers.length; i += 50) {
      const chunk = prNumbers.slice(i, i + 50);
      await env.INGESTION_QUEUE.send({
        type: 'analyze_reviews',
        developerId,
        username: dev.username,
        repoFullName,
        prNumbers: chunk,
      });
    }
  }
  // Note: onRepoComplete is called by the queue handler after this returns.
}

// ── analyze_reviews ───────────────────────────────────────────────────────────

export async function analyzeReviews(
  env: Env,
  developerId: string,
  repoFullName: string,
  prNumbers: number[],
): Promise<void> {
  const gh = new GitHubClient(env.GITHUB_TOKEN);
  const queries = new Queries(createDB(env.DB));

  const dev = await queries.getDeveloper(developerId);
  if (!dev) return;

  for (const prNumber of prNumbers) {
    let reviews: import('../schemas/github').GitHubReview[];
    try {
      const res = await gh.getReviews(repoFullName, prNumber);
      reviews = res.data;
    } catch {
      continue;
    }

    const devReviews = reviews.filter(r => String(r.user.id) === developerId);
    if (devReviews.length === 0) continue;

    let comments: import('../schemas/github').GitHubPRComment[] = [];
    try {
      const res = await gh.getPRComments(repoFullName, prNumber);
      comments = res.data;
    } catch {
      // proceed without comments
    }

    const devComments = comments.filter(c => String(c.user.id) === developerId);

    for (const review of devReviews) {
      const reviewComments = devComments.filter(
        c =>
          new Date(c.created_at).getTime() >=
          new Date(review.submitted_at).getTime() - 60_000,
      );

      const commentCount = reviewComments.length;
      const totalCommentLength =
        review.body.length + reviewComments.reduce((s, c) => s + c.body.length, 0);
      const referencesCodeLines = reviewComments.some(c => c.line !== null);

      await queries.insertReview(
        `${repoFullName}:${prNumber}:${review.id}`,
        developerId,
        repoFullName,
        prNumber,
        null,
        review.state,
        commentCount,
        totalCommentLength,
        referencesCodeLines,
        review.submitted_at,
      );
    }
  }
}

// ── File extension → language mapping ────────────────────────────────────────
const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  rs: 'Rust',
  go: 'Go',
  py: 'Python',
  rb: 'Ruby',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  cpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  c: 'C',
  h: 'C',
  cs: 'C#',
  php: 'PHP',
  scala: 'Scala',
  ex: 'Elixir',
  exs: 'Elixir',
  hs: 'Haskell',
  clj: 'Clojure',
  cljs: 'Clojure',
  erl: 'Erlang',
  dart: 'Dart',
  lua: 'Lua',
  r: 'R',
  jl: 'Julia',
  zig: 'Zig',
  nim: 'Nim',
  ml: 'OCaml',
  mli: 'OCaml',
  fs: 'F#',
  fsx: 'F#',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  sql: 'SQL',
  graphql: 'GraphQL',
  proto: 'Protocol Buffers',
  tf: 'Terraform',
  nix: 'Nix',
};
