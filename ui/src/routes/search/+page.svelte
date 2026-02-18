<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ProjectForm from '$lib/components/ProjectForm.svelte';
  import { pendingSearch } from '$lib/stores/SearchStore';
  import type { SearchRequest } from '$lib/api';

  // Pre-fill from ?q= param (set by Hero chip clicks)
  const initialDescription = $page.url.searchParams.get('q') ?? '';

  function handleSubmit(event: CustomEvent<SearchRequest>) {
    pendingSearch.set(event.detail);
    goto('/matches');
  }
</script>

<svelte:head>
  <title>Find Engineers — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <div class="header">
    <h1>Find engineers</h1>
    <p>Describe what you're building. We'll match you with developers who've shipped similar work.</p>
  </div>
  <ProjectForm {initialDescription} on:submit={handleSubmit} />
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
