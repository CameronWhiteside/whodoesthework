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
  <title>Search — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <p class="mono">Redirecting…</p>
</div>

<style>
  .page {
    max-width: 60rem;
    margin: 0 auto;
    padding: var(--sp-7) var(--sp-5);
  }
</style>
