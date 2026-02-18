<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  onMount(() => {
    const q = $page.url.searchParams.get('q');
    goto(q ? `/?q=${encodeURIComponent(q)}#find` : '/#find');
  });
</script>

<svelte:head>
  <title>Find Engineers — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <p class="mono">Redirecting…</p>
</div>

<style>
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: 3.5rem 1.5rem;
  }

  .header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  h1 {
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    font-weight: 900;
    color: #0a0907;
    margin: 0 0 0.5rem;
    letter-spacing: -0.03em;
    line-height: 0.95;
  }

  p {
    color: #8a8070;
    font-size: 1rem;
    margin: 0;
    line-height: 1.6;
  }
</style>
