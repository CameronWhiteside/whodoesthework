<script lang="ts">
  import { onMount } from 'svelte';
  import Hero from '$lib/components/Hero.svelte';
  import ProjectForm from '$lib/components/ProjectForm.svelte';
  import MatchCard from '$lib/components/MatchCard.svelte';
  import McpDocs from '$lib/components/McpDocs.svelte';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import { getStats, getDomains, searchMatches, type PlatformStats, type DomainEntry, type MatchResult } from '$lib/api';
  import type { SearchRequest } from '$lib/api';

  let stats: PlatformStats | null = null;
  let domains: DomainEntry[] = [];
  let statsLoading = true;

  let initialDescription = '';
  let results: MatchResult[] = [];
  let loading = false;
  let error = '';
  let showBadge = false;
  let reducedMotion = false;

  async function handleSubmit(event: CustomEvent<SearchRequest>) {
    const req = event.detail;
    pendingSearch.set(req);

    loading = true;
    error = '';
    results = [];

    try {
      results = await searchMatches(req);
      showBadge = results.length > 0;
      if (showBadge) {
        window.setTimeout(() => {
          showBadge = false;
        }, 2200);
      }

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
    statsLoading = false;
  });
</script>

<svelte:head>
  <title>whodoesthe.work — Who does the work?</title>
</svelte:head>

<Hero />

<section class="find" id="find">
  <div class="inner">
    <div class="head">
      <div class="meta-sm mono">whodoesthe.work / query</div>
      <h2>Ask the question.</h2>
      <p class="sub">Describe what you’re building. We’ll answer with ranked people who do this kind of work.</p>
    </div>

    <ProjectForm {initialDescription} on:submit={handleSubmit} />

    <div id="results" class="results">
      <div class="results-head">
        <div class="meta-sm mono">whodoesthe.work / answer</div>
        {#if showBadge}
          <div class="badge">
            <span class="mono">Vector search</span>
            <span class="dot">·</span>
            <span>reranked by evidence scores</span>
          </div>
        {/if}
      </div>

      {#if loading}
        <div class="loading">
          <div class="spinner" aria-hidden="true" />
          <p role="status" aria-live="polite" class="loading-text"><span class="accent-serif"><em>Finding who does the work…</em></span></p>
          <div class="skeletons" aria-hidden="true">
            {#each Array.from({ length: 6 }) as _, i}
              <div class="skeleton-card" style="animation-delay: {i * 40}ms" />
            {/each}
          </div>
        </div>
      {:else if error}
        <div class="error">
          <p class="error-title">Search failed</p>
          <p class="error-sub">Try again, or make the query less constrained.</p>
          <details class="error-details">
            <summary class="mono">Details</summary>
            <pre class="mono">{error}</pre>
          </details>
        </div>
      {:else if results.length > 0}
        <p class="count"><span class="mono">{results.length}</span> match{results.length !== 1 ? 'es' : ''}</p>
        <div class="cardlist">
          {#each results as match, i}
            <MatchCard {match} rank={i + 1} />
          {/each}
        </div>
      {:else}
        <p class="empty">Run a search to get an answer.</p>
      {/if}
    </div>
  </div>
</section>

<section class="pipeline">
  <div class="inner">
    <div class="meta-sm mono">whodoesthe.work / method</div>
    <h2>How we decide who does the work</h2>

    <div class="steps">
      <div class="step">
        <div class="num mono">01</div>
        <h3>Artifacts in</h3>
        <p>We ingest public commits, PRs, and review activity across repos they actually contributed to.</p>
      </div>
      <div class="step">
        <div class="num mono">02</div>
        <h3>Effort vs quality</h3>
        <p>We infer effort from diffs (churn + change spread + complexity delta) and score quality separately.</p>
      </div>
      <div class="step">
        <div class="num mono">03</div>
        <h3>Domain evidence</h3>
        <p>We extract domain tags from real work. Repo topics win; AI fills gaps.</p>
      </div>
      <div class="step">
        <div class="num mono">04</div>
        <h3>Vector search + rerank</h3>
        <p>We embed developer profiles, retrieve by intent, then rerank using evidence-backed scores.</p>
      </div>
    </div>
  </div>
</section>

<section class="index">
  <div class="inner">
    <div class="meta-sm mono">whodoesthe.work / index</div>

    {#if statsLoading}
      <div class="stats-skeleton">
        <div class="skeleton-bar" style="width: 320px; height: 2rem;" />
      </div>
    {:else if stats}
      <div class="stats">
        <span class="n">{stats.developers.toLocaleString()}</span>
        <span class="l">developers</span>
        <span class="sep">·</span>
        <span class="n">{stats.contributions.toLocaleString()}</span>
        <span class="l">contributions</span>
        {#if domains.length > 0}
          <span class="sep">·</span>
          <span class="n">{domains.length}</span>
          <span class="l">domains</span>
        {/if}
      </div>
    {:else}
      <div class="stats">
        <span class="l">Index stats unavailable.</span>
      </div>
    {/if}

    {#if domains.length > 0}
      <div class="domain-strip">
        {#each domains.slice(0, 24) as d}
          <a class="domain" href={`/?q=${encodeURIComponent(d.domain)}#find`}>{d.domain}</a>
        {/each}
      </div>
    {/if}
  </div>
</section>

<McpDocs />

<style>
  .find {
    padding: var(--sp-8) var(--sp-5) var(--sp-9);
  }

  .inner {
    max-width: 60rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-6);
  }

  h2 {
    margin: 0;
    font-size: var(--text-h1);
    line-height: 1.02;
    font-weight: 700;
    color: var(--color-text);
  }

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .sub {
    margin: var(--sp-2) 0 0;
    max-width: 65ch;
    color: var(--color-muted);
  }

  .results {
    border-radius: var(--r-2);
    border: var(--b-1) solid rgba(184,176,165,0.65);
    background: rgba(255,255,255,0.58);
    padding: var(--sp-6);
  }

  .results-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--sp-4);
    flex-wrap: wrap;
    margin-bottom: var(--sp-4);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    border: var(--b-1) solid rgba(184,176,165,0.75);
    background: rgba(255,255,255,0.72);
    color: var(--color-text-2);
    font-size: 0.85rem;
  }

  .dot { color: var(--color-divider); }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-7) 0;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-brand);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text { margin: 0; color: var(--color-muted); }

  .skeletons {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-3);
    margin-top: var(--sp-2);
  }

  .skeleton-card {
    height: 138px;
    border-radius: var(--r-2);
    border: var(--b-1) solid rgba(184,176,165,0.65);
    background: linear-gradient(90deg, rgba(255,255,255,0.62) 25%, rgba(250,247,243,0.85) 50%, rgba(255,255,255,0.62) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .count {
    margin: 0 0 var(--sp-4);
    font-size: 0.8rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
  }

  .cardlist {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .empty { margin: 0; color: var(--color-muted); }

  .error-title {
    margin: 0 0 var(--sp-2);
    font-size: var(--text-h2);
    font-weight: 700;
    color: var(--color-text);
  }

  .error-sub { margin: 0 0 var(--sp-4); color: var(--color-muted); }

  .error-details {
    margin: 0;
    border: var(--b-1) solid rgba(184,176,165,0.70);
    border-radius: var(--r-1);
    background: rgba(255,255,255,0.75);
    padding: var(--sp-3) var(--sp-4);
  }

  .error-details summary { cursor: pointer; font-weight: 700; color: var(--color-text-2); }
  .error-details pre { margin: var(--sp-3) 0 0; font-size: 0.85rem; color: var(--color-muted); white-space: pre-wrap; }

  .pipeline {
    padding: var(--sp-9) var(--sp-5);
    background: rgba(255,255,255,0.65);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

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

  .index {
    padding: var(--sp-9) var(--sp-5);
  }

  .stats {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    flex-wrap: wrap;
    margin-top: var(--sp-3);
  }

  .n {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .l { color: var(--color-muted); }
  .sep { color: var(--color-divider); }

  .domain-strip {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    margin-top: var(--sp-5);
  }

  .domain {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: var(--color-category);
    border: var(--b-1) solid var(--color-category-border);
    color: var(--color-on-category);
    text-decoration: none;
    font-weight: 600;
  }

  .domain:hover { transform: translateY(-1px); }

  .stats-skeleton { margin-top: var(--sp-5); }
  .skeleton-bar {
    background: linear-gradient(90deg, rgba(255,255,255,0.62) 25%, rgba(250,247,243,0.85) 50%, rgba(255,255,255,0.62) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--r-1);
    display: block;
    border: var(--b-1) solid rgba(184,176,165,0.45);
  }

  @media (max-width: 900px) {
    .steps { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 540px) {
    .find { padding: var(--sp-7) var(--sp-4) var(--sp-8); }
    .results { padding: var(--sp-5); }
    .pipeline { padding: var(--sp-8) var(--sp-4); }
    .index { padding: var(--sp-8) var(--sp-4); }
    .steps { grid-template-columns: 1fr; }
  }
</style>
