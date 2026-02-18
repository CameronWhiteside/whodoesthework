<script lang="ts">
  import { onMount } from 'svelte';
  import Hero from '$lib/components/Hero.svelte';
  import McpDocs from '$lib/components/McpDocs.svelte';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import { getStats, getDomains, searchMatches, type PlatformStats, type DomainEntry, type MatchResult } from '$lib/api';
  import type { SearchRequest } from '$lib/api';

  let stats: PlatformStats | null = null;
  let domains: DomainEntry[] = [];

  let initialDescription = '';
  let results: MatchResult[] = [];
  let loading = false;
  let error = '';
  let reducedMotion = false;

  async function handleSubmit(req: SearchRequest) {
    pendingSearch.set(req);

    loading = true;
    error = '';
    results = [];

    try {
      results = await searchMatches(req);
      const el = document.getElementById('results');
      el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    initialDescription = new URLSearchParams(window.location.search).get('q') ?? '';

    [stats, domains] = await Promise.all([getStats(), getDomains()]);
  });
</script>

<svelte:head>
  <title>whodoesthe.work — Who does the work?</title>
</svelte:head>

<Hero
  {initialDescription}
  {results}
  {loading}
  {error}
  onSubmit={handleSubmit}
/>

<section class="pipeline">
  <div class="inner">
    <h2 class="section-title">How it works</h2>

    {#if stats}
      <div class="stats">
        <span class="n mono">{stats.developers.toLocaleString()}</span>
        <span class="l">developers</span>
        <span class="sep">·</span>
        <span class="n mono">{stats.contributions.toLocaleString()}</span>
        <span class="l">contributions</span>
        {#if domains.length > 0}
          <span class="sep">·</span>
          <span class="n mono">{domains.length}</span>
          <span class="l">domains</span>
        {/if}
      </div>
    {/if}

    <div class="steps">
      <div class="step">
        <div class="num mono">01</div>
        <h3>Ingest (DO + Queue)</h3>
        <p>Per-developer Durable Objects fetch commits, PRs, reviews, and repo metadata from the GitHub API, then fan out work via Queues.</p>
      </div>
      <div class="step">
        <div class="num mono">02</div>
        <h3>Analyze diffs</h3>
        <p>We parse patches and compute churn, change spread, entropy, and complexity deltas, plus file-type splits (src/test/docs/infra).</p>
      </div>
      <div class="step">
        <div class="num mono">03</div>
        <h3>Tag domains</h3>
        <p>GitHub repo topics are the highest-confidence domain signal; Workers AI fills gaps with normalized, evidence-backed domain tags.</p>
      </div>
      <div class="step">
        <div class="num mono">04</div>
        <h3>Score + index</h3>
        <p>We score contributions (effort × quality), aggregate into developer dimensions in D1, and embed profiles into Vectorize for intent search + rerank.</p>
      </div>
    </div>
  </div>
</section>

<McpDocs />

<footer class="footer">
  <div class="inner">
    <span class="mono">
      Made by <a class="author" href="https://github.com/CameronWhiteside" target="_blank" rel="noopener">CameronWhiteside</a> on Cloudflare
    </span>
  </div>
</footer>

<style>
  .inner {
    max-width: 60rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-6);
  }

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .pipeline {
    padding: var(--sp-9) var(--sp-5);
    background: rgba(255,255,255,0.65);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

  .pipeline .section-title {
    margin: 0;
    font-size: clamp(2.25rem, 5.4vw, 4.25rem);
    line-height: 0.92;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.035em;
  }

  .stats {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    flex-wrap: wrap;
    margin-top: var(--sp-4);
    margin-bottom: var(--sp-5);
  }

  .n {
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .l { color: var(--color-muted); }
  .sep { color: var(--color-divider); }

  .steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sp-6);
  }

  .step p {
    margin: var(--sp-2) 0 0;
    color: var(--color-muted);
  }

  .num {
    font-size: 2.25rem;
    font-weight: 700;
    color: rgba(11,10,8,0.16);
    line-height: 1;
    margin-bottom: var(--sp-2);
  }

  @media (max-width: 900px) {
    .steps { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 540px) {
    .pipeline { padding: var(--sp-8) var(--sp-4); }
    .steps { grid-template-columns: 1fr; }
  }

  .footer {
    padding: var(--sp-7) var(--sp-5);
    color: var(--color-muted);
  }

  .footer .inner {
    max-width: 60rem;
    margin: 0 auto;
    border-top: 1px solid var(--color-border);
    padding-top: var(--sp-4);
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .author {
    color: var(--color-link);
    text-decoration: none;
  }

  .author:hover,
  .author:focus-visible {
    color: var(--color-link-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  @media (max-width: 540px) {
    .footer { padding: var(--sp-6) var(--sp-4); }
  }
</style>
