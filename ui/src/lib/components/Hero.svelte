<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { selectionHandles } from '$lib/actions/selectionHandles';

  let ready = false;
  let reducedMotion = false;

  const SAMPLE_QUERIES = [
    'Distributed systems (Go/Rust), consensus + storage',
    'React/TypeScript, design systems + component architecture',
    'ML infrastructure (Python/CUDA), training pipelines',
    'Backend APIs, Postgres at scale, migrations + perf',
  ];

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ready = true;
  });

  $: durFast = reducedMotion ? 0 : 180;
  $: durSlow = reducedMotion ? 0 : 240;
</script>

<section class="hero mosaic-frame">
  <div class="grid" aria-hidden="true" />
  <div class="content">
    <div class="eyebrow mono" use:selectionHandles in:fade={{ duration: durFast, delay: 20 }}>
      whodoesthe.work / evidence index
    </div>

    <h1 in:fly={{ y: 12, duration: durSlow, delay: 60 }}>
      <span class="line">Who does the</span>
      <span class="line"><span class="accent" data-ready={ready}>work</span>?</span>
    </h1>

    <p class="tagline accent-serif" in:fade={{ duration: durFast, delay: 120 }}>
      Turns GitHub diffs + PRs + reviews into a ranked answer.
    </p>

    <div class="cta-row" in:fade={{ duration: durFast, delay: 150 }}>
      <a href="/#find" class="btn btn--accent">Show me who →</a>
      <a href="/mcp" class="btn btn--ghost">Or wire it into an agent</a>
    </div>

    <div class="chips" in:fade={{ duration: durFast, delay: 180 }}>
      <span class="chips-label meta">Try one:</span>
      {#each SAMPLE_QUERIES as q}
        <a class="chip" href={`/search?q=${encodeURIComponent(q)}`}>{q}</a>
      {/each}
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: var(--sp-9) var(--sp-5) var(--sp-8);
    text-align: left;
    overflow: hidden;
    border-bottom: 1px solid var(--color-border);
    background:
      radial-gradient(1000px 520px at 50% 5%, rgba(238,233,255,0.90) 0%, transparent 60%),
      radial-gradient(900px 520px at 15% 15%, rgba(231,242,255,0.95) 0%, transparent 62%),
      linear-gradient(135deg, rgba(238,233,255,0.65) 0%, rgba(231,242,255,0.55) 45%, rgba(246,241,234,0.35) 100%);
  }

  .grid {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(11,10,8,0.045) 0, rgba(11,10,8,0.045) 1px, transparent 1px, transparent 36px),
      repeating-linear-gradient(90deg, rgba(11,10,8,0.035) 0, rgba(11,10,8,0.035) 1px, transparent 1px, transparent 36px);
    pointer-events: none;
    mix-blend-mode: multiply;
    opacity: 0.65;
  }

  .content {
    position: relative;
    max-width: 60rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  .eyebrow {
    display: inline-block;
    padding: 0.35rem 0.9rem;
    font-size: var(--text-meta-sm);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-link);
    background: rgba(29, 78, 216, 0.07);
    border: var(--b-1) solid rgba(29, 78, 216, 0.35);
    border-radius: var(--r-1);
    width: fit-content;
  }

  h1 {
    font-size: var(--text-hero);
    font-weight: 700;
    color: var(--color-text);
    line-height: 0.92;
    letter-spacing: -0.035em;
    margin: 0;
  }

  .line {
    display: block;
  }

  .accent {
    display: inline;
    color: var(--color-text);
    padding: 0.06em 0.18em;
    border-radius: 10px;
    background: linear-gradient(var(--color-accent), var(--color-accent));
    background-repeat: no-repeat;
    background-size: 0% 100%;
    background-position: 0 100%;
    transition: background-size var(--dur-3) var(--ease-out);
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .accent[data-ready='true'] {
    background-size: 100% 100%;
  }

  .tagline {
    font-size: clamp(1.125rem, 2vw, 1.5rem);
    color: var(--color-muted);
    margin: 0;
    max-width: 52ch;
    line-height: 1.35;
  }

  .cta-row {
    display: flex;
    gap: var(--sp-3);
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .chips {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
    justify-content: flex-start;
    padding-top: var(--sp-2);
  }

  .chips-label {
    margin-right: var(--sp-1);
  }

  .chip {
    display: inline-block;
    background: rgba(255,255,255,0.75);
    border: var(--b-1) solid rgba(184, 176, 165, 0.75);
    color: var(--color-text-2);
    border-radius: 999px;
    padding: 0.35rem 0.85rem;
    font-size: 0.85rem;
    transition: background var(--dur-2) var(--ease-out), border-color var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out);
    text-decoration: none;
  }

  .chip:hover {
    background: rgba(238,233,255,0.85);
    border-color: rgba(58, 42, 120, 0.25);
    color: var(--color-on-category);
    transform: translateY(-1px);
  }

  @media (max-width: 540px) {
    .hero {
      padding: 5rem var(--sp-4) 4rem;
    }
    .cta-row { gap: var(--sp-2); }
  }
</style>
