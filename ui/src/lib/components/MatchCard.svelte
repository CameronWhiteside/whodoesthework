<script lang="ts">
  import type { MatchResult } from '$lib/api';
  import { selectionHandles } from '$lib/actions/selectionHandles';

  export let match: MatchResult;
  export let rank: number;

  $: confidence = match.matchConfidence;
  $: confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'mid' : 'low';
</script>

<div class="card" use:selectionHandles>
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
        <span class="confidence-badge {confidenceClass}">
          {confidence}% fit
        </span>
        <div class="impact-block">
          <span class="impact">{match.overallImpact.toFixed(0)}</span>
          <span class="impact-label">Work</span>
        </div>
      </div>
    </div>

    <!-- Domain tags -->
    {#if match.topDomains.length > 0}
      <div class="domains">
        {#each match.topDomains.slice(0, 3) as d}
          <a class="domain-chip" href={`/?q=${encodeURIComponent(d.domain)}#find`}>{d.domain}</a>
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

    <!-- Score mini-bars -->
    <div class="score-row">
      <div class="score-item">
        <span class="score-label">Code quality</span>
        <div class="mini-bar-track">
          <div
            class="mini-bar-fill"
            style="width: {match.codeQuality}%"
          />
        </div>
      </div>
      <div class="score-item">
        <span class="score-label">Review quality</span>
        <div class="mini-bar-track">
          <div
            class="mini-bar-fill"
            style="width: {match.reviewQuality}%"
          />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="langs">
        {#each match.topLanguages.slice(0, 3) as l}
          <a class="lang-chip" href={`/?q=${encodeURIComponent(l.language)}#find`}>{l.language}</a>
        {/each}
      </div>
      <div class="actions">
        <a href="/developer/{match.username}" class="view-link">Open profile →</a>
      </div>
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
  }
  .card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-1px);
  }
  .card:focus-within {
    border-color: var(--color-brand);
  }
  .rank {
    display: flex; align-items: center; justify-content: center;
    min-width: 54px;
    background: rgba(255,255,255,0.55);
    border-right: 1px solid var(--color-divider);
    flex-shrink: 0;
  }
  .rank-num {
    writing-mode: vertical-lr; transform: rotate(180deg);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .body { flex: 1; padding: 1.125rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .username { font-size: 1.05rem; font-weight: 700; color: var(--color-text); }
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
    font-size: 1.5rem;
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
    font-size: 0.8rem;
    color: var(--color-on-category);
    font-weight: 600;
    text-decoration: none;
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
  .score-row { display: flex; gap: 1.5rem; }
  .score-item { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
  .score-label { font-size: 0.75rem; color: var(--color-muted); }
  .mini-bar-track { background: rgba(11,10,8,0.08); border-radius: 3px; height: 5px; overflow: hidden; }
  .mini-bar-fill { height: 100%; border-radius: 3px; background: var(--color-accent); transition: width 0.4s ease; }
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
  }
  .actions { display: flex; gap: 0.625rem; align-items: center; }
  .view-link { font-size: 0.9rem; color: var(--color-link); text-decoration: none; font-weight: 700; }
  .view-link:hover { color: var(--color-link-hover); }
</style>
