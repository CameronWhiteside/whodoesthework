<script lang="ts">
  import { page } from '$app/stores';
  import { getDeveloper, type DeveloperProfile } from '$lib/api';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import { shortlistStore } from '$lib/stores/ShortlistStore';
  import ScoreBar from '$lib/components/ScoreBar.svelte';
  import { onMount } from 'svelte';

  let profile: DeveloperProfile | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      profile = await getDeveloper($page.params.username);
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  $: isShortlisted = profile
    ? $shortlistStore.some(m => m.username === profile!.username)
    : false;

  function toggleShortlist() {
    if (!profile) return;
    if (isShortlisted) {
      shortlistStore.remove(profile.username);
    } else {
      // Build a minimal MatchResult from profile data to add to shortlist
      shortlistStore.add({
        developerId: profile.id,
        username: profile.username,
        githubUrl: `https://github.com/${profile.username}`,
        overallImpact: profile.overallImpact ?? 0,
        codeQuality: profile.codeQuality ?? 0,
        reviewQuality: profile.reviewQuality ?? 0,
        topDomains: profile.domains.slice(0, 3).map(d => ({ domain: d.domain, score: d.score })),
        topLanguages: [],
        matchConfidence: 0,
        whyMatched: '',
      });
    }
  }
</script>

<svelte:head>
  <title>{$page.params.username} — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <div class="back-nav">
    {#if $pendingSearch}
      <a href="/matches" class="back-link">← Back to matches</a>
    {:else}
      <a href="/" class="back-link">← Home</a>
    {/if}
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner" />
      <p class="loading-text"><em>Loading profile…</em></p>
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
            <span class="impact-label">OVERALL IMPACT</span>
          </div>
          <button
            class="shortlist-btn"
            class:active={isShortlisted}
            on:click={toggleShortlist}
          >
            {isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
          </button>
        </div>
      </div>

      <!-- Score breakdown -->
      <section class="section">
        <h2 class="section-title">Score Breakdown</h2>
        <div class="scores">
          <ScoreBar label="Code Quality" value={profile.codeQuality} />
          <ScoreBar label="Review Quality" value={profile.reviewQuality} />
          <ScoreBar label="Documentation" value={profile.documentationQuality} />
          <ScoreBar label="Collaboration Breadth" value={profile.collaborationBreadth} />
          <ScoreBar label="Consistency" value={profile.consistencyScore} />
          <ScoreBar label="Recent Activity" value={profile.recentActivityScore} />
        </div>
      </section>

      <!-- Domain expertise -->
      {#if profile.domains.length > 0}
        <section class="section">
          <h2 class="section-title">Domain Expertise</h2>
          <div class="domain-chips">
            {#each profile.domains.slice(0, 8) as d}
              <div class="domain-card">
                <span class="domain-name">{d.domain}</span>
                <span class="domain-score">{d.score.toFixed(0)}</span>
                <span class="domain-count">{d.contributionCount} contributions</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Top languages from evidence repos -->
      {#if profile.domains.length > 0 && profile.domains.some(d => d.evidenceRepos)}
        <section class="section">
          <h2 class="section-title">Evidence Repositories</h2>
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
    color: #8a8070;
    text-decoration: none;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: #2563eb;
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
    color: #0a0907;
    margin: 0 0 0.375rem;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .gh-link {
    font-size: 0.875rem;
    color: #2563eb;
    text-decoration: none;
    transition: color 0.15s;
  }

  .gh-link:hover {
    color: #1d4ed8;
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
    color: #b8ff57;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    /* Green on light bg — use text stroke trick for readability */
    -webkit-text-stroke: 0.5px #1a3300;
    text-shadow: 0 1px 2px rgba(26,51,0,0.15);
  }

  .impact-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: #8a8070;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .shortlist-btn {
    padding: 0.4rem 1rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    border: 1.5px solid #ddd8d0;
    color: #8a8070;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .shortlist-btn:hover {
    border-color: #5b21b6;
    color: #5b21b6;
  }

  .shortlist-btn.active {
    border-color: #5b21b6;
    color: #5b21b6;
    background: #ede9fe;
  }

  .section {
    margin: 2rem 0;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: #8a8070;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 1rem;
  }

  .scores {
    background: #ffffff;
    border: 1.5px solid #ddd8d0;
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
  }

  .domain-chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .domain-card {
    background: #ede9fe;
    border: 1px solid #c4b5fd;
    border-radius: 8px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .domain-name {
    font-size: 0.875rem;
    color: #5b21b6;
    font-weight: 600;
  }

  .domain-score {
    font-size: 1.25rem;
    font-weight: 800;
    color: #4c1d95;
    font-variant-numeric: tabular-nums;
  }

  .domain-count {
    font-size: 0.7rem;
    color: #7c3aed;
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
    background: #ffffff;
    border: 1.5px solid #ddd8d0;
    border-radius: 6px;
    font-size: 0.8rem;
    color: #2563eb;
    text-decoration: none;
    font-family: 'SFMono-Regular', Consolas, monospace;
    transition: border-color 0.15s, background 0.15s;
  }

  .evidence-link:hover {
    border-color: #2563eb;
    background: rgba(37,99,235,0.04);
  }
</style>
