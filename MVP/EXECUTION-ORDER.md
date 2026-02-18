# MVP Execution Order & Dependency Map

## Dependency Graph

```
spec-00 (contracts)
  │
  ├──→ spec-01 (D1 schema)
  │      │
  │      ├──→ spec-02 (ingestion) ──→ spec-03 (analysis) ──→ spec-05 (scoring) ──→ spec-08 (E2E)
  │      │                                                         │
  │      │                                                         ├──→ spec-06 (vectors) ──→ spec-08
  │      │                                                         │
  │      └──→ spec-07 (MCP server) ────────────────────────────────┘──→ spec-08
  │
  └──→ spec-04 (AI classification) ──→ spec-05 (scoring)
```

## Parallel Execution Plan

### Phase 1: Foundation (Day 1 morning)
**Serial — one person, fast.**

| Spec | Effort | Output |
|------|--------|--------|
| **spec-00** | 2-3h | Project scaffold, types, wrangler.jsonc |
| **spec-01** | 1-2h | D1 schema, migration, query helpers |

**Gate:** `npx tsc --noEmit` passes. `npx wrangler dev` starts. D1 has tables.

---

### Phase 2: Parallel Build (Day 1 afternoon → Day 2)
**Three parallel tracks.** Each track can be a different person or time-sliced.

| Track | Specs | Effort | What It Builds |
|-------|-------|--------|----------------|
| **Track A: Data Pipeline** | spec-02 + spec-03 | 6-8h + 4-5h | GitHub discovery + ingestion with inline analysis → metrics in D1. No R2. |
| **Track B: AI Layer** | spec-04 | 4-5h | Workers AI classification + domain tagging |
| **Track C: MCP Shell** | spec-07 (shell + auth only) | 3h | MCP server skeleton, auth, tool stubs returning mock data |

**Track A and B are fully independent.** spec-03 is now pure functions called by spec-02 inline — they can be built in parallel and integrated when both are ready. Track C can build the MCP server shell with mock responses.

**Gate:** Track A can ingest a real developer (metrics in D1, no R2). Track B can classify a contribution. Track C returns mock MCP responses.

---

### Phase 3: Scoring + Search (Day 2 → Day 3)
**Needs Tracks A + B complete.**

| Spec | Effort | What It Builds |
|------|--------|----------------|
| **spec-05** (scoring) | 4-5h | Aggregate scores from metrics + classifications |
| **spec-06** (vectors) | 3-4h | Vectorize integration, semantic search |

These two can start in parallel — spec-05 writes domain scores that spec-06 reads, but spec-06 can build the infrastructure independently and connect at the end.

**Gate:** A developer has a complete score profile. Vector search returns results.

---

### Phase 4: Integration (Day 3)
**Serial — wire everything together.**

| Spec | Effort | What It Builds |
|------|--------|----------------|
| **spec-07** (complete tools) | 2-3h | Replace mock MCP responses with real data layer calls |
| **spec-08** (E2E) | 3-4h | Deploy, seed, demo |

**Gate:** "Find me a developer who..." returns real, ranked, evidence-backed results.

---

## Timeline Summary

| Day | Phase | Effort | Cumulative |
|-----|-------|--------|------------|
| Day 1 (morning) | Foundation | 3-5h | 3-5h |
| Day 1 (afternoon) → Day 2 | Parallel Build | 13-19h (parallel tracks) | ~10h wall clock |
| Day 2 → Day 3 | Scoring + Search | 7-9h | ~5h wall clock |
| Day 3 | Integration + Demo | 5-7h | 5-7h |
| **Total** | | **28-40h of work** | **~20-25h wall clock** |

Solo developer: ~3-4 focused days.
Two developers: ~2-3 days.
Three developers: ~2 days.

---

## Critical Path

```
spec-00 → spec-01 → spec-02 → spec-03 → spec-05 → spec-07 (real tools) → spec-08
```

This is the longest chain. Everything else hangs off it. If you're solo, do this chain first and add spec-04 (AI classification) and spec-06 (vectors) as they become unblocked.

**Shortcut for faster demo:** If AI classification (spec-04) is slow to get right, skip it temporarily and hardcode contribution types based on heuristics. The scoring engine (spec-05) works with heuristic types. Add LLM classification later.

---

## Spec Summary Table

| Spec | Name | Effort | Depends On | Blocks |
|------|------|--------|------------|--------|
| 00 | Contracts & Scaffold | 2-3h | — | Everything |
| 01 | D1 Schema | 1-2h | 00 | 02, 03, 05, 07 |
| 02 | Ingestion Pipeline | 6-8h | 00, 01 | 03, 05 |
| 03 | Analysis Workers | 5-6h | 00, 01, 02 | 05 |
| 04 | AI Classification | 4-5h | 00, 01 | 05, 06 |
| 05 | Scoring Engine | 4-5h | 00, 01, 03, 04 | 06, 07, 08 |
| 06 | Vectorize Search | 3-4h | 00, 01, 04, 05 | 07, 08 |
| 07 | MCP Server | 5-6h | 00, 01, 05, 06 | 08 |
| 08 | E2E Demo | 3-4h | All | — |
