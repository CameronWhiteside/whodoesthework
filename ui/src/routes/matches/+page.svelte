<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/#find');
  });
</script>

<svelte:head>
  <title>Matches — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <p class="mono">Redirecting…</p>
</div>
