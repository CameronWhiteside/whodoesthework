<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/#mcp');
  });
</script>

<svelte:head>
  <title>MCP — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <p class="mono">Redirecting…</p>
</div>

<style>
  .page { max-width: 60rem; margin: 0 auto; padding: var(--sp-7) var(--sp-5); }
</style>
