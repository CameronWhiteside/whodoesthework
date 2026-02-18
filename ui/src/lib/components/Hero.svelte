<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import AccentTag from '$lib/components/AccentTag.svelte';
  import ProjectForm from '$lib/components/ProjectForm.svelte';
  import type { MatchResult, SearchRequest } from '$lib/api';

  let ready = false;
  let reducedMotion = false;

  export let initialDescription = '';
  export let results: MatchResult[] = [];
  export let loading = false;
  export let error = '';

  export let onSubmit: (req: SearchRequest) => void;

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ready = true;
  });

  $: durFast = reducedMotion ? 0 : 180;
  $: durSlow = reducedMotion ? 0 : 240;

  function handleSubmit(e: CustomEvent<SearchRequest>) {
    onSubmit(e.detail);
  }
</script>

<section class="hero" id="find">
  <div class="motif" aria-hidden="true">
    <div class="motif-grid" />
  </div>
  <div class="content">
    <div in:fade={{ duration: durFast, delay: 20 }}>
      <AccentTag text="Evidence-based developer search" />
    </div>

    <h1 in:fly={{ y: 12, duration: durSlow, delay: 60 }}>
      <span class="line">Describe the work you need.</span>
      <span class="line">Find the developer who’s</span>
      <span class="line"><span class="accent" data-ready={ready}>already done it</span>.</span>
    </h1>

    <div class="form" in:fade={{ duration: durFast, delay: 110 }}>
      <ProjectForm
        {initialDescription}
        {results}
        {loading}
        {error}
        on:submit={handleSubmit}
      />
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: var(--sp-8) var(--sp-5) var(--sp-6);
    text-align: left;
    overflow: hidden;
    border-bottom: 1px solid var(--color-border);
  }

  /* Hero motif (grid + gradient) stays during scroll */
  .motif {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -1;
    background:
      radial-gradient(1000px 520px at 50% 5%, rgba(238,233,255,0.90) 0%, transparent 60%),
      radial-gradient(900px 520px at 15% 15%, rgba(231,242,255,0.95) 0%, transparent 62%),
      linear-gradient(135deg, rgba(238,233,255,0.65) 0%, rgba(231,242,255,0.55) 45%, rgba(246,241,234,0.35) 100%);
    opacity: 0.95;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%);
  }

  .motif-grid {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(11,10,8,0.045) 0, rgba(11,10,8,0.045) 1px, transparent 1px, transparent 36px),
      repeating-linear-gradient(90deg, rgba(11,10,8,0.035) 0, rgba(11,10,8,0.035) 1px, transparent 1px, transparent 36px);
    mix-blend-mode: multiply;
    opacity: 0.75;
  }

  .content {
    position: relative;
    z-index: 1;
    max-width: 60rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  h1 {
    font-size: clamp(2.25rem, 5.4vw, 4.25rem);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.02;
    letter-spacing: -0.035em;
    margin: 0;
  }

  .line {
    display: block;
  }

  .accent {
    display: inline-block;
    color: var(--color-text);
    padding: 0.02em 0.18em 0.08em;
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

  .form { margin-top: var(--sp-2); }

  /* Try-one chips live in step 1 of ProjectForm */

  @media (max-width: 540px) {
    .hero {
      padding: 5rem var(--sp-4) 4rem;
    }
  }
</style>
