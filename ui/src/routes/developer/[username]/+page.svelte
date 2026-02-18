<script lang="ts">
  import { page } from '$app/stores';
  import { getDeveloper, type DeveloperProfile } from '$lib/api';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import ScoreBar from '$lib/components/ScoreBar.svelte';
  import { onMount } from 'svelte';

  let profile: DeveloperProfile | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const username = $page.params.username;
      if (!username) {
        error = 'Missing username';
        return;
      }
      profile = await getDeveloper(username);
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });


</script>

<svelte:head>
  <title>{$page.params.username} — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <div class="back-nav">
    {#if $pendingSearch}
      <a href="/#results" class="back-link">← Back to results</a>
    {:else}
      <a href="/" class="back-link">← Home</a>
    {/if}
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner" />
      <p class="loading-text"><span class="accent-serif"><em>Loading scored profile…</em></span></p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error-msg">{error}</p>
      <a href="/" class="btn-primary">Go home</a>
    </div>
  {:else if profile}
    <div class="profile">
      <!-- Hero row -->
      <div class="hero-row">
        <div class="identity">
          <h1>@{profile.username}</h1>
          <a
            href="https://github.com/{profile.username}"
            target="_blank"
            rel="noopener noreferrer"
            class="gh-link"
          >
            View on GitHub →
          </a>
        </div>
        <div class="hero-right">
          <div class="impact-block">
            <span class="impact-num">{profile.overallImpact?.toFixed(1) ?? '—'}</span>
            <span class="impact-label">OVERALL SCORE</span>
          </div>
        </div>
      </div>

      {#if $pendingSearch}
        <div class="matched-because">
          <div class="matched-eyebrow mono">MATCHED TO YOUR SEARCH</div>
          <p class="matched-text">
            <span class="role">{$pendingSearch.role || 'Engineer'}</span>
            {#if $pendingSearch.stacks?.length}
              <span class="sep">·</span>
              <span class="stacks">{$pendingSearch.stacks.slice(0, 6).join(', ')}</span>
            {/if}
          </p>
        </div>
      {/if}

      <!-- Score breakdown -->
      <section class="section">
        <h2 class="section-title">Score breakdown</h2>
        <div class="scores">
          <ScoreBar label="Code Quality" value={profile.codeQuality} />
          <ScoreBar label="Review signal" value={profile.reviewQuality} />
          <ScoreBar label="Docs signal" value={profile.documentationQuality} />
          <ScoreBar label="Collaboration" value={profile.collaborationBreadth} />
          <ScoreBar label="Consistency" value={profile.consistencyScore} />
          <ScoreBar label="Recent activity" value={profile.recentActivityScore} />
        </div>
      </section>

      <!-- Domain expertise -->
      {#if profile.domains.length > 0}
        <section class="section">
          <h2 class="section-title">Top domains (with evidence)</h2>
          <div class="domain-chips">
            {#each profile.domains.slice(0, 8) as d}
              <div class="domain-card">
                <span class="domain-name">{d.domain}</span>
                <span class="domain-score">{d.score.toFixed(0)}</span>
                <span class="domain-count">{d.contributionCount} scored contributions</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Top languages from evidence repos -->
      {#if profile.domains.length > 0 && profile.domains.some(d => d.evidenceRepos)}
        <section class="section">
          <h2 class="section-title">Evidence repos</h2>
          <div class="evidence-list">
            {#each profile.domains.slice(0, 5) as d}
              {#if d.evidenceRepos}
                {#each d.evidenceRepos.split(',').slice(0, 2) as repo}
                  {#if repo.trim()}
                    <a
                      href="https://github.com/{repo.trim()}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="evidence-link"
                    >
                      {repo.trim()}
                    </a>
                  {/if}
                {/each}
              {/if}
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .back-nav {
    margin-bottom: 1.5rem;
  }

  .back-link {
    font-size: 0.85rem;
    color: var(--color-link);
    text-decoration: none;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: var(--color-link-hover);
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
    color: var(--color-muted);
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    text-align: center;
    padding: 4rem 0;
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
    padding: 0.625rem 1.5rem;
    background: var(--color-accent);
    color: var(--color-on-accent);
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

  .hero-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .identity h1 {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.375rem;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .gh-link {
    font-size: 0.875rem;
    color: var(--color-link);
    text-decoration: none;
    transition: color 0.15s;
  }

  .gh-link:hover {
    color: var(--color-link-hover);
  }

  .hero-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .impact-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
  }

  .impact-num {
    font-size: 3rem;
    font-weight: 900;
    color: var(--color-text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    /* Green on light bg — use text stroke trick for readability */
    background: linear-gradient(var(--color-accent), var(--color-accent));
    padding: 0.05em 0.12em;
    border-radius: 12px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }

  .impact-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .section {
    margin: 2rem 0;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 1rem;
  }

  .matched-because {
    background: #ffffff;
    border: 1.5px solid #ddd8d0;
    border-left: 3px solid #b8ff57;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.75rem;
  }

  .matched-eyebrow {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #1a3300;
    margin-bottom: 0.35rem;
  }

  .matched-text {
    margin: 0;
    color: #3d3830;
    line-height: 1.55;
  }

  .matched-text .role {
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .matched-text .sep {
    color: #ddd8d0;
    margin: 0 0.5rem;
  }

  .matched-text .stacks {
    color: #8a8070;
  }

  .scores {
    background: rgba(255,255,255,0.78);
    border: var(--b-1) solid rgba(184,176,165,0.65);
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
  }

  .domain-chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .domain-card {
    background: var(--color-category);
    border: var(--b-1) solid var(--color-category-border);
    border-radius: 8px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .domain-name {
    font-size: 0.875rem;
    color: var(--color-on-category);
    font-weight: 600;
  }

  .domain-score {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .domain-count {
    font-size: 0.7rem;
    color: var(--color-muted);
    opacity: 0.75;
  }

  .evidence-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .evidence-link {
    display: inline-block;
    padding: 0.3rem 0.875rem;
    background: rgba(255,255,255,0.78);
    border: var(--b-1) solid rgba(184,176,165,0.65);
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--color-link);
    text-decoration: none;
    font-family: 'SFMono-Regular', Consolas, monospace;
    transition: border-color 0.15s, background 0.15s;
  }

  .evidence-link:hover {
    border-color: var(--color-link);
    background: rgba(231,242,255,0.75);
  }
</style>
