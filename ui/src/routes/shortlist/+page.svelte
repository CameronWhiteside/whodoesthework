<script lang="ts">
  import { shortlistStore } from '$lib/stores/ShortlistStore';
  import MatchCard from '$lib/components/MatchCard.svelte';

  // Store is pre-loaded from localStorage on init — no async needed.
  $: matches = $shortlistStore;
</script>

<svelte:head>
  <title>Shortlist — whodoesthe.work</title>
</svelte:head>

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
      <p class="empty-text"><em>Your shortlist is empty</em></p>
      <p class="empty-sub">Find engineers and add them to your shortlist from the matches page.</p>
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
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd8d0;
  }

  h1 {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 900;
    color: #0a0907;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .count {
    font-size: 0.875rem;
    color: #8a8070;
  }

  .clear-btn {
    font-size: 0.8rem;
    color: #991b1b;
    background: transparent;
    border: 1px solid rgba(153,27,27,0.25);
    border-radius: 6px;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .clear-btn:hover {
    background: rgba(153,27,27,0.06);
    border-color: rgba(153,27,27,0.5);
  }

  .empty-state {
    text-align: center;
    padding: 5rem 0;
  }

  .empty-text {
    font-size: 1.2rem;
    color: #8a8070;
    margin: 0 0 0.5rem;
    font-family: 'Playfair Display', Georgia, serif;
  }

  .empty-sub {
    font-size: 0.9rem;
    color: #b0a89e;
    margin: 0 0 1.5rem;
    max-width: 360px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .btn-primary {
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

  .btn-primary:hover {
    background: #a3f03d;
    transform: translateY(-1px);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .footer {
    margin-top: 2rem;
    text-align: center;
  }

  .find-more {
    font-size: 0.9rem;
    color: #2563eb;
    text-decoration: none;
    transition: color 0.15s;
  }

  .find-more:hover {
    color: #1d4ed8;
  }
</style>
