<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SearchRequest } from '$lib/api';

  const dispatch = createEventDispatcher<{ submit: SearchRequest }>();

  import { onMount } from 'svelte';
  import { getDomains, type DomainEntry } from '$lib/api';

  export let initialDescription = '';

  // Languages are fixed — these are well-known and don't change.
  const LANGUAGES = [
    'Rust', 'Go', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby',
    'Scala', 'Kotlin', 'Swift', 'Elixir', 'Haskell', 'Zig',
    'React', 'Next.js', 'SvelteKit', 'Vue', 'Node.js', 'PostgreSQL',
  ];

  // Domain chips are loaded from GET /api/domains — only shows domains with
  // actual indexed developers. Falls back to empty array silently.
  let domainChips: DomainEntry[] = [];
  let selectedDomains: string[] = [];

  // Combined stack selection: languages + domains in same chip grid
  $: STACKS = [
    ...LANGUAGES,
    ...domainChips.slice(0, 12).map(d => d.domain),
  ];

  onMount(async () => {
    domainChips = await getDomains();
  });
  const ROLES = [
    'Backend engineer', 'Frontend engineer', 'Full-stack engineer',
    'Infrastructure / DevOps', 'ML / Data engineer', 'Security engineer',
  ];

  let step = 1;
  let description = initialDescription;
  let selectedStacks: string[] = [];
  let selectedRole = '';

  $: descOk = description.trim().length >= 20;
  $: descCount = description.trim().length;
  $: descHint = descOk ? 'Looking good' : `${Math.max(0, 20 - descCount)} more characters`;

  function toggleStack(s: string) {
    selectedStacks = selectedStacks.includes(s)
      ? selectedStacks.filter(x => x !== s)
      : [...selectedStacks, s];
  }

  function submit() {
    dispatch('submit', {
      description: description.trim(),
      stacks: selectedStacks,
      role: selectedRole,
      limit: 10,
    });
  }
</script>

<div class="form">
  <!-- Progress dots -->
  <div class="steps">
    {#each [1, 2, 3] as s}
      <div class="dot" class:active={step === s} class:done={step > s} />
      {#if s < 3}<div class="line" class:done={step > s} />{/if}
    {/each}
  </div>

  {#if step === 1}
    <div class="step">
      <h2>Describe your project</h2>
      <p class="hint-top">What are you building? What engineering problems need solving?</p>
      <textarea
        bind:value={description}
        placeholder="e.g. Building a real-time payment settlement system. Need someone who understands distributed transactions, consistency guarantees, and can ship production Rust or Go..."
        rows={5}
      />
      <div class="desc-hint" class:ok={descOk}>{descHint}</div>
      <button class="btn-primary" disabled={!descOk} on:click={() => (step = 2)}>
        Next →
      </button>
    </div>

  {:else if step === 2}
    <div class="step">
      <h2>Pick your stack</h2>
      <p class="hint-top">Select all that apply. Leave empty if you're stack-agnostic.</p>
      <div class="chip-grid">
        {#each STACKS as s}
          <button
            class="stack-chip"
            class:selected={selectedStacks.includes(s)}
            on:click={() => toggleStack(s)}
          >{s}</button>
        {/each}
      </div>
      <div class="btn-row">
        <button class="btn-ghost" on:click={() => (step = 1)}>← Back</button>
        <button class="btn-primary" on:click={() => (step = 3)}>Next →</button>
      </div>
    </div>

  {:else}
    <div class="step">
      <h2>What role are you hiring for?</h2>
      <div class="role-grid">
        {#each ROLES as r}
          <button
            class="role-card"
            class:selected={selectedRole === r}
            on:click={() => (selectedRole = r)}
          >{r}</button>
        {/each}
      </div>
      <div class="btn-row">
        <button class="btn-ghost" on:click={() => (step = 2)}>← Back</button>
        <button class="btn-primary" disabled={!selectedRole} on:click={submit}>
          Find matches →
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .form { max-width: 580px; margin: 0 auto; }
  .steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 2.5rem; }
  .dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: transparent; border: 2px solid #ddd8d0;
    transition: background 0.2s, border-color 0.2s;
  }
  .dot.active { background: #2563eb; border-color: #2563eb; }
  .dot.done { background: #b8ff57; border-color: #b8ff57; }
  .line { flex: 1; height: 2px; background: #ddd8d0; max-width: 48px; }
  .line.done { background: #b8ff57; }
  .step { display: flex; flex-direction: column; gap: 1rem; }
  h2 { font-size: 1.5rem; font-weight: 800; color: #0a0907; margin: 0; letter-spacing: -0.02em; }
  .hint-top { color: #8a8070; font-size: 0.9rem; margin: 0; }
  textarea {
    width: 100%; padding: 0.875rem 1rem; background: #ffffff;
    border: 1.5px solid #ddd8d0; border-radius: 8px; color: #0a0907;
    font-size: 1rem; line-height: 1.65; resize: vertical; min-height: 120px;
    box-sizing: border-box;
  }
  textarea:focus { outline: none; border-color: #2563eb; }
  .desc-hint { font-size: 0.8rem; color: #8a8070; }
  .desc-hint.ok { color: #1a3300; }
  .chip-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .stack-chip {
    padding: 0.35rem 0.875rem; border-radius: 999px;
    background: #f5f2ed; border: 1px solid #ddd8d0;
    color: #3d3830; font-size: 0.875rem; cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .stack-chip.selected { border-color: #5b21b6; color: #5b21b6; background: #ede9fe; }
  .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .role-card {
    padding: 0.875rem 1rem; background: #ffffff; border: 1.5px solid #ddd8d0;
    border-radius: 8px; color: #3d3830; font-size: 0.9rem; cursor: pointer;
    text-align: left; transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .role-card.selected { border-color: #2563eb; color: #0a0907; background: rgba(37,99,235,0.04); border-width: 2px; }
  .btn-row { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .btn-primary {
    padding: 0.75rem 1.5rem; background: #b8ff57; color: #1a3300;
    border: none; border-radius: 8px; font-size: 1rem; font-weight: 700;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover:not(:disabled) { background: #a3f03d; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.45; cursor: default; }
  .btn-ghost {
    padding: 0.75rem 1.25rem; background: transparent; color: #3d3830;
    border: 1.5px solid #ddd8d0; border-radius: 8px; font-size: 1rem; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: #b0a89e; color: #0a0907; }
</style>
