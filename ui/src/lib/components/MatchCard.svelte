<script lang="ts">
  import type { MatchResult } from '$lib/api';
  import { goto } from '$app/navigation';

  export let match: MatchResult;
  export let rank: number;

  $: confidence = match.matchConfidence;
  $: confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'mid' : 'low';

  $: hasScore = match.overallImpact > 0;
  $: impactText = hasScore ? match.overallImpact.toFixed(0) : '-';
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

  $: reposLine = (match.topRepos ?? []).slice(0, 2).join('  /  ');

  function fmtScore(v: number) {
    return v > 0 ? String(Math.round(v)) : '-';
  }
</script>

<div class="card" role="link" tabindex="0" on:click={openProfile} on:keydown={onKeydown}>
  <div class="body">
    <div class="top-row">
      <div class="left">
        <div class="name-row">
          <span class="rank-badge mono">#{rank}</span>
          <span class="username">@{match.username}</span>
        </div>
        {#if reposLine}
          <div class="repos mono" aria-label={`Top repos: ${reposLine}`}>{reposLine}</div>
        {/if}
      </div>

      <div class="right" aria-label="Match summary">
        <span class="confidence-badge {confidenceClass}">{confidence}% fit</span>
        <span class="impact-pill" aria-label={`${impactLabel} score`}>
          <span class="impact-label mono">{impactLabel}</span>
          <span class="impact">{impactText}</span>
        </span>
      </div>
    </div>

    <div class="metrics" aria-label="Developer signals">
      <span class="metric" title="Code quality score (0-100)">
        <span class="k mono">Code</span>
        <span class="v">{fmtScore(match.codeQuality)}</span>
      </span>
      <span class="metric" title="Collaboration breadth score (0-100)">
        <span class="k mono">Collab</span>
        <span class="v">{fmtScore(match.collaborationBreadth)}</span>
      </span>
      <span class="metric" title="Consistency score (0-100)">
        <span class="k mono">Consistent</span>
        <span class="v">{fmtScore(match.consistencyScore)}</span>
      </span>
    </div>
  </div>
</div>

<style>
  .card {
    display: flex;
    background: rgba(255, 255, 255, 0.82);
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

  .body {
    flex: 1;
    padding: 0.6rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .top-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: 0.75rem;
    min-width: 0;
  }

  .left {
    min-width: 0;
  }

  .right {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .name-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-width: 0;
  }

  .rank-badge {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
    flex: 0 0 auto;
  }

  .username {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .repos {
    margin-top: 0.1rem;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .confidence-badge {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    border: 1.5px solid;
  }

  .confidence-badge.high {
    background: var(--color-accent);
    color: var(--color-on-accent);
    border-color: var(--color-accent);
  }
  .confidence-badge.mid {
    background: var(--color-warn-bg);
    color: var(--color-warn-ink);
    border-color: rgba(180, 83, 9, 0.25);
  }
  .confidence-badge.low {
    background: var(--color-danger-bg);
    color: var(--color-danger-ink);
    border-color: rgba(185, 28, 28, 0.22);
  }

  .impact-pill {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(184, 176, 165, 0.55);
    background: rgba(255, 255, 255, 0.65);
  }

  .impact-label {
    color: var(--color-muted);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .impact {
    font-size: 0.95rem;
    font-weight: 900;
    color: var(--color-text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    color: var(--color-muted);
  }

  .metric {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(184, 176, 165, 0.50);
    background: rgba(255, 255, 255, 0.55);
    font-size: 0.75rem;
  }

  .metric .k {
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .metric .v {
    font-weight: 900;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 520px) {
    .top-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .right {
      justify-content: flex-start;
    }
  }
</style>
