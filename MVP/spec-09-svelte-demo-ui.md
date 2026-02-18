# Spec 09 — Vamo-style Founder/Recruiter Web Product

**Status:** Not Started
**Blocks:** Nothing (presentation layer)
**Blocked By:** spec-07 (MCP server deployed + AI explanations), spec-08 (integration complete + Worker deployed)
**Parallelizable with:** UI components (steps 4-7) can be built against mock data while backend endpoints land
**Estimated effort:** 10-12 hours

---

## Objective

Build the primary product surface: a founder/recruiter-facing web product where users describe a project, pick a stack, select a role, and receive ranked developer matches with AI-generated "why matched" explanations. Includes shortlist management backed by D1 (not localStorage).

This is a complete rewrite of the original spec-09 demo UI. All routes, components, Worker REST changes, and visual design are specified here.

---

## Architecture

```
ui/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte               ← Sticky nav + global styles
│   │   ├── +page.svelte                 ← Landing (Hero + value props + stats bar)
│   │   ├── search/+page.svelte          ← 3-step onboarding form
│   │   ├── matches/+page.svelte         ← Match results grid
│   │   ├── developer/[username]/
│   │   │   └── +page.svelte             ← Full profile (with shortlist button)
│   │   └── shortlist/+page.svelte       ← Saved candidates
│   └── lib/
│       ├── api.ts                       ← All fetch helpers + MatchResult type
│       ├── stores/
│       │   ├── SearchStore.ts           ← Svelte writable, passes form state /search → /matches
│       │   └── ShortlistStore.ts        ← localStorage-backed (no server state)
│       └── components/
│           ├── Hero.svelte
│           ├── ProjectForm.svelte       ← 3-step wizard
│           ├── MatchCard.svelte         ← Core Vamo-feel component
│           └── ScoreBar.svelte
├── package.json
└── svelte.config.js                     ← adapter-cloudflare
```

---

## Visual Design Tokens

Design direction: **Pixel Brutalism × Editorial Data**. Light background, massive grotesque display type, acid green energy, lavender categorization, "selection handle" precision hover aesthetics.

### Color palette

| Role | Value | Notes |
|---|---|---|
| Page bg | `#f5f2ed` | Warm off-white — content on a page, not in a terminal |
| Surface (cards) | `#ffffff` | Pure white — cards pop on page bg |
| Surface alt | `#faf7f3` | Slightly warm, for alternating rows |
| Elevated (inputs) | `#ffffff` with border `#ddd8d0` | Clean, warm-bordered |
| Default border | `#ddd8d0` | Warm gray |
| Hover border | `#b0a89e` | Darker warm gray |
| Focus ring | `#2563eb 2px offset 2px` | All interactive elements |
| Primary text | `#0a0907` | Near-black, warm |
| Secondary text | `#3d3830` | Dark warm gray |
| Muted text | `#8a8070` | Medium warm gray |
| Acid green fill | `#b8ff57` | Primary CTA bg, high-score badge bg |
| Acid green text | `#1a3300` | Text on acid green — WCAG AA passes |
| Lavender fill | `#ede9fe` | Domain chip bg, selected step chip |
| Lavender text | `#5b21b6` | Domain chip text |
| Electric blue | `#2563eb` | Links, selection handles, active borders |
| Amber fill | `#fef3c7` | Mid-score badge bg (40–69%) |
| Amber text | `#92400e` | Text on amber |
| Red fill | `#fee2e2` | Low-score badge bg (<40%) |
| Red text | `#991b1b` | Text on red |
| Pixel grid | `rgba(37, 99, 235, 0.07)` | Blue checkerboard texture |
| Lavender blob | `radial-gradient(ellipse 700px 400px at 50% 0%, rgba(196,181,253,0.35) 0%, transparent 70%)` | Floats behind hero content |

### Typography system

| Role | Spec |
|---|---|
| Display | weight 900, `clamp(4rem, 9vw, 7rem)`, letter-spacing -0.03em, line-height 0.95. Font: "Plus Jakarta Sans" or "Space Grotesk" (via Bunny Fonts) |
| Headline | weight 800, `clamp(1.75rem, 3.5vw, 2.75rem)`, letter-spacing -0.02em |
| Section | weight 700, 1.25rem, letter-spacing -0.01em |
| Body | weight 400, 1rem (16px), line-height 1.65, max-width 65ch |
| Meta | weight 600, 0.75rem, letter-spacing 0.1em, UPPERCASE — labels, column headers |
| Accent | italic serif ("Playfair Display"), 1.1–1.4rem — pull quotes and taglines ONLY |
| Data nums | tabular-nums, weight 700, slightly larger than surrounding body |

### Pixel grid CSS

Apply to `body` and hero sections — never inside cards:

```css
.pixel-grid {
  background-image:
    repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);
  background-size: 24px 24px;
  background-position: 0 0;
}
```

### Selection handle aesthetic

Cards and key interactive elements show four 8×8px corner anchor dots (`#2563eb`) on hover — like a Figma selection. Signals precision tool.

```css
/* Card hover outline */
.card:hover {
  outline: 1.5px solid #2563eb;
  outline-offset: 2px;
}
/* Implement the 4 corner dots as absolutely-positioned <span> elements
   injected via a Svelte use: action on the card wrapper */
```

Apply to: MatchCard hover, Hero eyebrow label, ProjectForm active role card.

---

### Component design specs

**`Hero.svelte` — new structure**

- Full-width pixel grid background (`.pixel-grid`) + lavender blob pseudo-element behind content
- **Eyebrow:** `border: 1.5px solid #2563eb`, `background: rgba(37,99,235,0.08)`, `color: #2563eb`, ALL CAPS, weight 700. Selection handles appear on hover.
- **Headline:** Two lines at Display size, `color: #0a0907`, weight 900. Second line has one word wrapped in `<span style="color: #b8ff57">` (acid green inline span).
- **Tagline:** italic serif, `1.1rem`, `color: #8a8070` — *"Built from real commit evidence, not resumes."*
- **Primary CTA:** `bg: #b8ff57`, `color: #1a3300`, `font-weight: 700`, `border-radius: 8px`. Hover: `transform: translateY(-1px)` + `background: #a3f03d`. No glow.
- **Secondary CTA:** `border: 1.5px solid #0a0907`, `color: #0a0907`, transparent bg, ghost style.
- **Sample query chips:** `bg: #f0ede8`, `border: 1px solid #ddd8d0`, `color: #3d3830`. Hover: `bg: #ede9fe` (lavender).

**`MatchCard.svelte` — new structure**

- **Card:** `background: #ffffff`, `border: 1.5px solid #ddd8d0`, `border-radius: 10px`, no box-shadow by default.
- **Hover:** 4-corner selection handles appear (via Svelte `use:` action), `border-color: #2563eb`, `box-shadow: 0 2px 16px rgba(0,0,0,0.08)`.
- **Left rank sidebar:** `background: #0a0907`, `color: #f5f2ed`, `width: 48px`, rank number weight 900.
- **Top:** `@handle` weight 700 `color: #0a0907` + GitHub icon. Right: match confidence badge (acid green ≥70%, amber 40–69%, red <40%).
- **Domain chips:** `background: #ede9fe`, `color: #5b21b6`. Top 3 only.
- **"Why matched" block:** `border-left: 3px solid #b8ff57`, `background: #f9ffe8`. Label "WHY MATCHED" in `color: #1a3300`, meta (0.65rem, uppercase, weight 700). Why-text `color: #3d3830`.
- **Score bars:** `track: #e8e4df`, fill = acid green `#b8ff57`, `height: 5px`, `border-radius: 3px`.
- **Footer language chips:** `background: #f5f2ed`, `border: 1px solid #ddd8d0`, `color: #8a8070`.
- **Shortlist button active:** `background: #ede9fe`, `color: #5b21b6`, `border: 1.5px solid #5b21b6`.

**`ProjectForm.svelte` — new structure**

- Light surface, warm borders throughout.
- **Progress dots:** Inactive `border: 2px solid #ddd8d0`, `background: transparent`. Active: `background: #2563eb`. Done: `background: #b8ff57`, `border-color: #b8ff57`.
- **Step chip selection:** Unselected `background: #f5f2ed`, `border: 1px solid #ddd8d0`. Selected: `background: #ede9fe`, `border: 1.5px solid #5b21b6`, `color: #5b21b6`.
- **Role cards:** White `background: #ffffff`, `border: 1.5px solid #ddd8d0`. Selected: `border: 2px solid #2563eb`, `background: rgba(37,99,235,0.04)` + blue selection handles on corners.
- **Primary CTA:** Acid green (`background: #b8ff57`, `color: #1a3300`, weight 700).
- **Textarea:** `background: #ffffff`, `border: 1.5px solid #ddd8d0`, `color: #0a0907`. Focus: `border-color: #2563eb`.

**Nav**

- `background: rgba(245,242,237,0.88)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid #ddd8d0`.
- Logo: `color: #0a0907`, weight 800.
- Links: `color: #3d3830`, hover → `#0a0907`.

**Loading state**

- Centered on light bg (`#f5f2ed`). Spinner: `border-top-color: #2563eb`.
- Status text in italic serif font, `color: #8a8070` — e.g. *"Expanding your query across 847 technical domains…"*

---

## Step 0: Worker REST API — Hono Router

Replace the raw `fetch` handler URL-string matching with a [Hono](https://hono.dev/) router. Hono runs natively on Cloudflare Workers, provides typed `c.req.param()` / `c.req.json()`, and plays well with Zod for body validation.

### Install

```bash
npm install hono zod
```

### Create `src/api/router.ts`

This file exports a Hono app mounted at `/api`. The main `src/worker.ts` fetch handler delegates all `/api/*` traffic here; MCP routes are handled separately (unchanged).

```typescript
// src/api/router.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../types/env';
import { Queries } from '../db/queries';
import { createDB } from '../db/client';
import { executeSearch } from '../search/query-parser';

// ── Zod schemas ────────────────────────────────────────────────────────────

const SearchBodySchema = z.object({
  description: z.string().min(1, 'description is required'),
  stacks: z.array(z.string()).default([]),
  role: z.string().default(''),
  limit: z.number().int().min(1).max(50).default(10),
});

// ── Router ─────────────────────────────────────────────────────────────────
// All endpoints are public — this is a demo product.
// No API keys, no auth. Shortlist state lives in the browser (localStorage).

export const apiRouter = new Hono<{ Bindings: Env; Variables: { queries: Queries } }>();

// CORS — open for the SvelteKit frontend (same Cloudflare Pages project)
apiRouter.use('*', cors({ origin: '*', allowHeaders: ['content-type'] }));

// Attach Queries instance to every request context
apiRouter.use('*', async (c, next) => {
  c.set('queries', new Queries(createDB(c.env.DB)));
  await next();
});

// ── GET /api/developers/:username ──────────────────────────────────────────

apiRouter.get('/developers/:username', async (c) => {
  const username = c.req.param('username');
  const queries = c.get('queries');

  const dev = await queries.getDeveloperByUsername(username);
  if (!dev) return c.json({ error: 'Developer not found' }, 404);

  const domains = await queries.getDomainsByDeveloper(dev.id);
  return c.json({ ...dev, domains });
});

// ── GET /api/compare?a=&b= ─────────────────────────────────────────────────

apiRouter.get('/compare', async (c) => {
  const a = c.req.query('a');
  const b = c.req.query('b');
  if (!a || !b) return c.json({ error: 'Query params a and b are required' }, 400);

  const queries = c.get('queries');
  const [devA, devB] = await Promise.all([
    queries.getDeveloperByUsername(a),
    queries.getDeveloperByUsername(b),
  ]);
  if (!devA || !devB) return c.json({ error: 'One or both developers not found' }, 404);

  const [domainsA, domainsB] = await Promise.all([
    queries.getDomainsByDeveloper(devA.id),
    queries.getDomainsByDeveloper(devB.id),
  ]);
  return c.json({ a: { ...devA, domains: domainsA }, b: { ...devB, domains: domainsB } });
});

// ── Query expansion helper ──────────────────────────────────────────────────
//
// Short or vague queries embed poorly ("cryptography" → mediocre vector).
// Expanding first to a rich technical vocabulary blob dramatically improves
// Vectorize cosine similarity matches.
//
// Examples:
//   "cryptography expert"
//   → "cryptography TLS PKI X509 certificate public-key-infrastructure
//      zero-knowledge-proofs elliptic-curve RSA AES HMAC SHA openssl
//      rust golang key-management HSM FIDO2 WebAuthn"
//
// Original text is always prepended so we don't lose the exact terms.

async function expandSearchQuery(
  ai: Ai,
  description: string,
  stacks: string[],
  role: string,
): Promise<string> {
  const rawText = [description, stacks.join(' '), role].filter(Boolean).join(' ');

  // If the query is already long and specific (>180 chars), skip expansion —
  // it's already rich enough for a good embedding.
  if (rawText.length > 180) return rawText;

  const resp = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content:
          'You are a technical search assistant. Expand queries into rich vocabulary for semantic search. ' +
          'Output ONLY space-separated technical terms, no prose, no punctuation.',
      },
      {
        role: 'user',
        content:
          `Expand this developer search into 20-30 related technical terms (technologies, protocols, concepts, frameworks):\n\n` +
          `Query: "${description}"\n` +
          (stacks.length ? `Stack: ${stacks.join(', ')}\n` : '') +
          (role ? `Role: ${role}\n` : '') +
          `\nOutput only space-separated terms:`,
      },
    ],
    max_tokens: 120,
    temperature: 0.2,
  }) as { response: string };

  // Prepend original text so exact terms always match, expansion enriches the embedding
  return `${rawText} ${resp.response.trim().replace(/[^a-z0-9\s\-\.]/gi, ' ')}`;
}

// ── POST /api/search ────────────────────────────────────────────────────────

apiRouter.post('/search', zValidator('json', SearchBodySchema), async (c) => {
  const body = c.req.valid('json');

  // Expand query before embedding — short queries embed poorly, expansion adds
  // related technical vocabulary so Vectorize similarity works better.
  const searchText = await expandSearchQuery(
    c.env.AI,
    body.description,
    body.stacks,
    body.role,
  );

  const vectorResults = await executeSearch(c.env, { query: searchText, limit: body.limit });
  const queries = c.get('queries');

  // Hydrate each result in parallel
  const hydrated = (await Promise.all(
    vectorResults.map(async (result) => {
      const dev = await queries.getDeveloperByUsername(result.developerId);
      if (!dev) return null;

      const [domainRows, langRows, repoCountRow] = await Promise.all([
        c.env.DB.prepare(
          'SELECT domain, score FROM developer_domains WHERE developer_id = ? ORDER BY score DESC LIMIT 3'
        ).bind(dev.id).all(),
        c.env.DB.prepare(
          'SELECT languages FROM contributions WHERE developer_id = ? AND languages IS NOT NULL LIMIT 100'
        ).bind(dev.id).all(),
        c.env.DB.prepare(
          'SELECT COUNT(DISTINCT repo_full_name) as cnt FROM contributions WHERE developer_id = ?'
        ).bind(dev.id).first<{ cnt: number }>(),
      ]);

      const langCounts = new Map<string, number>();
      for (const row of langRows.results) {
        const langs: string[] = JSON.parse(row.languages as string);
        for (const lang of langs) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
      }
      const totalLang = [...langCounts.values()].reduce((a, b) => a + b, 0) || 1;
      const topLangs = [...langCounts.entries()]
        .sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([lang, count]) => ({ language: lang, percentage: Math.round(count / totalLang * 100) }));

      const overallImpact: number = (dev as any).overall_impact ?? 0;
      const topDomains = domainRows.results.map(r => ({ domain: r.domain as string, score: r.score as number }));
      const repoCount = repoCountRow?.cnt ?? 0;
      const matchConfidence = Math.round((result.similarity * 0.6 + (overallImpact / 100) * 0.4) * 100);

      return { dev, topDomains, topLangs, overallImpact, repoCount, matchConfidence };
    })
  )).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof Promise.all<any[]>>>>[number][];

  // Sort by matchConfidence desc
  hydrated.sort((a, b) => b.matchConfidence - a.matchConfidence);

  // Generate whyMatched explanations in parallel (one Workers AI call per developer)
  const matchResults = await Promise.all(
    hydrated.map(async (h) => {
      const prompt = `Write one sentence explaining why this developer matches "${body.description}" for a ${body.role || 'software engineering'} role using ${body.stacks.join(', ') || 'their stack'}.
Developer: domains=${h.topDomains.map((d: { domain: string }) => d.domain).join(', ')}, languages=${h.topLangs.map((l: { language: string }) => l.language).join(', ')}, impact=${h.overallImpact}/100, ${h.repoCount} repos.
Start with "They've" or "Strong match:". One sentence only.`;

      const aiResp = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a technical recruiting analyst. Write a single, specific, factual sentence.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 80,
        temperature: 0.4,
      }) as { response: string };

      return {
        developerId: h.dev.id,
        username: h.dev.username,
        githubUrl: `https://github.com/${h.dev.username}`,
        overallImpact: h.overallImpact,
        codeQuality: (h.dev as any).code_quality ?? 0,
        reviewQuality: (h.dev as any).review_quality ?? 0,
        topDomains: h.topDomains,
        topLanguages: h.topLangs,
        matchConfidence: h.matchConfidence,
        whyMatched: aiResp.response.trim().replace(/\n.*/s, ''),
      };
    })
  );

  return c.json(matchResults);
});

// ── GET /api/domains ────────────────────────────────────────────────────────
// Returns all domain tags that actually exist in the index, with developer
// counts. Powers the domain chip UI on the search form — only shows domains
// that have real indexed developers, sorted by breadth.
//
// Response: [{ domain: string, developerCount: number, avgScore: number }]

apiRouter.get('/domains', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT domain,
           COUNT(DISTINCT developer_id) AS developer_count,
           ROUND(AVG(score), 1)         AS avg_score
    FROM   developer_domains
    GROUP  BY domain
    ORDER  BY developer_count DESC
    LIMIT  100
  `).all<{ domain: string; developer_count: number; avg_score: number }>();

  return c.json(rows.results);
});

// No shortlist endpoints — shortlist state is managed client-side in localStorage.
// See ShortlistStore.ts.
```

### Wire into `src/worker.ts`

```typescript
// src/worker.ts
import { apiRouter } from './api/router';
import { WhodoestheworkMCP } from './mcp/server';

export { DeveloperIngestion } from './ingestion/durable-object';
export { WhodoestheworkMCP } from './mcp/server';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // MCP endpoint — delegate to Agents SDK (unchanged)
    if (url.pathname === '/sse' || url.pathname === '/mcp') {
      return WhodoestheworkMCP.serve('/mcp').fetch(request, env);
    }

    // REST API — delegate to Hono router
    if (url.pathname.startsWith('/api/')) {
      return apiRouter.fetch(request, env);
    }

    return new Response('whodoesthe.work', { status: 200 });
  },
};
```

**Note:** Install `@hono/zod-validator` for the `zValidator` helper:

```bash
npm install @hono/zod-validator
```

---

## Execution Steps

### Step 1: Initialize SvelteKit app

```bash
npm create svelte@latest ui
# Choose: Skeleton project, TypeScript, no additional tooling
cd ui && npm install
npm install -D @sveltejs/adapter-cloudflare
```

Update `ui/svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
};
```

Create `ui/.env.local`:

```
PUBLIC_API_URL=http://localhost:8787
PUBLIC_API_KEY=your_api_key_here
```

---

### Step 2: API Helper & Types

Create `ui/src/lib/api.ts`:

```typescript
import { PUBLIC_API_URL } from '$env/static/public';

// All endpoints are public — no auth header required.
const headers = { 'Content-Type': 'application/json' };

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
  topDomains: { domain: string; score: number }[];
  topLanguages: { language: string; percentage: number }[];
  matchConfidence: number; // 0-100
  whyMatched: string;      // AI-generated explanation
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
    headers,
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function getDeveloper(username: string): Promise<DeveloperProfile> {
  const res = await fetch(`${PUBLIC_API_URL}/api/developers/${encodeURIComponent(username)}`, { headers });
  if (!res.ok) throw new Error(`Not found: ${res.status}`);
  return res.json();
}

// Shortlist is managed entirely client-side via ShortlistStore (localStorage).
// No API calls needed — see stores/ShortlistStore.ts.

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
  const res = await fetch(`${PUBLIC_API_URL}/api/domains`, { headers });
  if (!res.ok) return []; // Non-fatal — form still works without chips
  return res.json();
}
```

---

### Step 3: Stores

Create `ui/src/lib/stores/SearchStore.ts`:

```typescript
import { writable } from 'svelte/store';
import type { SearchRequest } from '$lib/api';

// Holds the pending search request. Set on /search submit, read on /matches mount.
export const pendingSearch = writable<SearchRequest | null>(null);
```

Create `ui/src/lib/stores/ShortlistStore.ts`:

```typescript
import { writable } from 'svelte/store';
import type { MatchResult } from '$lib/api';

const STORAGE_KEY = 'wdtw_shortlist';

/**
 * Shortlist state lives entirely in localStorage.
 * No server round-trips — the demo is single-user and session-scoped.
 * localStorage (not sessionStorage) so the shortlist survives page refreshes
 * during a demo session.
 */
function createShortlistStore() {
  // Seed from localStorage on init (handles browser refresh)
  const initial: MatchResult[] = (() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  })();

  const { subscribe, set, update } = writable<MatchResult[]>(initial);

  // Keep localStorage in sync whenever the store changes
  function persist(list: MatchResult[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
    return list;
  }

  return {
    subscribe,

    add(match: MatchResult) {
      update(list => {
        if (list.find(m => m.username === match.username)) return list;
        return persist([...list, match]);
      });
    },

    remove(username: string) {
      update(list => persist(list.filter(m => m.username !== username)));
    },

    clear() {
      set(persist([]));
    },

    has(username: string): boolean {
      // Read directly from localStorage to avoid subscribing in non-reactive contexts
      try {
        const list: MatchResult[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return list.some(m => m.username === username);
      } catch {
        return false;
      }
    },
  };
}

export const shortlistStore = createShortlistStore();
```

---

### Step 4: Shared Components

> **DESIGN UPDATE — RESTYLE ALL COMPONENTS:** The code blocks below provide the correct markup structure and logic. However, all `<style>` sections use the **old dark-mode token set** and must be rewritten using the **new light/editorial token table** defined at the top of this spec. Do not copy the CSS colors from the code blocks — follow the "Component design specs" section above and the color palette table. Key differences: `background: #020617` → `#f5f2ed`, `background: #0a0f1e` → `#ffffff`, `border: #1e293b` → `#ddd8d0`, green accents (`#22c55e`) → acid green (`#b8ff57`), blue domain chips → lavender domain chips (`#ede9fe`/`#5b21b6`). Apply the pixel-grid texture to body and hero. Add selection handles (corner dots) to MatchCard and Hero eyebrow on hover.

**`ui/src/lib/components/ScoreBar.svelte`** (keep markup structure; restyle with new tokens):

```svelte
<script lang="ts">
  export let label: string;
  export let value: number | null;
  export let max = 100;
  export let height = '8px';

  $: pct = value !== null ? Math.round((value / max) * 100) : 0;
  $: color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
</script>

<div class="score-bar">
  <div class="label-row">
    <span class="label">{label}</span>
    <span class="value">{value !== null ? value.toFixed(1) : '—'}</span>
  </div>
  <div class="track" style="height: {height}">
    <div class="fill" style="width: {pct}%; background: {color}" />
  </div>
</div>

<style>
  .score-bar { margin-bottom: 0.5rem; }
  .label-row { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.2rem; color: #64748b; }
  .value { font-weight: 600; color: #e2e8f0; }
  .track { background: #1e293b; border-radius: 4px; overflow: hidden; }
  .fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
</style>
```

---

**`ui/src/lib/components/Hero.svelte`**:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  const SAMPLE_QUERIES = [
    'Distributed systems, Go or Rust',
    'Frontend React + TypeScript, design systems',
    'ML infrastructure, Python + CUDA',
    'Backend APIs, high-scale Postgres',
  ];

  function prefill(query: string) {
    goto(`/search?q=${encodeURIComponent(query)}`);
  }
</script>

<section class="hero">
  <div class="glow" aria-hidden="true" />
  <div class="content">
    <div class="eyebrow">Developer Intelligence Platform</div>
    <h1>
      Find engineers who've built<br />
      <span class="accent">exactly what you need</span>
    </h1>
    <p class="subhead">
      Describe your project. Pick your stack. Get ranked developers with
      evidence from their actual GitHub contributions — not their LinkedIn.
    </p>
    <div class="cta-row">
      <a href="/search" class="btn-primary">Find engineers →</a>
      <a href="/mcp" class="btn-ghost">MCP API for agents</a>
    </div>
    <div class="chips">
      <span class="chips-label">Try:</span>
      {#each SAMPLE_QUERIES as q}
        <button class="chip" on:click={() => prefill(q)}>{q}</button>
      {/each}
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: 6rem 1rem 4rem;
    text-align: center;
    overflow: hidden;
  }
  .glow {
    position: absolute;
    top: -100px; left: 50%; transform: translateX(-50%);
    width: 800px; height: 500px;
    background: radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .content { position: relative; max-width: 720px; margin: 0 auto; }
  .eyebrow {
    display: inline-block;
    background: rgba(59,130,246,0.12);
    color: #3b82f6;
    border: 1px solid rgba(59,130,246,0.25);
    border-radius: 999px;
    padding: 0.25rem 0.875rem;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    font-weight: 800;
    color: #f1f5f9;
    line-height: 1.15;
    margin: 0 0 1.25rem;
  }
  .accent { color: #3b82f6; }
  .subhead {
    font-size: 1.125rem;
    color: #64748b;
    max-width: 560px;
    margin: 0 auto 2rem;
    line-height: 1.6;
  }
  .cta-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.75rem; }
  .btn-primary {
    padding: 0.75rem 1.75rem;
    background: #3b82f6;
    color: white;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
  }
  .btn-primary:hover {
    background: #2563eb;
    box-shadow: 0 0 24px rgba(59,130,246,0.35);
  }
  .btn-ghost {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: #94a3b8;
    border: 1px solid #1e293b;
    border-radius: 8px;
    font-size: 1rem;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: #334155; color: #e2e8f0; }
  .chips { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
  .chips-label { font-size: 0.8rem; color: #475569; }
  .chip {
    background: #0f172a;
    border: 1px solid #1e293b;
    color: #94a3b8;
    border-radius: 999px;
    padding: 0.25rem 0.875rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .chip:hover { border-color: #334155; color: #e2e8f0; }
</style>
```

---

**`ui/src/lib/components/ProjectForm.svelte`** (3-step wizard):

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SearchRequest } from '$lib/api';

  const dispatch = createEventDispatcher<{ submit: SearchRequest }>();

  import { onMount } from 'svelte';
  import { getDomains, type DomainEntry } from '$lib/api';

  export let initialDescription = '';

  // Languages are fixed — these are well-known and don't change.
  const LANGUAGES = [
    'Rust', 'Go', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby',
    'Scala', 'Kotlin', 'Swift', 'Elixir', 'Haskell', 'Zig',
    'React', 'Next.js', 'SvelteKit', 'Vue', 'Node.js', 'PostgreSQL',
  ];

  // Domain chips are loaded from GET /api/domains — only shows domains with
  // actual indexed developers. Falls back to empty array silently.
  let domainChips: DomainEntry[] = [];
  let selectedDomains: string[] = [];

  // Combined stack selection: languages + domains in same chip grid
  $: STACKS = [
    ...LANGUAGES,
    ...domainChips.slice(0, 12).map(d => d.domain),
  ];

  onMount(async () => {
    domainChips = await getDomains();
  });
  const ROLES = [
    'Backend engineer', 'Frontend engineer', 'Full-stack engineer',
    'Infrastructure / DevOps', 'ML / Data engineer', 'Security engineer',
  ];

  let step = 1;
  let description = initialDescription;
  let selectedStacks: string[] = [];
  let selectedRole = '';

  $: descOk = description.trim().length >= 20;
  $: descCount = description.trim().length;
  $: descHint = descOk ? 'Looking good' : `${Math.max(0, 20 - descCount)} more characters`;

  function toggleStack(s: string) {
    selectedStacks = selectedStacks.includes(s)
      ? selectedStacks.filter(x => x !== s)
      : [...selectedStacks, s];
  }

  function submit() {
    dispatch('submit', {
      description: description.trim(),
      stacks: selectedStacks,
      role: selectedRole,
      limit: 10,
    });
  }
</script>

<div class="form">
  <!-- Progress dots -->
  <div class="steps">
    {#each [1, 2, 3] as s}
      <div class="dot" class:active={step === s} class:done={step > s} />
      {#if s < 3}<div class="line" class:done={step > s} />{/if}
    {/each}
  </div>

  {#if step === 1}
    <div class="step">
      <h2>Describe your project</h2>
      <p class="hint-top">What are you building? What engineering problems need solving?</p>
      <textarea
        bind:value={description}
        placeholder="e.g. Building a real-time payment settlement system. Need someone who understands distributed transactions, consistency guarantees, and can ship production Rust or Go..."
        rows={5}
      />
      <div class="desc-hint" class:ok={descOk}>{descHint}</div>
      <button class="btn-primary" disabled={!descOk} on:click={() => (step = 2)}>
        Next →
      </button>
    </div>

  {:else if step === 2}
    <div class="step">
      <h2>Pick your stack</h2>
      <p class="hint-top">Select all that apply. Leave empty if you're stack-agnostic.</p>
      <div class="chip-grid">
        {#each STACKS as s}
          <button
            class="stack-chip"
            class:selected={selectedStacks.includes(s)}
            on:click={() => toggleStack(s)}
          >{s}</button>
        {/each}
      </div>
      <div class="btn-row">
        <button class="btn-ghost" on:click={() => (step = 1)}>← Back</button>
        <button class="btn-primary" on:click={() => (step = 3)}>Next →</button>
      </div>
    </div>

  {:else}
    <div class="step">
      <h2>What role are you hiring for?</h2>
      <div class="role-grid">
        {#each ROLES as r}
          <button
            class="role-card"
            class:selected={selectedRole === r}
            on:click={() => (selectedRole = r)}
          >{r}</button>
        {/each}
      </div>
      <div class="btn-row">
        <button class="btn-ghost" on:click={() => (step = 2)}>← Back</button>
        <button class="btn-primary" disabled={!selectedRole} on:click={submit}>
          Find matches →
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .form { max-width: 580px; margin: 0 auto; }
  .steps {
    display: flex; align-items: center; justify-content: center;
    gap: 0; margin-bottom: 2.5rem;
  }
  .dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #1e293b; border: 2px solid #334155;
    transition: background 0.2s, border-color 0.2s;
  }
  .dot.active { background: #3b82f6; border-color: #3b82f6; }
  .dot.done { background: #22c55e; border-color: #22c55e; }
  .line { flex: 1; height: 2px; background: #1e293b; max-width: 48px; }
  .line.done { background: #22c55e; }
  .step { display: flex; flex-direction: column; gap: 1rem; }
  h2 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 0; }
  .hint-top { color: #64748b; font-size: 0.9rem; margin: 0; }
  textarea {
    width: 100%; padding: 0.875rem 1rem; background: #0f172a;
    border: 1px solid #334155; border-radius: 8px; color: #e2e8f0;
    font-size: 1rem; line-height: 1.6; resize: vertical; min-height: 120px;
  }
  textarea:focus { outline: none; border-color: #3b82f6; }
  .desc-hint { font-size: 0.8rem; color: #475569; }
  .desc-hint.ok { color: #22c55e; }
  .chip-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .stack-chip {
    padding: 0.35rem 0.875rem; border-radius: 999px;
    background: #0f172a; border: 1px solid #1e293b;
    color: #94a3b8; font-size: 0.875rem; cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .stack-chip.selected {
    border-color: #3b82f6; color: #93c5fd;
    background: rgba(59,130,246,0.08);
  }
  .role-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
  }
  .role-card {
    padding: 0.875rem 1rem; background: #0f172a; border: 1px solid #1e293b;
    border-radius: 8px; color: #94a3b8; font-size: 0.9rem; cursor: pointer;
    text-align: left; transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .role-card.selected {
    border-color: #3b82f6; color: #93c5fd;
    background: rgba(59,130,246,0.08);
  }
  .btn-row { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .btn-primary {
    padding: 0.75rem 1.5rem; background: #3b82f6; color: white;
    border: none; border-radius: 8px; font-size: 1rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s, box-shadow 0.15s;
  }
  .btn-primary:hover:not(:disabled) {
    background: #2563eb; box-shadow: 0 0 24px rgba(59,130,246,0.35);
  }
  .btn-primary:disabled { opacity: 0.45; cursor: default; }
  .btn-ghost {
    padding: 0.75rem 1.25rem; background: transparent; color: #94a3b8;
    border: 1px solid #1e293b; border-radius: 8px; font-size: 1rem; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: #334155; color: #e2e8f0; }
</style>
```

---

**`ui/src/lib/components/MatchCard.svelte`** (core Vamo-feel component):

```svelte
<script lang="ts">
  import type { MatchResult } from '$lib/api';
  import { shortlistStore } from '$lib/stores/ShortlistStore';

  export let match: MatchResult;
  export let rank: number;

  $: confidence = match.matchConfidence;
  $: confidenceColor = confidence >= 70 ? '#22c55e' : confidence >= 40 ? '#eab308' : '#94a3b8';

  $: isShortlisted = $shortlistStore.some(m => m.username === match.username);

  function toggleShortlist() {
    if (isShortlisted) {
      shortlistStore.remove(match.username);
    } else {
      shortlistStore.add(match);
    }
  }
</script>

<div class="card" class:shortlisted={isShortlisted}>
  <!-- Rank badge -->
  <div class="rank">
    <span class="rank-num">#{rank}</span>
  </div>

  <div class="body">
    <!-- Top row -->
    <div class="top-row">
      <div class="name-block">
        <span class="username">@{match.username}</span>
      </div>
      <div class="badges">
        <span
          class="confidence-badge"
          style="color: {confidenceColor}; border-color: {confidenceColor}44;"
        >
          {confidence}% match
        </span>
        <span class="impact">{match.overallImpact.toFixed(0)}</span>
      </div>
    </div>

    <!-- Domain tags -->
    {#if match.topDomains.length > 0}
      <div class="domains">
        {#each match.topDomains.slice(0, 3) as d}
          <span class="domain-chip">{d.domain}</span>
        {/each}
      </div>
    {/if}

    <!-- Why matched block -->
    {#if match.whyMatched}
      <div class="why-matched">
        <span class="why-label">WHY MATCHED</span>
        <p class="why-text">{match.whyMatched}</p>
      </div>
    {/if}

    <!-- Score mini-bars -->
    <div class="score-row">
      <div class="score-item">
        <span class="score-label">Code quality</span>
        <div class="mini-bar-track">
          <div
            class="mini-bar-fill"
            style="width: {match.codeQuality}%; background: {match.codeQuality >= 70 ? '#22c55e' : match.codeQuality >= 40 ? '#eab308' : '#ef4444'}"
          />
        </div>
      </div>
      <div class="score-item">
        <span class="score-label">Review quality</span>
        <div class="mini-bar-track">
          <div
            class="mini-bar-fill"
            style="width: {match.reviewQuality}%; background: {match.reviewQuality >= 70 ? '#22c55e' : match.reviewQuality >= 40 ? '#eab308' : '#ef4444'}"
          />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="langs">
        {#each match.topLanguages.slice(0, 3) as l}
          <span class="lang-chip">{l.language}</span>
        {/each}
      </div>
      <div class="actions">
        <a href="/developer/{match.username}" class="view-link">View profile</a>
        <button class="shortlist-btn" class:active={isShortlisted} on:click={toggleShortlist}>
          {isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .card {
    display: flex;
    background: #0a0f1e;
    border: 1px solid #1e293b;
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .card:hover {
    border-color: #334155;
    box-shadow: 0 0 12px rgba(59,130,246,0.06);
  }
  .rank {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    background: #020617;
    border-right: 1px solid #1e293b;
    flex-shrink: 0;
  }
  .rank-num {
    writing-mode: vertical-lr;
    transform: rotate(180deg);
    font-size: 0.7rem;
    font-weight: 700;
    color: #334155;
    letter-spacing: 0.08em;
  }
  .body { flex: 1; padding: 1.125rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .username { font-size: 1.05rem; font-weight: 700; color: #f1f5f9; }
  .badges { display: flex; align-items: center; gap: 0.625rem; }
  .confidence-badge {
    font-size: 0.75rem; font-weight: 600;
    padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid;
  }
  .impact { font-size: 1.5rem; font-weight: 800; color: #3b82f6; line-height: 1; }
  .domains { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .domain-chip {
    padding: 0.2rem 0.65rem; background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2); border-radius: 999px;
    font-size: 0.75rem; color: #93c5fd;
  }
  .why-matched {
    padding: 0.625rem 0.875rem;
    border-left: 2px solid rgba(59,130,246,0.4);
    background: rgba(59,130,246,0.04);
    border-radius: 0 6px 6px 0;
  }
  .why-label {
    font-size: 0.65rem; font-weight: 700; color: #3b82f6;
    letter-spacing: 0.08em; display: block; margin-bottom: 0.25rem;
  }
  .why-text { font-size: 0.875rem; color: #cbd5e1; line-height: 1.5; margin: 0; }
  .score-row { display: flex; gap: 1.5rem; }
  .score-item { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
  .score-label { font-size: 0.7rem; color: #475569; }
  .mini-bar-track { background: #1e293b; border-radius: 2px; height: 4px; overflow: hidden; }
  .mini-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; }
  .langs { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .lang-chip {
    padding: 0.15rem 0.5rem; background: #0f172a;
    border: 1px solid #1e293b; border-radius: 999px;
    font-size: 0.7rem; color: #64748b;
  }
  .actions { display: flex; gap: 0.625rem; align-items: center; }
  .view-link { font-size: 0.8rem; color: #64748b; text-decoration: none; }
  .view-link:hover { color: #94a3b8; }
  .shortlist-btn {
    padding: 0.3rem 0.875rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
    background: transparent; border: 1px solid #1e293b; color: #64748b;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .shortlist-btn:hover { border-color: #22c55e; color: #22c55e; }
  .shortlist-btn.active {
    border-color: #22c55e; color: #22c55e;
    background: rgba(34,197,94,0.06);
  }
</style>
```

---

### Step 5: Layout Shell

Create `ui/src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { shortlistStore } from '$lib/stores/ShortlistStore';
  import { onMount } from 'svelte';

  onMount(() => shortlistStore.load());

  $: shortlistCount = $shortlistStore.length;
</script>

<div class="app">
  <nav>
    <a href="/" class="brand">whodoesthe.work</a>
    <div class="nav-links">
      <a href="/search" class:active={$page.url.pathname.startsWith('/search') || $page.url.pathname.startsWith('/matches')}>
        Find Engineers
      </a>
      <a href="/shortlist" class:active={$page.url.pathname === '/shortlist'}>
        Shortlist{shortlistCount > 0 ? ` (${shortlistCount})` : ''}
      </a>
    </div>
  </nav>
  <main>
    <slot />
  </main>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0; background: #020617; color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  :global(a) { color: inherit; }
  .app { min-height: 100vh; }
  nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    height: 65px; padding: 0 2rem;
    background: rgba(10,15,30,0.85);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #0f2240;
  }
  .brand { font-size: 1rem; font-weight: 700; color: #f1f5f9; text-decoration: none; }
  .nav-links { display: flex; gap: 1.5rem; }
  .nav-links a {
    font-size: 0.9rem; color: #64748b; text-decoration: none;
    transition: color 0.15s;
  }
  .nav-links a:hover, .nav-links a.active { color: #e2e8f0; }
  main { min-height: calc(100vh - 65px); }
</style>
```

---

### Step 6: Landing Page

Create `ui/src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
</script>

<svelte:head><title>whodoesthe.work — Developer Intelligence Platform</title></svelte:head>

<Hero />

<!-- Value props -->
<section class="value-props">
  <div class="grid">
    <div class="prop">
      <div class="prop-icon">🎯</div>
      <h3>Contribution-based matching</h3>
      <p>We analyze public GitHub commits, PRs, and code reviews — not self-reported skills or keyword-stuffed profiles.</p>
    </div>
    <div class="prop">
      <div class="prop-icon">⚡</div>
      <h3>AI match explanations</h3>
      <p>Every result comes with a one-sentence explanation of why this developer fits your specific project — grounded in actual evidence.</p>
    </div>
    <div class="prop">
      <div class="prop-icon">📋</div>
      <h3>Shortlist and share</h3>
      <p>Save your top candidates to a shortlist backed by your API key. Share with co-founders or your team without losing context.</p>
    </div>
  </div>
</section>

<!-- Stats bar -->
<section class="stats-bar">
  <div class="stats">
    <div class="stat"><span class="stat-num">6</span><span class="stat-label">quality dimensions</span></div>
    <div class="divider" />
    <div class="stat"><span class="stat-num">Edge</span><span class="stat-label">Cloudflare Workers</span></div>
    <div class="divider" />
    <div class="stat"><span class="stat-num">&lt;3s</span><span class="stat-label">median first result</span></div>
    <div class="divider" />
    <div class="stat"><span class="stat-num">Public</span><span class="stat-label">data only, auditable</span></div>
  </div>
</section>

<style>
  .value-props { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
  .prop {
    background: #0a0f1e; border: 1px solid #1e293b; border-radius: 10px;
    padding: 1.5rem;
  }
  .prop-icon { font-size: 1.5rem; margin-bottom: 0.75rem; }
  h3 { font-size: 1rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.5rem; }
  p { font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.6; }
  .stats-bar {
    border-top: 1px solid #0f172a; padding: 2rem 1.5rem;
    background: #0a0f1e;
  }
  .stats {
    max-width: 720px; margin: 0 auto;
    display: flex; align-items: center; justify-content: center;
    gap: 2rem; flex-wrap: wrap;
  }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
  .stat-num { font-size: 1.25rem; font-weight: 800; color: #3b82f6; }
  .stat-label { font-size: 0.75rem; color: #475569; text-align: center; }
  .divider { width: 1px; height: 32px; background: #1e293b; }
</style>
```

---

### Step 7: Search / Onboarding Page

Create `ui/src/routes/search/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ProjectForm from '$lib/components/ProjectForm.svelte';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import type { SearchRequest } from '$lib/api';

  // Pre-fill from ?q= param (set by Hero chip clicks)
  const initialDescription = $page.url.searchParams.get('q') ?? '';

  function handleSubmit(event: CustomEvent<SearchRequest>) {
    pendingSearch.set(event.detail);
    goto('/matches');
  }
</script>

<svelte:head><title>Find Engineers — whodoesthe.work</title></svelte:head>

<div class="page">
  <div class="header">
    <h1>Describe your project</h1>
    <p>Tell us what you're building. We'll match you with developers who've shipped similar work.</p>
  </div>
  <ProjectForm {initialDescription} on:submit={handleSubmit} />
</div>

<style>
  .page { max-width: 640px; margin: 0 auto; padding: 3.5rem 1.5rem; }
  .header { text-align: center; margin-bottom: 2.5rem; }
  h1 { font-size: 1.875rem; font-weight: 800; color: #f1f5f9; margin: 0 0 0.5rem; }
  p { color: #64748b; font-size: 1rem; margin: 0; }
</style>
```

---

### Step 8: Matches Page

Create `ui/src/routes/matches/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import { searchMatches, type MatchResult } from '$lib/api';
  import MatchCard from '$lib/components/MatchCard.svelte';

  let results: MatchResult[] = [];
  let loading = true;
  let error = '';
  let req = $pendingSearch;

  onMount(async () => {
    if (!req) {
      goto('/search');
      return;
    }
    try {
      results = await searchMatches(req);
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Matches — whodoesthe.work</title></svelte:head>

<div class="page">
  {#if req}
    <div class="search-header">
      <div class="query-summary">
        <span class="role">{req.role || 'Engineer'}</span>
        {#if req.stacks.length > 0}
          <span class="separator">·</span>
          <span class="stacks">{req.stacks.slice(0, 3).join(', ')}</span>
        {/if}
      </div>
      <div class="header-actions">
        <a href="/search" class="refine-link">Refine search</a>
        <a href="/shortlist" class="shortlist-link">View shortlist →</a>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner" />
      <p>Finding your matches…</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error">{error}</p>
      <a href="/search" class="btn-primary">Try again</a>
    </div>
  {:else if results.length === 0}
    <div class="empty-state">
      <p>No matches found. Try broadening your description or removing stack filters.</p>
      <a href="/search" class="btn-primary">Refine search</a>
    </div>
  {:else}
    <p class="result-count">{results.length} developers matched</p>
    <div class="results">
      {#each results as match, i}
        <MatchCard {match} rank={i + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
  .search-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;
  }
  .query-summary { display: flex; align-items: center; gap: 0.5rem; }
  .role { font-size: 1rem; font-weight: 700; color: #f1f5f9; }
  .separator { color: #334155; }
  .stacks { font-size: 0.9rem; color: #64748b; }
  .header-actions { display: flex; gap: 1rem; align-items: center; }
  .refine-link { font-size: 0.85rem; color: #64748b; text-decoration: none; }
  .refine-link:hover { color: #94a3b8; }
  .shortlist-link { font-size: 0.85rem; color: #3b82f6; text-decoration: none; }
  .shortlist-link:hover { color: #60a5fa; }
  .result-count { font-size: 0.85rem; color: #475569; margin-bottom: 1rem; }
  .results { display: flex; flex-direction: column; gap: 1rem; }
  .loading {
    display: flex; flex-direction: column; align-items: center;
    gap: 1rem; padding: 5rem 0; color: #64748b;
  }
  .spinner {
    width: 36px; height: 36px; border: 3px solid #1e293b;
    border-top-color: #3b82f6; border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state, .error-state {
    text-align: center; padding: 4rem 0; color: #64748b;
  }
  .error { color: #ef4444; }
  .btn-primary {
    display: inline-block; margin-top: 1rem;
    padding: 0.625rem 1.25rem; background: #3b82f6; color: white;
    border-radius: 8px; font-size: 0.9rem; text-decoration: none;
  }
</style>
```

---

### Step 9: Developer Profile Page

Create `ui/src/routes/developer/[username]/+page.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { getDeveloper, type DeveloperProfile } from '$lib/api';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import { shortlistStore } from '$lib/stores/ShortlistStore';
  import ScoreBar from '$lib/components/ScoreBar.svelte';
  import { onMount } from 'svelte';

  let profile: DeveloperProfile | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      profile = await getDeveloper($page.params.username);
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  $: isShortlisted = profile ? $shortlistStore.some(m => m.username === profile!.username) : false;

  async function toggleShortlist() {
    if (!profile) return;
    if (isShortlisted) {
      await shortlistStore.remove(profile.username);
    } else {
      // Build minimal MatchResult from profile data
      await shortlistStore.add({
        developerId: profile.id,
        username: profile.username,
        githubUrl: `https://github.com/${profile.username}`,
        overallImpact: profile.overallImpact ?? 0,
        codeQuality: profile.codeQuality ?? 0,
        reviewQuality: profile.reviewQuality ?? 0,
        topDomains: profile.domains.slice(0, 3).map(d => ({ domain: d.domain, score: d.score })),
        topLanguages: [],
        matchConfidence: 0,
        whyMatched: '',
      });
    }
  }
</script>

<svelte:head><title>{$page.params.username} — whodoesthe.work</title></svelte:head>

<div class="page">
  {#if $pendingSearch}
    <div class="context-banner">
      <a href="/matches" class="back-link">← Back to matches</a>
    </div>
  {:else}
    <a href="/" class="back-link">← Home</a>
  {/if}

  {#if loading}
    <p class="status">Loading profile…</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if profile}
    <div class="profile">
      <div class="hero-row">
        <div>
          <h1>@{profile.username}</h1>
          <a href="https://github.com/{profile.username}" target="_blank" rel="noopener" class="gh-link">
            View on GitHub →
          </a>
        </div>
        <div class="right">
          <div class="impact">{profile.overallImpact?.toFixed(1) ?? '—'}</div>
          <button class="shortlist-btn" class:active={isShortlisted} on:click={toggleShortlist}>
            {isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
          </button>
        </div>
      </div>

      <section>
        <h2>Score Breakdown</h2>
        <ScoreBar label="Code Quality" value={profile.codeQuality} />
        <ScoreBar label="Review Quality" value={profile.reviewQuality} />
        <ScoreBar label="Documentation" value={profile.documentationQuality} />
        <ScoreBar label="Collaboration Breadth" value={profile.collaborationBreadth} />
        <ScoreBar label="Consistency" value={profile.consistencyScore} />
        <ScoreBar label="Recent Activity" value={profile.recentActivityScore} />
      </section>

      {#if profile.domains.length > 0}
        <section>
          <h2>Domain Expertise</h2>
          <div class="domain-grid">
            {#each profile.domains.slice(0, 8) as d}
              <div class="domain-card">
                <div class="domain-name">{d.domain}</div>
                <div class="domain-score">{d.score.toFixed(0)}</div>
                <div class="domain-count">{d.contributionCount} contributions</div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
  .context-banner, .back-link { display: block; margin-bottom: 1.5rem; }
  .back-link { font-size: 0.85rem; color: #64748b; text-decoration: none; }
  .back-link:hover { color: #94a3b8; }
  .hero-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 1.5rem 0; }
  h1 { font-size: 1.75rem; font-weight: 800; color: #f1f5f9; margin: 0 0 0.375rem; }
  .gh-link { font-size: 0.85rem; color: #3b82f6; text-decoration: none; }
  .right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.625rem; }
  .impact { font-size: 3rem; font-weight: 900; color: #22c55e; line-height: 1; }
  .shortlist-btn {
    padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    background: transparent; border: 1px solid #1e293b; color: #64748b;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .shortlist-btn:hover { border-color: #22c55e; color: #22c55e; }
  .shortlist-btn.active { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.06); }
  section { margin: 2rem 0; }
  h2 {
    font-size: 0.8rem; font-weight: 600; color: #475569;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1rem;
  }
  .domain-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
  .domain-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 0.875rem; }
  .domain-name { font-size: 0.875rem; color: #e2e8f0; font-weight: 500; margin-bottom: 0.25rem; }
  .domain-score { font-size: 1.25rem; font-weight: 700; color: #3b82f6; }
  .domain-count { font-size: 0.7rem; color: #475569; margin-top: 0.25rem; }
  .status { color: #64748b; text-align: center; margin-top: 4rem; }
  .error { color: #ef4444; text-align: center; margin-top: 4rem; }
</style>
```

---

### Step 10: Shortlist Page

Create `ui/src/routes/shortlist/+page.svelte`:

```svelte
<script lang="ts">
  import { shortlistStore } from '$lib/stores/ShortlistStore';
  import MatchCard from '$lib/components/MatchCard.svelte';

  // Store is pre-loaded from localStorage on init — no async needed.
  $: matches = $shortlistStore;
</script>

<svelte:head><title>Shortlist — whodoesthe.work</title></svelte:head>

<div class="page">
  <div class="header">
    <h1>Shortlist</h1>
    {#if matches.length > 0}
      <div class="header-actions">
        <span class="count">{matches.length} candidate{matches.length !== 1 ? 's' : ''}</span>
        <button class="clear-btn" on:click={() => shortlistStore.clear()}>Clear all</button>
      </div>
    {/if}
  </div>

  {#if matches.length === 0}
    <div class="empty-state">
      <p>No candidates shortlisted yet.</p>
      <a href="/search" class="btn-primary">Find engineers →</a>
    </div>
  {:else}
    <div class="results">
      {#each matches as match, i}
        <MatchCard {match} rank={i + 1} />
      {/each}
    </div>
    <div class="footer">
      <a href="/search" class="find-more">Find more engineers →</a>
    </div>
  {/if}
</div>

<style>
  .page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  h1 { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; margin: 0; }
  .header-actions { display: flex; align-items: center; gap: 1rem; }
  .count { font-size: 0.875rem; color: #64748b; }
  .clear-btn {
    font-size: 0.8rem; color: #ef4444; background: transparent;
    border: 1px solid rgba(239,68,68,0.25); border-radius: 6px;
    padding: 0.3rem 0.75rem; cursor: pointer;
    transition: background 0.15s;
  }
  .clear-btn:hover { background: rgba(239,68,68,0.08); }
  .empty-state { text-align: center; padding: 5rem 0; color: #64748b; }
  .btn-primary {
    display: inline-block; margin-top: 1rem;
    padding: 0.625rem 1.25rem; background: #3b82f6; color: white;
    border-radius: 8px; font-size: 0.9rem; text-decoration: none;
  }
  .results { display: flex; flex-direction: column; gap: 1rem; }
  .footer { margin-top: 2rem; text-align: center; }
  .find-more { font-size: 0.9rem; color: #3b82f6; text-decoration: none; }
  .find-more:hover { color: #60a5fa; }
</style>
```

---

### Step 11: Deploy to Cloudflare Pages

```bash
cd ui && npm run build

npx wrangler pages deploy .svelte-kit/cloudflare --project-name wdtw-ui
```

Set environment variables in Cloudflare Pages dashboard (Settings → Environment variables):

```
PUBLIC_API_URL = https://api.whodoesthe.work
```

For local development:

```bash
# ui/.env.local
PUBLIC_API_URL=http://localhost:8787
npm run dev
```

---

## Implementation Order (to avoid blocking)

| Step | Task | Backend Dep |
|---|---|---|
| 1 | `POST /api/search` + `GET /api/domains` Worker endpoints | Unblocks UI dev |
| 2 | SearchStore + ShortlistStore (localStorage) + API types | None |
| 3 | Layout shell + Hero + landing page | None |
| 4 | ProjectForm component | None |
| 5 | MatchCard component | Types only |
| 6 | `/matches` page | Step 1 |
| 7 | `/shortlist` page | Step 2 |
| 8 | Profile page shortlist button | Step 2 |
| 9 | spec-07 match_explanation improvement | Isolated, last |

---

## Definition of Done

- [ ] `npm run dev` in `ui/` starts the app
- [ ] Landing page renders Hero, value props, and stats bar
- [ ] 3-step ProjectForm validates description (min 20 chars), allows stack multi-select, requires role
- [ ] `/matches` calls `POST /api/search` and renders MatchCard grid with AI explanations
- [ ] MatchCard shortlist button adds/removes immediately (sync, no loading state needed)
- [ ] Shortlist survives page refresh (stored in localStorage under `wdtw_shortlist`)
- [ ] `/shortlist` reads from localStorage store — no API call, instant load
- [ ] `/developer/[username]` shows score breakdown with shortlist button
- [ ] Profile page shows "← Back to matches" banner when `$pendingSearch` is set
- [ ] No `x-api-key` header anywhere — all endpoints are public
- [ ] CORS handled in Worker for all `/api/` routes
- [ ] Deployed to Cloudflare Pages at `wdtw-ui.pages.dev` (or custom domain `whodoesthe.work` if Pages custom domain is configured)
- [ ] End-to-end demo: landing → search form → matches → shortlist all work against live Worker data
- [ ] Median time from `POST /api/search` to first painted result < 3s on warm cache

## Output Artifacts

- `ui/src/routes/+layout.svelte` — sticky nav
- `ui/src/routes/+page.svelte` — landing page
- `ui/src/routes/search/+page.svelte` — 3-step form
- `ui/src/routes/matches/+page.svelte` — results grid
- `ui/src/routes/developer/[username]/+page.svelte` — profile with shortlist
- `ui/src/routes/shortlist/+page.svelte` — saved candidates
- `ui/src/lib/api.ts` — fetch helpers + MatchResult type
- `ui/src/lib/stores/SearchStore.ts`
- `ui/src/lib/stores/ShortlistStore.ts`
- `ui/src/lib/components/Hero.svelte`
- `ui/src/lib/components/ProjectForm.svelte`
- `ui/src/lib/components/MatchCard.svelte`
- `ui/src/lib/components/ScoreBar.svelte`
- `src/api/router.ts` — Hono router with Zod-validated endpoints
- `src/worker.ts` — updated to delegate `/api/*` to Hono router
