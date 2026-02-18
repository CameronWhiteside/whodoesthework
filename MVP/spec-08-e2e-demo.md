# Spec 08 — E2E Integration & Live Demo Harness

**Status:** Not Started
**Blocks:** Nothing (this is the final integration)
**Blocked By:** All other specs (spec-00 through spec-07)
**Parallelizable with:** Nothing — this is integration
**Estimated effort:** 3-4 hours

---

## Objective

Wire everything together, deploy to Cloudflare, ingest 5-10 real developers, and run the "find me a developer who..." demo end-to-end through the MCP server. This is the proof that the system works.

---

## Execution Steps

### Step 1: Pre-flight Checklist

Before integration, verify each spec independently:

```bash
# Verify project compiles
npx tsc --noEmit

# Verify wrangler config
npx wrangler deploy --dry-run

# Check all bindings are configured
npx wrangler d1 list
npx wrangler vectorize list
npx wrangler queues list
```

**If anything fails here, fix it before proceeding.** Do not try to debug integration issues and configuration issues simultaneously.

### Step 2: Deploy Infrastructure

```bash
# Create D1 database (if not already done)
npx wrangler d1 create wdtw-db

# Create Queues
npx wrangler queues create wdtw-ingestion
npx wrangler queues create wdtw-ingestion-dlq

# Create Vectorize index
npx wrangler vectorize create wdtw-vectors --dimensions=384 --metric=cosine

# Apply D1 migrations
npx wrangler d1 migrations apply wdtw-db --remote

# Set secrets
npx wrangler secret put GITHUB_TOKEN
# (paste a GitHub personal access token with public_repo scope)
npx wrangler secret put API_SECRET_KEY
# (paste a random string for HMAC)
```

Update `wrangler.jsonc` with all resource IDs from the outputs above.

### Step 3: Deploy the Worker

```bash
npx wrangler deploy
```

Verify health:

```bash
curl https://whodoesthework.<your-subdomain>.workers.dev/health
# Expected: {"status":"ok","version":"0.1.0"}
```

### Step 4: Bootstrap Auth

```bash
# Create first API key
curl -X POST https://whodoesthework.<your-subdomain>.workers.dev/admin/create-key \
  -H 'Content-Type: application/json' \
  -d '{"ownerName": "demo"}'

# Save the returned key — you'll need it for MCP client config
# Example: wdtw_a1b2c3d4e5f6...
```

### Step 5: Seed Real Developers

Ingest 5-10 well-known open-source developers with diverse profiles. Choose developers who represent different domains, languages, and contribution patterns:

```bash
WORKER_URL="https://whodoesthework.<your-subdomain>.workers.dev"

# Systems / Go — a known Kubernetes contributor
curl -X POST $WORKER_URL/admin/ingest \
  -H 'Content-Type: application/json' \
  -d '{"username": "developer1"}'

# Rust / Systems — pick a well-known Rust contributor
curl -X POST $WORKER_URL/admin/ingest \
  -H 'Content-Type: application/json' \
  -d '{"username": "developer2"}'

# TypeScript / Frontend — pick a React ecosystem contributor
curl -X POST $WORKER_URL/admin/ingest \
  -H 'Content-Type: application/json' \
  -d '{"username": "developer3"}'

# Python / ML — pick an ML tools contributor
curl -X POST $WORKER_URL/admin/ingest \
  -H 'Content-Type: application/json' \
  -d '{"username": "developer4"}'

# Full-stack / Docs — pick someone known for writing good docs
curl -X POST $WORKER_URL/admin/ingest \
  -H 'Content-Type: application/json' \
  -d '{"username": "developer5"}'
```

**Selection criteria for demo developers:**
- Pick developers with public contributions you can verify
- Pick at least one developer who does a lot of code review (visible in PR review activity)
- Pick at least one developer who writes documentation
- Avoid developers with 10,000+ commits (ingestion will be slow at MVP)
- Prefer developers with 50-500 commits across 5-30 repos — typical active contributor profile

### Step 6: Monitor Ingestion

```bash
# Check status for each developer
for user in developer1 developer2 developer3 developer4 developer5; do
  echo "=== $user ==="
  curl -s $WORKER_URL/admin/ingest/status/$user | jq
done

# Check queue depth (via Cloudflare dashboard or CLI)
# Check D1 row counts
curl -s "$WORKER_URL/admin/stats" | jq
```

Add a stats endpoint:

```typescript
if (url.pathname === '/admin/stats') {
  const devCount = await env.DB.prepare('SELECT COUNT(*) as c FROM developers').first();
  const contribCount = await env.DB.prepare('SELECT COUNT(*) as c FROM contributions').first();
  const classifiedCount = await env.DB.prepare('SELECT COUNT(*) as c FROM contributions WHERE classified = 1').first();
  const scoredCount = await env.DB.prepare('SELECT COUNT(*) as c FROM contributions WHERE scored = 1').first();
  const reviewCount = await env.DB.prepare('SELECT COUNT(*) as c FROM reviews').first();

  return Response.json({
    developers: devCount?.c,
    contributions: contribCount?.c,
    classified: classifiedCount?.c,
    scored: scoredCount?.c,
    reviews: reviewCount?.c,
  });
}
```

Wait for all developers to reach `status: complete`. If anything stalls, check Cloudflare dashboard logs.

### Step 7: Trigger Classification + Scoring

If the cron hasn't run yet, trigger manually:

```bash
# Classify all unclassified contributions
curl -X POST $WORKER_URL/admin/classify

# Score all developers (one by one)
# Get developer IDs from D1
curl -s $WORKER_URL/admin/stats
```

Verify scores exist:

```bash
# Check a developer's profile via the admin layer
curl -s "$WORKER_URL/admin/ingest/status/developer1" | jq
```

### Step 8: Configure MCP Client

**Option A: Claude Desktop**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "whodoesthework": {
      "url": "https://whodoesthework.<your-subdomain>.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer wdtw_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

Restart Claude Desktop.

**Option B: Claude Code (CLI)**

Add to MCP settings or use `claude mcp add`:

```bash
claude mcp add whodoesthework \
  --url "https://whodoesthework.<your-subdomain>.workers.dev/mcp" \
  --header "Authorization: Bearer wdtw_YOUR_API_KEY_HERE"
```

**Option C: Direct SSE testing (no MCP client needed)**

```bash
# List tools via MCP protocol
curl -N "https://whodoesthework.<your-subdomain>.workers.dev/sse" \
  -H "Authorization: Bearer wdtw_YOUR_API_KEY_HERE"
```

### Step 9: Run the Demo

Open Claude Desktop (or your MCP client) and run these prompts:

**Demo 1: Search**

> "Using the whodoesthework tools, find me a developer who has significant experience in distributed systems or networking, writes Go or Rust, and reviews code regularly."

**Expected:** The `search_developers` tool is called. Returns ranked list of developers from the seeded set who match, with match explanations and scores.

**Demo 2: Profile Deep-Dive**

> "Get me the full engineering profile for [top result's username], including evidence of their best work."

**Expected:** The `get_developer_profile` tool is called. Returns full score breakdown, domain expertise, and links to top commits and reviews.

**Demo 3: Comparison**

> "Compare [developer1] and [developer3] — who would be better for a backend systems role?"

**Expected:** The `compare_developers` tool is called. Returns side-by-side comparison with dimension rankings and AI-generated narrative summary.

**Demo 4: Unknown Developer (Lazy Ingestion)**

> "What can you tell me about [new_developer_not_yet_ingested]'s engineering profile?"

**Expected:** Returns "ingestion started" message. After 10-15 minutes, re-query returns the full profile.

### Step 10: Record the Demo

Screen-record the Claude Desktop session showing:

1. Natural language query → tool call → ranked results
2. Profile deep-dive with evidence links
3. Click-through to actual GitHub commits to verify evidence
4. Side-by-side comparison

This recording is the deliverable.

---

## Troubleshooting Playbook

| Symptom | Likely Cause | Fix |
|---|---|---|
| Ingestion stuck at `waiting` | Queue not processing, or GitHub rate limit hit | Check Cloudflare dashboard → Queues. Check Worker logs for 403 errors. |
| Contributions exist but `classified = 0` | Classification cron not running, or Workers AI errors | Run `/admin/classify` manually. Check AI binding in wrangler.jsonc. |
| Re-fetch from GitHub failing during classification | Repo deleted or made private after ingestion | Classification falls back to message-only heuristics. Expected for some repos. |
| Scores are all 0 | Contributions not classified before scoring | Ensure classification runs before scoring. Check `classified = 1` count. |
| MCP tools not discoverable | Agent SDK wiring issue | Check `/mcp` endpoint returns SSE stream. Verify DO class export. |
| Vector search returns empty | Vectorize index empty or wrong dimensions | Check Vectorize index stats. Verify embedding model outputs 384 dims. |
| API key rejected | Key hash mismatch or key not in D1 | Create new key via `/admin/create-key`. |

---

## Definition of Done

- [ ] Worker deployed to Cloudflare and `/health` returns 200
- [ ] At least 5 real developers fully ingested (status: `complete`)
- [ ] All contributions classified (no `classified = 0` rows remaining)
- [ ] All developers scored (all 6 dimensions + overall impact populated)
- [ ] Vector index has entries for all scored developers
- [ ] MCP server is accessible and tools are discoverable
- [ ] `search_developers` returns relevant results for a domain query
- [ ] `get_developer_profile` returns full profile with evidence links
- [ ] `compare_developers` returns comparison with rankings
- [ ] Demo successfully run through Claude Desktop or equivalent MCP client
- [ ] Screen recording of demo captured

## Output Artifacts

- Deployed Worker URL
- API key for demo use
- Screen recording of E2E demo
- List of seeded developers and their scores
- Any bugs found during integration (filed as issues)
