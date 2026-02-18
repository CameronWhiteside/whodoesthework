<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Hero from '$lib/components/Hero.svelte';
  import ProjectForm from '$lib/components/ProjectForm.svelte';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import { getStats, getDomains, type PlatformStats, type DomainEntry } from '$lib/api';
  import type { SearchRequest } from '$lib/api';

  let stats: PlatformStats | null = null;
  let domains: DomainEntry[] = [];
  let statsLoading = true;

  function handleSubmit(event: CustomEvent<SearchRequest>) {
    pendingSearch.set(event.detail);
    goto('/matches');
  }

  onMount(async () => {
    [stats, domains] = await Promise.all([getStats(), getDomains()]);
    statsLoading = false;
  });
</script>

<svelte:head>
  <title>whodoesthe.work — Developer Intelligence Platform</title>
</svelte:head>

<Hero />

<!-- Section A: Find Engineers -->
<section class="find-section" id="find">
  <ProjectForm on:submit={handleSubmit} />
</section>

<!-- Section B: How it works -->
<section class="pipeline-section">
  <div class="pipeline-inner">
    <div class="section-eyebrow">HOW IT WORKS</div>
    <h2 class="section-title">Built on real commit evidence</h2>
    <div class="steps-grid">
      <div class="step">
        <div class="step-num">01</div>
        <h3>GitHub commits</h3>
        <p>We pull public contribution history — commits, PRs, and code reviews from every public repo the developer has touched.</p>
      </div>
      <div class="step">
        <div class="step-num">02</div>
        <h3>Code analysis</h3>
        <p>Each commit is measured for actual complexity: churn × entropy × cyclomatic complexity delta × test coverage ratio. No resume required.</p>
      </div>
      <div class="step">
        <div class="step-num">03</div>
        <h3>AI classification</h3>
        <p>Workers AI classifies every contribution by type (feature / bugfix / refactor / test / docs) and extracts domain tags using GitHub topics as ground truth, AI as fallback.</p>
      </div>
      <div class="step">
        <div class="step-num">04</div>
        <h3>Semantic search</h3>
        <p>Developer profiles are embedded into Cloudflare Vectorize (384-dim). Search by natural language — results ranked by cosine similarity + SQL score filters.</p>
      </div>
    </div>
  </div>
</section>

<!-- Section C: Live index -->
<section class="live-section">
  <div class="live-inner">
    <div class="section-eyebrow">LIVE INDEX</div>
    {#if statsLoading}
      <div class="stats-skeleton">
        <div class="skeleton-bar" style="width: 320px; height: 2rem;" />
      </div>
    {:else if stats}
      <div class="live-stats">
        <span class="live-num">{stats.developers.toLocaleString()}</span>
        <span class="live-label">developers</span>
        <span class="live-dot">·</span>
        <span class="live-num">{stats.contributions.toLocaleString()}</span>
        <span class="live-label">contributions</span>
        {#if domains.length > 0}
          <span class="live-dot">·</span>
          <span class="live-num">{domains.length}</span>
          <span class="live-label">domains</span>
        {/if}
      </div>
    {:else}
      <div class="live-stats">
        <span class="live-label">Index data unavailable</span>
      </div>
    {/if}

    {#if domains.length > 0}
      <div class="domains-scroll">
        {#each domains.slice(0, 20) as d}
          <button
            class="domain-chip"
            on:click={() => goto('/search?q=' + encodeURIComponent(d.domain))}
          >
            {d.domain}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</section>

<!-- Section D: MCP teaser -->
<section class="mcp-section">
  <div class="mcp-inner">
    <div class="section-eyebrow mcp-eyebrow">BUILT FOR AI AGENTS</div>
    <h2 class="mcp-title">Use whodoesthe.work as an MCP server.</h2>
    <p class="mcp-sub">Works with Claude Desktop, Cursor, or any MCP-compatible client.</p>
    <pre class="mcp-code">{`{
  "mcpServers": {
    "whodoesthework": {
      "url": "https://whodoesthe.work/mcp",
      "headers": { "Authorization": "Bearer YOUR_KEY" }
    }
  }
}`}</pre>
    <a href="/mcp" class="mcp-btn">View MCP docs →</a>
  </div>
</section>

<style>
  /* ── Section A: Find ── */
  .find-section {
    max-width: 640px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }

  /* ── Section B: Pipeline ── */
  .pipeline-section {
    background: #ffffff;
    border-top: 1px solid #ddd8d0;
    border-bottom: 1px solid #ddd8d0;
    padding: 5rem 1.5rem;
  }

  .pipeline-inner {
    max-width: 860px;
    margin: 0 auto;
  }

  .section-eyebrow {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #8a8070;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }

  .section-title {
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    font-weight: 800;
    color: #0a0907;
    letter-spacing: -0.02em;
    margin: 0 0 3rem;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }

  @media (max-width: 900px) {
    .steps-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 540px) {
    .steps-grid {
      grid-template-columns: 1fr;
    }
  }

  .step {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .step-num {
    font-size: 3rem;
    font-weight: 900;
    color: #ddd8d0;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .step h3 {
    font-size: 1rem;
    font-weight: 700;
    color: #0a0907;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .step p {
    font-size: 0.875rem;
    color: #8a8070;
    margin: 0;
    line-height: 1.65;
  }

  /* ── Section C: Live index ── */
  .live-section {
    padding: 5rem 1.5rem;
  }

  .live-inner {
    max-width: 860px;
    margin: 0 auto;
  }

  .stats-skeleton {
    margin-bottom: 2rem;
  }

  .skeleton-bar {
    background: linear-gradient(90deg, #ede9e4 25%, #e0dbd3 50%, #ede9e4 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
    display: block;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .live-stats {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }

  .live-num {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 900;
    color: #0a0907;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .live-label {
    font-size: 0.875rem;
    color: #8a8070;
    font-weight: 500;
  }

  .live-dot {
    color: #ddd8d0;
    font-size: 1rem;
    font-weight: 400;
  }

  .domains-scroll {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .domain-chip {
    background: #ede9fe;
    color: #5b21b6;
    border: 1px solid #c4b5fd;
    border-radius: 999px;
    padding: 0.3rem 0.875rem;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    font-family: inherit;
  }

  .domain-chip:hover {
    background: #ddd6fe;
    border-color: #a78bfa;
  }

  /* ── Section D: MCP teaser ── */
  .mcp-section {
    background: #0a0907;
    padding: 6rem 1.5rem;
  }

  .mcp-inner {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .mcp-eyebrow {
    color: #b8ff57;
  }

  .mcp-title {
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    font-weight: 800;
    color: #f5f2ed;
    letter-spacing: -0.02em;
    margin: 0;
    line-height: 1.1;
  }

  .mcp-sub {
    font-size: 1rem;
    color: #8a8070;
    margin: 0;
    line-height: 1.6;
  }

  .mcp-code {
    background: #1a1714;
    border: 1px solid #2d2925;
    border-radius: 8px;
    padding: 1.5rem;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.8rem;
    color: #b8ff57;
    line-height: 1.7;
    overflow-x: auto;
    width: 100%;
    margin: 0;
    white-space: pre;
  }

  .mcp-btn {
    display: inline-block;
    padding: 0.75rem 1.75rem;
    background: #b8ff57;
    color: #1a3300;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s, transform 0.15s;
  }

  .mcp-btn:hover {
    background: #a3f03d;
    transform: translateY(-1px);
  }
</style>
