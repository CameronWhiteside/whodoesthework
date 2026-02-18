<script lang="ts">
  import type { MatchResult } from '$lib/api';
  import { goto } from '$app/navigation';

  export let match: MatchResult;
  export let rank: number;

  $: confidence = match.matchConfidence;
  $: confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'mid' : 'low';

  $: hasScore = match.overallImpact > 0;
  $: impactText = hasScore ? match.overallImpact.toFixed(0) : '—';
  $: impactLabel = hasScore ? 'Impact' : 'Indexing';

  function openProfile() {
    goto(`/developer/${match.username}`);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProfile();
    }
  }
</script>

<div class="card" role="link" tabindex="0" on:click={openProfile} on:keydown={onKeydown}>
  <div class="body">
    <!-- Top row -->
    <div class="top-row">
      <div class="name-block">
        <span class="rank-badge mono">#{rank}</span>
        <span class="username">@{match.username}</span>
      </div>
      <div class="badges">
        <span class="confidence-badge {confidenceClass}">
          {confidence}% fit
        </span>
        <div class="impact-block">
          <span class="impact">{impactText}</span>
          <span class="impact-label">{impactLabel}</span>
        </div>
      </div>
    </div>

    <!-- Domain tags -->
    {#if match.topDomains.length > 0}
      <div class="domains">
        {#each match.topDomains.slice(0, 3) as d}
          <button
            type="button"
            class="domain-chip"
            on:click|stopPropagation={() => goto(`/?q=${encodeURIComponent(d.domain)}#find`)}
          >{d.domain}</button>
        {/each}
      </div>
    {/if}

    <!-- Why matched block -->
    {#if match.whyMatched}
      <div class="why-matched">
        <span class="why-label mono">MATCH NOTES</span>
        <p class="why-text">{match.whyMatched}</p>
      </div>
    {/if}

    <div class="dims mono" aria-label="Score dimensions">
      <span class="dim"><span class="k">CODE</span> <span class="v">{match.codeQuality.toFixed(0)}</span></span>
      <span class="dim"><span class="k">REVIEW</span> <span class="v">{match.reviewQuality.toFixed(0)}</span></span>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="langs">
        {#each match.topLanguages.slice(0, 3) as l}
          <button
            type="button"
            class="lang-chip"
            on:click|stopPropagation={() => goto(`/?q=${encodeURIComponent(l.language)}#find`)}
          >{l.language}</button>
        {/each}
      </div>
      <div class="actions"><span class="view-link">Open profile →</span></div>
    </div>
  </div>
</div>

<style>
  .card {
    display: flex;
    background: rgba(255,255,255,0.82);
    border: var(--b-1) solid var(--color-border);
    border-radius: var(--r-2);
    overflow: visible;
    transition: border-color var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out);
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-1px);
  }
  .card:focus-within {
    border-color: var(--color-brand);
  }
  .card:focus-visible {
    outline: 2px solid var(--color-brand);
    outline-offset: 3px;
  }

  .body { flex: 1; padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }

  .name-block { display: flex; align-items: baseline; gap: 0.5rem; min-width: 0; }
  .rank-badge {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .username { font-size: 0.95rem; font-weight: 800; color: var(--color-text); }
  .badges { display: flex; align-items: center; gap: 0.625rem; }
  .confidence-badge {
    font-size: 0.75rem; font-weight: 700;
    padding: 0.25rem 0.625rem; border-radius: 999px; border: 1.5px solid;
  }
  .confidence-badge.high { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); }
  .confidence-badge.mid  { background: var(--color-warn-bg); color: var(--color-warn-ink); border-color: rgba(180,83,9,0.25); }
  .confidence-badge.low  { background: var(--color-danger-bg); color: var(--color-danger-ink); border-color: rgba(185,28,28,0.22); }
  .impact-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1;
    gap: 0.15rem;
  }
  .impact {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--color-text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .impact-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .domains { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .domain-chip {
    display: inline-block;
    padding: 0.22rem 0.7rem;
    background: var(--color-category);
    border: var(--b-1) solid var(--color-category-border);
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--color-on-category);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  .why-matched {
    padding: 0.625rem 0.875rem;
    border-left: 3px solid var(--color-accent);
    background: rgba(184,255,87,0.16);
    border-radius: 0 6px 6px 0;
  }
  .why-label {
    font-size: 0.65rem; font-weight: 700; color: var(--color-on-accent);
    letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 0.25rem;
  }
  .why-text { font-size: 0.95rem; color: var(--color-text-2); line-height: 1.55; margin: 0; }

  .why-text {
    font-size: 0.85rem;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .dims {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    color: var(--color-muted);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .dim {
    display: inline-flex;
    gap: 0.35rem;
    align-items: baseline;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(184,176,165,0.55);
    background: rgba(255,255,255,0.6);
  }

  .dim .k { color: var(--color-muted); }
  .dim .v { color: var(--color-text); font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 0; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; }
  .langs { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .lang-chip {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    background: rgba(255,255,255,0.65);
    border: var(--b-1) solid rgba(184,176,165,0.60);
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--color-muted);
    text-decoration: none;
    cursor: pointer;
  }
  .actions { display: flex; gap: 0.625rem; align-items: center; }
  .view-link { font-size: 0.8rem; color: var(--color-link); text-decoration: none; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
</style>
