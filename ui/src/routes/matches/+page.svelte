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
      goto('/#find');
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

<svelte:head>
  <title>Matches — whodoesthe.work</title>
</svelte:head>

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
        <a href="/#find" class="refine-link">Refine search ↗</a>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner" />
      <p class="loading-text"><em>Expanding your query across technical domains…</em></p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error-msg">{error}</p>
      <a href="/#find" class="btn-primary">Try again</a>
    </div>
  {:else if results.length === 0}
    <div class="empty-state">
      <p>No matches found. Try broadening your description or removing stack filters.</p>
      <a href="/#find" class="btn-primary">Refine search</a>
    </div>
  {:else}
    <p class="result-count">{results.length} developer{results.length !== 1 ? 's' : ''} matched</p>
    <div class="results">
      {#each results as match, i}
        <MatchCard {match} rank={i + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd8d0;
  }

  .query-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .role {
    font-size: 1rem;
    font-weight: 700;
    color: #0a0907;
  }

  .separator {
    color: #ddd8d0;
  }

  .stacks {
    font-size: 0.9rem;
    color: #8a8070;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .refine-link {
    font-size: 0.85rem;
    color: #8a8070;
    text-decoration: none;
    transition: color 0.15s;
  }

  .refine-link:hover {
    color: #0a0907;
  }

  .result-count {
    font-size: 0.75rem;
    color: #8a8070;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 5rem 0;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #ddd8d0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .loading-text {
    font-size: 1rem;
    color: #8a8070;
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state,
  .error-state {
    text-align: center;
    padding: 4rem 0;
    color: #8a8070;
  }

  .error-msg {
    color: #991b1b;
    background: #fee2e2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .btn-primary {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.625rem 1.5rem;
    background: #b8ff57;
    color: #1a3300;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s, transform 0.15s;
  }

  .btn-primary:hover {
    background: #a3f03d;
    transform: translateY(-1px);
  }
</style>
