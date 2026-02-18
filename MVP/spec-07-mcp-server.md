# Spec 07 — MCP Server (Agents SDK + Auth + Tools)

**Status:** Not Started
**Blocks:** spec-08 (E2E demo needs the MCP server)
**Blocked By:** spec-00 (types), spec-01 (D1 for auth + profiles), spec-05 (scores), spec-06 (search)
**Parallelizable with:** Can build server shell + auth in parallel; tool implementations need data layer
**Estimated effort:** 5-6 hours

---

## Objective

Build the MCP server that exposes three tools (`search_developers`, `get_developer_profile`, `compare_developers`) via the Cloudflare Agents SDK. This is the product surface — the thing customers pay for and AI agents call.

---

## Research: Step 0

**Question:** Exact Agents SDK MCP setup on Cloudflare Workers. What's the current API for `McpAgent`?

**Resolution path:**
1. Check `@cloudflare/agents` package docs and examples
2. Verify: Does `McpAgent` extend `DurableObject`? (Yes — each MCP session is a DO instance)
3. Verify: What transport does it use? SSE? WebSocket? Streamable HTTP?
4. Check if `@modelcontextprotocol/sdk` is needed as a peer dependency
5. Find a working example and adapt it

**Time-box:** 1 hour. If the Agents SDK MCP API has changed since last known version, read the source.

**Key dependency install:**
```bash
npm install @cloudflare/agents @modelcontextprotocol/sdk
```

---

## Execution Steps

### Step 1: Auth Layer

Create `src/mcp/auth.ts` — validates the bearer token against `API_SECRET_KEY` (a Wrangler secret).
No D1 table needed. For an MVP MCP tool, a single shared secret is the right level of complexity.
When the product evolves into a multi-tenant paid MCP tool, this is the one place to add per-key D1 lookups.

```typescript
// src/mcp/auth.ts
import { Env } from '../types/env';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates the Bearer token against the API_SECRET_KEY environment secret.
 *
 * Set the secret with:  npx wrangler secret put API_SECRET_KEY
 * Clients include:      Authorization: Bearer <secret>
 *
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing or invalid Authorization header. Expected: Bearer <token>' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, error: 'Empty token' };

  // Constant-time comparison — prevents timing oracle attacks
  const valid = await timingSafeEqual(token, env.API_SECRET_KEY);
  if (!valid) return { ok: false, error: 'Invalid token' };

  return { ok: true };
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aKey = await crypto.subtle.importKey('raw', enc.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bKey = await crypto.subtle.importKey('raw', enc.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const msg = enc.encode('compare');
  const [aSig, bSig] = await Promise.all([
    crypto.subtle.sign('HMAC', aKey, msg),
    crypto.subtle.sign('HMAC', bKey, msg),
  ]);
  // Compare resulting HMACs — equal only if inputs were equal
  const aArr = new Uint8Array(aSig);
  const bArr = new Uint8Array(bSig);
  if (aArr.length !== bArr.length) return false;
  let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= aArr[i] ^ bArr[i];
  return diff === 0;
}
```

### Step 2: MCP Server (Agents SDK)

Create `src/mcp/server.ts`.

```typescript
// src/mcp/server.ts
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Env } from '../types/env';
import { searchDevelopersHandler } from './tools/search-developers';
import { getDeveloperProfileHandler } from './tools/get-developer-profile';
import { compareDevelopersHandler } from './tools/compare-developers';

export class WhodoestheworkMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "whodoesthe.work",
    version: "0.1.0",
  });

  async init() {
    // Tool 1: Search developers
    this.server.tool(
      "search_developers",
      "Search for software developers by technical skills, domains, code quality, and review habits. Returns a ranked list with match explanations.",
      {
        query: z.string().describe("Natural language description of the developer you need. Example: 'Rust developer with distributed systems experience who reviews code regularly.'"),
        domains: z.array(z.string()).optional().describe("Filter by technical domains: 'distributed-systems', 'frontend-react', 'ml-infrastructure', etc."),
        languages: z.array(z.string()).optional().describe("Filter by programming languages: 'Go', 'Rust', 'TypeScript', etc."),
        min_quality_score: z.number().min(0).max(100).optional().describe("Minimum code quality percentile (0-100)."),
        min_review_score: z.number().min(0).max(100).optional().describe("Minimum review quality percentile (0-100)."),
        requires_documentation: z.boolean().optional().describe("Only return developers with documentation contributions."),
        active_within_months: z.number().optional().default(12).describe("Only return developers active within this many months."),
        limit: z.number().min(1).max(50).optional().default(10).describe("Max results to return."),
      },
      async (params) => {
        return searchDevelopersHandler(this.env, params);
      }
    );

    // Tool 2: Get developer profile
    this.server.tool(
      "get_developer_profile",
      "Get a detailed engineering profile for a specific GitHub developer, including quality scores, domain expertise, and links to top contributions as evidence.",
      {
        github_username: z.string().describe("GitHub username to look up."),
        include_evidence: z.boolean().optional().default(true).describe("Include links to top contributions as evidence."),
        domains: z.array(z.string()).optional().describe("Focus the profile on these domains."),
      },
      async (params) => {
        return getDeveloperProfileHandler(this.env, params);
      }
    );

    // Tool 3: Compare developers
    this.server.tool(
      "compare_developers",
      "Compare 2-5 developers side-by-side across all scoring dimensions. Returns per-dimension rankings and a narrative summary.",
      {
        github_usernames: z.array(z.string()).min(2).max(5).describe("GitHub usernames to compare."),
        focus_domains: z.array(z.string()).optional().describe("Domains to emphasize in comparison."),
      },
      async (params) => {
        return compareDevelopersHandler(this.env, params);
      }
    );
  }
}
```

### Step 3: Tool Implementation — search_developers

Create `src/mcp/tools/search-developers.ts`.

```typescript
// src/mcp/tools/search-developers.ts
import { Env } from '../../types/env';
import { executeSearch } from '../../search/query-parser';
import { DB } from '../../db/queries';

interface SearchParams {
  query: string;
  domains?: string[];
  languages?: string[];
  min_quality_score?: number;
  min_review_score?: number;
  requires_documentation?: boolean;
  active_within_months?: number;
  limit?: number;
}

interface HydratedDev {
  github_username: string;
  github_url: string;
  overall_impact: number;
  code_quality_percentile: number;
  review_quality_percentile: number;
  top_domains: { domain: string; score: number }[];
  top_languages: { language: string; percentage: number }[];
  active_repos_count: number;
  recent_activity: string;
  // match_explanation filled in via Workers AI after hydration
  match_explanation: string;
  // internal fields for AI prompt — stripped from final output
  _topDomainNames: string[];
  _topLangNames: string[];
  _overallImpact: number;
  _repoCount: number;
}

async function generateMatchExplanation(
  env: Env,
  query: string,
  dev: HydratedDev,
): Promise<string> {
  const prompt = `Write one sentence explaining why this developer matches the search query for the role described.
Query: "${query}"
Developer: domains=${dev._topDomainNames.join(', ')}, languages=${dev._topLangNames.join(', ')}, impact=${dev._overallImpact}/100, ${dev._repoCount} repos.
Start with "They've" or "Strong match:". One sentence only.`;

  const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a technical recruiting analyst. Write a single, specific, factual sentence.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 80,
    temperature: 0.4,
  }) as { response: string };

  return aiResponse.response.trim().replace(/\n.*/s, ''); // first sentence only
}

export async function searchDevelopersHandler(env: Env, params: SearchParams) {
  const db = new DB(env.DB);
  const limit = params.limit ?? 10;

  // Execute combined vector + SQL search
  const searchResults = await executeSearch(env, {
    query: params.query,
    domains: params.domains,
    languages: params.languages,
    minQualityScore: params.min_quality_score,
    minReviewScore: params.min_review_score,
    requiresDocumentation: params.requires_documentation,
    activeWithinMonths: params.active_within_months,
    limit,
  });

  // Hydrate results with developer data
  const hydrated: HydratedDev[] = [];
  for (const result of searchResults) {
    const dev = await db.getDeveloper(result.developerId);
    if (!dev) continue;

    // Get top domains
    const domainRows = await env.DB.prepare(
      'SELECT domain, score FROM developer_domains WHERE developer_id = ? ORDER BY score DESC LIMIT 3'
    ).bind(dev.id).all();

    // Get languages
    const langRows = await env.DB.prepare(`
      SELECT languages FROM contributions WHERE developer_id = ? AND languages IS NOT NULL LIMIT 100
    `).bind(dev.id).all();

    const langCounts = new Map<string, number>();
    for (const row of langRows.results) {
      const langs: string[] = JSON.parse(row.languages as string);
      for (const lang of langs) {
        langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
      }
    }
    const totalLang = [...langCounts.values()].reduce((a, b) => a + b, 0) || 1;
    const topLanguages = [...langCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => ({ language: lang, percentage: Math.round(count / totalLang * 100) }));

    // Active repos count
    const repoCount = await env.DB.prepare(
      'SELECT COUNT(DISTINCT repo_full_name) as cnt FROM contributions WHERE developer_id = ?'
    ).bind(dev.id).first() as any;

    // Recency
    const recentActivity = (dev as any).recent_activity_score > 70 ? 'highly_active'
      : (dev as any).recent_activity_score > 40 ? 'active'
      : (dev as any).recent_activity_score > 15 ? 'moderate'
      : 'low';

    const overallImpact = (dev as any).overall_impact ?? 0;
    const topDomainNames = domainRows.results.map(r => r.domain as string);
    const topLangNames = topLanguages.map(l => l.language);
    const cnt = repoCount?.cnt ?? 0;

    hydrated.push({
      github_username: dev.username,
      github_url: `https://github.com/${dev.username}`,
      overall_impact: overallImpact,
      code_quality_percentile: (dev as any).code_quality ?? 0,
      review_quality_percentile: (dev as any).review_quality ?? 0,
      top_domains: domainRows.results.map(r => ({ domain: r.domain as string, score: r.score as number })),
      top_languages: topLanguages,
      active_repos_count: cnt,
      recent_activity: recentActivity,
      match_explanation: '', // filled by AI below
      _topDomainNames: topDomainNames,
      _topLangNames: topLangNames,
      _overallImpact: overallImpact,
      _repoCount: cnt,
    });
  }

  // Generate AI match explanations in parallel — one Workers AI call per developer
  await Promise.all(
    hydrated.map(async (dev) => {
      dev.match_explanation = await generateMatchExplanation(env, params.query, dev);
    })
  );

  // Strip internal fields before returning
  const developers = hydrated.map(({ _topDomainNames, _topLangNames, _overallImpact, _repoCount, ...rest }) => rest);

  const output = {
    developers,
    total_matches: developers.length,
    query_interpretation: `Searched for: "${params.query}"${params.domains ? ` in domains: ${params.domains.join(', ')}` : ''}${params.languages ? ` with languages: ${params.languages.join(', ')}` : ''}. Filtered by: quality >= ${params.min_quality_score ?? 'any'}, review >= ${params.min_review_score ?? 'any'}.`,
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
  };
}
```

### Step 4: Tool Implementation — get_developer_profile

Create `src/mcp/tools/get-developer-profile.ts`.

```typescript
// src/mcp/tools/get-developer-profile.ts
import { Env } from '../../types/env';
import { DB } from '../../db/queries';

interface ProfileParams {
  github_username: string;
  include_evidence?: boolean;
  domains?: string[];
}

export async function getDeveloperProfileHandler(env: Env, params: ProfileParams) {
  const db = new DB(env.DB);
  const dev = await db.getDeveloperByUsername(params.github_username);

  if (!dev) {
    // Check if we need to trigger ingestion
    const doId = env.INGESTION_DO.idFromName(params.github_username);
    const doStub = env.INGESTION_DO.get(doId);

    // Trigger ingestion
    await doStub.fetch(new Request('http://do/ingest', {
      method: 'POST',
      body: JSON.stringify({ username: params.github_username }),
    }));

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          status: "ingestion_started",
          message: `Developer "${params.github_username}" is being analyzed. This typically takes 5-15 minutes for a first-time analysis. Please retry shortly.`,
          github_username: params.github_username,
        }, null, 2)
      }],
    };
  }

  // Build full profile
  const domainRows = await env.DB.prepare(
    'SELECT domain, score, contribution_count, evidence_repos FROM developer_domains WHERE developer_id = ? ORDER BY score DESC'
  ).bind(dev.id).all();

  const domains = domainRows.results.map(r => ({
    domain: r.domain as string,
    score: r.score as number,
    contributionCount: r.contribution_count as number,
    evidenceRepos: JSON.parse(r.evidence_repos as string ?? '[]') as string[],
  }));

  // Evidence: top commits
  let topCommits: any[] = [];
  let topReviews: any[] = [];

  if (params.include_evidence !== false) {
    const commitRows = await env.DB.prepare(`
      SELECT id, repo_full_name, message, quality_score FROM contributions
      WHERE developer_id = ? AND kind = 'commit' AND quality_score IS NOT NULL
      ORDER BY quality_score DESC LIMIT 5
    `).bind(dev.id).all();

    topCommits = commitRows.results.map(r => ({
      url: `https://github.com/${r.repo_full_name}/commit/${r.id}`,
      description: (r.message as string ?? '').slice(0, 120),
      quality_score: r.quality_score as number,
    }));

    const reviewRows = await env.DB.prepare(`
      SELECT id, repo_full_name, pr_number, depth_score FROM reviews
      WHERE developer_id = ? AND depth_score IS NOT NULL
      ORDER BY depth_score DESC LIMIT 5
    `).bind(dev.id).all();

    topReviews = reviewRows.results.map(r => ({
      url: `https://github.com/${r.repo_full_name}/pull/${r.pr_number}#pullrequestreview-${r.id}`,
      depth_score: r.depth_score as number,
    }));
  }

  // Languages breakdown
  const langRows = await env.DB.prepare(`
    SELECT languages FROM contributions WHERE developer_id = ? AND languages IS NOT NULL
  `).bind(dev.id).all();

  const langCounts = new Map<string, number>();
  for (const row of langRows.results) {
    const langs: string[] = JSON.parse(row.languages as string);
    for (const lang of langs) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
  }
  const totalLang = [...langCounts.values()].reduce((a, b) => a + b, 0) || 1;

  // Total contributions and span
  const stats = await env.DB.prepare(`
    SELECT COUNT(*) as total, MIN(authored_at) as first, MAX(authored_at) as last
    FROM contributions WHERE developer_id = ?
  `).bind(dev.id).first() as any;

  const spanMonths = stats.first && stats.last
    ? Math.round((new Date(stats.last).getTime() - new Date(stats.first).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0;

  const profile = {
    github_username: dev.username,
    github_url: `https://github.com/${dev.username}`,
    ingestion_status: dev.ingestionStatus,
    data_freshness: (dev as any).last_ingested_at,

    // Scores
    overall_impact: (dev as any).overall_impact,
    code_quality: (dev as any).code_quality,
    review_quality: (dev as any).review_quality,
    documentation_quality: (dev as any).documentation_quality,
    collaboration_breadth: (dev as any).collaboration_breadth,
    consistency_score: (dev as any).consistency_score,
    recent_activity_score: (dev as any).recent_activity_score,
    score_version: (dev as any).score_version,

    // Domains
    domains,

    // Languages
    top_languages: [...langCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count]) => ({ language: lang, percentage: Math.round(count / totalLang * 100) })),

    // Activity
    total_contributions: stats.total,
    contribution_span_months: spanMonths,

    // Evidence
    evidence: {
      top_commits: topCommits,
      top_reviews: topReviews,
    },
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }],
  };
}
```

### Step 5: Tool Implementation — compare_developers

Create `src/mcp/tools/compare-developers.ts`.

```typescript
// src/mcp/tools/compare-developers.ts
import { Env } from '../../types/env';
import { DB } from '../../db/queries';

interface CompareParams {
  github_usernames: string[];
  focus_domains?: string[];
}

export async function compareDevelopersHandler(env: Env, params: CompareParams) {
  const db = new DB(env.DB);

  const profiles = [];
  const missing = [];

  for (const username of params.github_usernames) {
    const dev = await db.getDeveloperByUsername(username);
    if (!dev || (dev as any).ingestion_status !== 'complete') {
      missing.push(username);
      continue;
    }

    const domainRows = await env.DB.prepare(
      'SELECT domain, score FROM developer_domains WHERE developer_id = ? ORDER BY score DESC LIMIT 5'
    ).bind(dev.id).all();

    profiles.push({
      github_username: dev.username,
      overall_impact: (dev as any).overall_impact ?? 0,
      code_quality: (dev as any).code_quality ?? 0,
      review_quality: (dev as any).review_quality ?? 0,
      documentation_quality: (dev as any).documentation_quality ?? 0,
      collaboration_breadth: (dev as any).collaboration_breadth ?? 0,
      consistency_score: (dev as any).consistency_score ?? 0,
      domains: domainRows.results.map(r => ({ domain: r.domain, score: r.score })),
    });
  }

  if (missing.length > 0) {
    // Trigger ingestion for missing developers
    for (const username of missing) {
      const doId = env.INGESTION_DO.idFromName(username);
      const doStub = env.INGESTION_DO.get(doId);
      await doStub.fetch(new Request('http://do/ingest', {
        method: 'POST',
        body: JSON.stringify({ username }),
      }));
    }
  }

  if (profiles.length < 2) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          status: "incomplete",
          message: `Need at least 2 scored developers to compare. Missing/unscored: ${missing.join(', ')}. Ingestion has been triggered — please retry in 10-15 minutes.`,
          available: profiles.map(p => p.github_username),
          pending: missing,
        }, null, 2)
      }],
    };
  }

  // Build dimension rankings
  const dimensions = [
    'overall_impact', 'code_quality', 'review_quality',
    'documentation_quality', 'collaboration_breadth', 'consistency_score',
  ];

  const dimensionRankings = dimensions.map(dim => ({
    dimension: dim,
    ranked_usernames: [...profiles]
      .sort((a, b) => (b as any)[dim] - (a as any)[dim])
      .map(p => p.github_username),
  }));

  // Add domain-specific rankings if focus domains specified
  if (params.focus_domains) {
    for (const domain of params.focus_domains) {
      const domainScores = profiles.map(p => ({
        username: p.github_username,
        score: p.domains.find((d: any) => d.domain === domain)?.score ?? 0,
      }));
      dimensionRankings.push({
        dimension: `domain:${domain}`,
        ranked_usernames: domainScores.sort((a, b) => b.score - a.score).map(d => d.username),
      });
    }
  }

  // Generate comparison summary using Workers AI
  const summaryPrompt = `Compare these software developers based on their scores. Be concise (2-3 sentences).

${profiles.map(p => `${p.github_username}: overall=${p.overall_impact}, code_quality=${p.code_quality}, review_quality=${p.review_quality}, doc_quality=${p.documentation_quality}, domains=${p.domains.map((d: any) => `${d.domain}(${d.score})`).join(', ')}`).join('\n')}

${params.focus_domains ? `Focus areas: ${params.focus_domains.join(', ')}` : ''}

Summary:`;

  const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a technical recruiting analyst. Provide brief, factual comparisons.' },
      { role: 'user', content: summaryPrompt },
    ],
    max_tokens: 200,
    temperature: 0.3,
  }) as { response: string };

  const output = {
    developers: profiles,
    comparison_summary: aiResponse.response.trim(),
    dimension_rankings: dimensionRankings,
    ...(missing.length > 0 ? { pending_ingestion: missing } : {}),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
  };
}
```

### Step 6: Wire MCP Server into index.ts

Update `src/index.ts`:

```typescript
import { WhodoestheworkMCP } from './mcp/server';

export { DeveloperIngestion } from './ingestion/durable-object';
export { WhodoestheworkMCP } from './mcp/server';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // MCP endpoint — delegate to Agents SDK
    if (url.pathname === '/sse' || url.pathname === '/mcp') {
      return WhodoestheworkMCP.serve("/mcp").fetch(request, env);
    }

    // ... rest of fetch handler ...
  },
  // ...
};
```

Update `wrangler.jsonc` to register the MCP DO:

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "INGESTION_DO", "class_name": "DeveloperIngestion" },
      { "name": "MCP_DO", "class_name": "WhodoestheworkMCP" }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["DeveloperIngestion", "WhodoestheworkMCP"]
    }
  ]
}
```

### Step 7: Set the MCP secret

No admin endpoint needed — auth is a static secret set once at deploy time:

```bash
npx wrangler secret put API_SECRET_KEY
# Paste your secret when prompted. Keep it — it cannot be retrieved.
# Share it with MCP clients (Claude Desktop config, etc.) as the Bearer token.
```

### Step 8: Test MCP Connection

```bash
# Test MCP connection (use any MCP client, or test via SSE)
# With Claude Desktop, add server config pointing to http://localhost:8787/mcp
# Authorization: Bearer <your API_SECRET_KEY>
curl -H "Authorization: Bearer $API_SECRET_KEY" \
     http://localhost:8787/mcp
```

---

## Definition of Done

- [ ] MCP server starts and is discoverable by MCP clients
- [ ] `search_developers` returns results when queried against seeded data
- [ ] `get_developer_profile` returns full profile for a known developer
- [ ] `get_developer_profile` triggers ingestion for an unknown developer and returns status
- [ ] `compare_developers` returns side-by-side comparison with dimension rankings
- [ ] Bearer token auth works: requests without valid `API_SECRET_KEY` get 401
- [ ] `npx wrangler secret put API_SECRET_KEY` sets the auth token
- [ ] MCP tools are discoverable via MCP tool list
- [ ] Works with at least one MCP client (Claude Desktop or `mcp-cli`)

## Output Artifacts

- `src/mcp/server.ts`
- `src/mcp/auth.ts`
- `src/mcp/tools/search-developers.ts`
- `src/mcp/tools/get-developer-profile.ts`
- `src/mcp/tools/compare-developers.ts`
- Updated `src/index.ts`
- Updated `wrangler.jsonc`
