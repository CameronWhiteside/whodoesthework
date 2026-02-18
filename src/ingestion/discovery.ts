// src/ingestion/discovery.ts
// Discover repos a developer has meaningfully contributed to,
// and discover developers from a domain/language query.
import type { GitHubRepo } from '../schemas/github';
import type { GitHubClient } from './github-client';
import { shouldIngestRepo } from './repo-filter';

const MAX_OWN_REPO_PAGES = 3;
const MAX_OWN_REPOS = 20;

/**
 * Find repos where the developer has commits (their own repos only for now).
 *
 * Strategy:
 *  1. Fetch developer's own repos (pages 1–3)
 *  2. Filter with shouldIngestRepo
 *  3. Return sorted by last pushed desc, capped at 20
 */
export async function discoverRepos(
  client: GitHubClient,
  username: string,
): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];

  for (let page = 1; page <= MAX_OWN_REPO_PAGES; page++) {
    const { data: pageRepos } = await client.getUserRepos(username, page);
    allRepos.push(...pageRepos);
    // If we got fewer results than a full page, we've hit the end
    if (pageRepos.length < 100) break;
  }

  return allRepos
    .filter(shouldIngestRepo)
    .sort(
      (a, b) =>
        new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
    )
    .slice(0, MAX_OWN_REPOS);
}

// ── Domain-based discovery ────────────────────────────────────────────────────

export interface DiscoveryQuery {
  domains: string[];       // e.g. ["distributed-systems", "consensus"]
  languages: string[];     // e.g. ["rust", "go"]
  minStars: number;        // repo star threshold
  maxDevelopers: number;   // cap on discovered developers
}

// Maps domain keywords to GitHub search terms / topics.
const DOMAIN_SEARCH_TERMS: Record<string, string[]> = {
  'distributed-systems': ['distributed-systems', 'raft', 'consensus', 'paxos', 'distributed'],
  'networking': ['networking', 'tcp', 'http', 'grpc', 'protocol'],
  'databases': ['database', 'sql', 'nosql', 'storage-engine', 'query-engine'],
  'frontend-react': ['react', 'nextjs', 'react-hooks', 'react-components'],
  'ml-infrastructure': ['machine-learning', 'mlops', 'ml-pipeline', 'feature-store'],
  'fintech': ['fintech', 'payments', 'banking', 'trading'],
  'kubernetes': ['kubernetes', 'k8s', 'operator', 'controller'],
  'security': ['security', 'cryptography', 'authentication', 'zero-trust'],
  'cli-tools': ['cli', 'command-line', 'terminal'],
  'compiler-design': ['compiler', 'parser', 'ast', 'language-design'],
};

/**
 * Discover developers for a domain+language query.
 *
 * Strategy:
 *  1. Build GitHub repo search queries from domain + language filters
 *  2. Collect up to 10 repos per search term (capped)
 *  3. For each repo, fetch top contributors
 *  4. Rank developers by number of distinct relevant repos they appear in
 *  5. Return top maxDevelopers usernames
 */
export async function discoverDevelopers(
  client: GitHubClient,
  query: DiscoveryQuery,
): Promise<string[]> {
  const relevantRepos = await findRelevantRepos(client, query);
  return extractContributors(client, relevantRepos, query.maxDevelopers);
}

async function findRelevantRepos(
  client: GitHubClient,
  query: DiscoveryQuery,
): Promise<string[]> {
  const repoSet = new Set<string>();

  for (const domain of query.domains) {
    const searchTerms = DOMAIN_SEARCH_TERMS[domain] ?? [domain];

    // Use at most 2 topic terms per domain to stay within rate limits
    for (const term of searchTerms.slice(0, 2)) {
      const parts: string[] = [`topic:${term}`];
      for (const lang of query.languages) {
        parts.push(`language:${lang}`);
      }
      parts.push(`stars:>=${query.minStars}`);

      try {
        const { data } = await client.searchRepos(parts.join(' '), 1);
        for (const repo of (data.items ?? []).slice(0, 10)) {
          repoSet.add(repo.full_name);
        }
      } catch {
        // Search rate limit or other error — continue with what we have
      }
    }

    // Also do a keyword search (not topic-prefixed) for the primary term
    const primaryTerm = searchTerms[0] ?? domain;
    const langFilter = query.languages.map(l => `language:${l}`).join(' ');
    const keywordQuery = `${primaryTerm} ${langFilter} stars:>=${query.minStars}`.trim();

    try {
      const { data } = await client.searchRepos(keywordQuery, 1);
      for (const repo of (data.items ?? []).slice(0, 10)) {
        repoSet.add(repo.full_name);
      }
    } catch {
      // continue
    }
  }

  return [...repoSet];
}

async function extractContributors(
  client: GitHubClient,
  repos: string[],
  maxDevelopers: number,
): Promise<string[]> {
  // Map: username → number of relevant repos they contribute to
  const developerCounts = new Map<string, number>();

  for (const repoFullName of repos) {
    try {
      const { data: contributors } = await client.getContributors(repoFullName);
      for (const contributor of contributors.slice(0, 15)) {
        if (contributor.type !== 'User') continue; // skip bots
        const prev = developerCounts.get(contributor.login) ?? 0;
        developerCounts.set(contributor.login, prev + 1);
      }
    } catch {
      // continue on error
    }
  }

  // Rank by cross-repo presence — more repos = more likely a domain expert
  return [...developerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxDevelopers)
    .map(([username]) => username);
}
