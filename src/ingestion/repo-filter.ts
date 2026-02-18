// src/ingestion/repo-filter.ts
// Filter repos that are worth ingesting.
import type { GitHubRepo } from '../schemas/github';

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

const SKIP_NAME_PATTERNS = [
  'tutorial',
  'starter',
  'template',
  'demo',
  'hello-world',
  'example',
];

/**
 * Returns true if the repo is worth ingesting.
 * Skips forks, archived repos, stale repos, and obvious boilerplate.
 */
export function shouldIngestRepo(repo: GitHubRepo): boolean {
  // Skip forks
  if (repo.fork) return false;

  // GitHub repo schema doesn't include `archived` — use staleness as proxy
  // Skip repos not pushed in the last 3 years
  const lastPushed = new Date(repo.pushed_at).getTime();
  if (Date.now() - lastPushed > THREE_YEARS_MS) return false;

  // Skip obvious boilerplate / tutorial repos by name
  const nameLower = repo.full_name.split('/')[1]?.toLowerCase() ?? '';
  for (const pattern of SKIP_NAME_PATTERNS) {
    if (nameLower.includes(pattern)) return false;
  }

  return true;
}

/**
 * Estimate repo centrality on a 0–1 log-scale.
 * Uses stars and forks as a proxy for community importance.
 *
 * Formula: Math.min(1, Math.log10(1 + stars + forks * 2) / 4)
 *   - A repo with 1k stars → ~0.75
 *   - A repo with 10k stars → ~1.0
 */
export function estimateCentrality(repo: GitHubRepo): number {
  return Math.min(
    1,
    Math.log10(1 + repo.stargazers_count + repo.forks_count * 2) / 4,
  );
}
