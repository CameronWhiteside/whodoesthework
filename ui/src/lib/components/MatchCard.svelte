<script lang="ts">
  import type { MatchResult } from '$lib/api';

  export let match: MatchResult;
  export let rank: number;

  $: confidence = match.matchConfidence;
  $: confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'mid' : 'low';
</script>

<div class="card">
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
          <span class="lang-chip">{l.language}</span>
        {/each}
      </div>
      <div class="actions">
        <a href="/developer/{match.username}" class="view-link">View profile →</a>
      </div>
    </div>
  </div>
</div>

<style>
  .card {
    display: flex;
    background: #ffffff;
    border: 1.5px solid #ddd8d0;
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .card:hover {
    border-color: #2563eb;
    box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  }
  .rank {
    display: flex; align-items: center; justify-content: center;
    min-width: 48px; background: #0a0907; border-right: 1px solid #1a1a1a;
    flex-shrink: 0;
  }
  .rank-num {
    writing-mode: vertical-lr; transform: rotate(180deg);
    font-size: 0.8rem; font-weight: 900; color: #f5f2ed; letter-spacing: 0.06em;
  }
  .body { flex: 1; padding: 1.125rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .username { font-size: 1.05rem; font-weight: 700; color: #0a0907; }
  .badges { display: flex; align-items: center; gap: 0.625rem; }
  .confidence-badge {
    font-size: 0.75rem; font-weight: 700;
    padding: 0.25rem 0.625rem; border-radius: 999px; border: 1.5px solid;
  }
  .confidence-badge.high { background: #b8ff57; color: #1a3300; border-color: #b8ff57; }
  .confidence-badge.mid  { background: #fef3c7; color: #92400e; border-color: #fbbf24; }
  .confidence-badge.low  { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
  .impact { font-size: 1.5rem; font-weight: 900; color: #2563eb; line-height: 1; }
  .domains { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .domain-chip {
    padding: 0.2rem 0.65rem; background: #ede9fe;
    border: 1px solid #c4b5fd; border-radius: 999px;
    font-size: 0.75rem; color: #5b21b6; font-weight: 500;
  }
  .why-matched {
    padding: 0.625rem 0.875rem;
    border-left: 3px solid #b8ff57;
    background: #f9ffe8;
    border-radius: 0 6px 6px 0;
  }
  .why-label {
    font-size: 0.65rem; font-weight: 700; color: #1a3300;
    letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 0.25rem;
  }
  .why-text { font-size: 0.875rem; color: #3d3830; line-height: 1.5; margin: 0; }
  .score-row { display: flex; gap: 1.5rem; }
  .score-item { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
  .score-label { font-size: 0.7rem; color: #8a8070; }
  .mini-bar-track { background: #e8e4df; border-radius: 3px; height: 5px; overflow: hidden; }
  .mini-bar-fill { height: 100%; border-radius: 3px; background: #b8ff57; transition: width 0.4s ease; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; }
  .langs { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .lang-chip {
    padding: 0.15rem 0.5rem; background: #f5f2ed;
    border: 1px solid #ddd8d0; border-radius: 999px;
    font-size: 0.7rem; color: #8a8070;
  }
  .actions { display: flex; gap: 0.625rem; align-items: center; }
  .view-link { font-size: 0.8rem; color: #8a8070; text-decoration: none; }
  .view-link:hover { color: #2563eb; }
</style>
