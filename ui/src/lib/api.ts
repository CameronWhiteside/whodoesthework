import { PUBLIC_API_URL } from '$env/static/public';

const GET_HEADERS = { Accept: 'application/json' };
const POST_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

let domainsCache: Promise<DomainEntry[]> | null = null;

export interface SearchRequest {
  description: string;
  stacks: string[];
  role: string;
  limit?: number;
}

export interface MatchResult {
  developerId: string;
  username: string;
  githubUrl: string;
  overallImpact: number;
  codeQuality: number;
  reviewQuality: number;
  collaborationBreadth: number;
  consistencyScore: number;
  topDomains: { domain: string; score: number }[];
  topLanguages: { language: string; percentage: number }[];
  topRepos: string[];
  matchConfidence: number; // 0-100
}

export interface DeveloperProfile {
  id: string;
  username: string;
  overallImpact: number | null;
  codeQuality: number | null;
  reviewQuality: number | null;
  documentationQuality: number | null;
  collaborationBreadth: number | null;
  consistencyScore: number | null;
  recentActivityScore: number | null;
  ingestionStatus: string;
  domains: { domain: string; score: number; contributionCount: number; evidenceRepos: string }[];
}

export async function searchMatches(req: SearchRequest): Promise<MatchResult[]> {
  const res = await fetch(`${PUBLIC_API_URL}/api/search`, {
    method: 'POST',
    headers: POST_HEADERS,
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function getDeveloper(username: string): Promise<DeveloperProfile> {
  const res = await fetch(`${PUBLIC_API_URL}/api/developers/${encodeURIComponent(username)}`, { headers: GET_HEADERS });
  if (!res.ok) throw new Error(`Not found: ${res.status}`);
  return res.json();
}

export interface DomainEntry {
  domain: string;
  developerCount: number;
  avgScore: number;
}

/**
 * Returns all domain tags that exist in the index, sorted by breadth.
 * Used to populate the stack/domain chips on the search form so users only
 * see domains that have actual indexed developers. Cached in the component
 * — call once on mount.
 */
export async function getDomains(): Promise<DomainEntry[]> {
  // Cache for the session; chips are stable enough for a demo.
  if (!domainsCache) {
    domainsCache = (async () => {
      const res = await fetch(`${PUBLIC_API_URL}/api/domains`, { headers: GET_HEADERS });
      if (!res.ok) return [];
      return res.json();
    })();
  }
  return domainsCache;
}

export interface PlatformStats {
  developers: number;
  contributions: number;
  classified: number;
  scored: number;
  reviews: number;
}

export async function getStats(): Promise<PlatformStats | null> {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/admin/stats`, { headers: GET_HEADERS });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null; // Non-fatal — stats section just shows skeleton
  }
}
