<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import MatchCard from '$lib/components/MatchCard.svelte';
  import type { MatchResult, SearchRequest } from '$lib/api';
  import { selectionHandles } from '$lib/actions/selectionHandles';

  const dispatch = createEventDispatcher<{ submit: SearchRequest }>();

  import { getDomains, type DomainEntry } from '$lib/api';

  export let initialDescription = '';
  export let results: MatchResult[] = [];
  export let loading = false;
  export let error = '';

  // Languages are fixed — these are well-known and don't change.
  const LANGUAGES = [
    'Rust', 'Go', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby',
    'Scala', 'Kotlin', 'Swift', 'Elixir', 'Haskell',
    'React', 'Next.js', 'SvelteKit', 'Vue', 'Node.js', 'PostgreSQL',
  ];

  // Domain chips are loaded from GET /api/domains — only shows domains with
  // actual indexed developers. Falls back to empty array silently.
  let domainChips: DomainEntry[] = [];
  let selectedDomains: string[] = [];

  // Combined stack selection: languages + domains in same chip grid
  $: STACKS = [
    ...LANGUAGES,
    ...domainChips.slice(0, 16).map(d => d.domain),
  ];

  onMount(async () => {
    domainChips = await getDomains();
  });
  const ROLES = [
    'Backend engineer', 'Frontend engineer', 'Full-stack engineer',
    'Infrastructure / DevOps', 'ML / Data engineer', 'Security engineer',
  ];

  let step = 1;
  let direction: 'next' | 'back' = 'next';
  let description = initialDescription;
  let selectedStacks: string[] = [];
  let selectedRole = '';

  let reducedMotion = false;
  let descTouched = false;

  const SAMPLE_QUERIES = [
    'Distributed systems (Go/Rust), consensus + storage',
    'React/TypeScript, design systems + component architecture',
    'ML infrastructure (Python/CUDA), training pipelines',
    'Backend APIs, Postgres at scale, migrations + perf',
  ];

  function prefill(query: string) {
    description = query;
    descTouched = false;
  }

  // `initialDescription` is a one-time prefill (e.g. from URL).

  $: descOk = description.trim().length >= 20;
  $: descCount = description.trim().length;
  $: descHint = descOk ? 'Looking good' : `${Math.max(0, 20 - descCount)} more characters`;

  $: dur = reducedMotion ? 0 : 240;
  $: xIn = direction === 'next' ? 12 : -12;
  $: xOut = direction === 'next' ? -12 : 12;

  function toggleStack(s: string) {
    selectedStacks = selectedStacks.includes(s)
      ? selectedStacks.filter(x => x !== s)
      : [...selectedStacks, s];
  }

  function next() {
    direction = 'next';
    if (step === 1) {
      descTouched = true;
      if (!descOk) return;
    }
    step = Math.min(3, step + 1);
  }

  function back() {
    direction = 'back';
    step = Math.max(1, step - 1);
  }

  function submit() {
    dispatch('submit', {
      description: description.trim(),
      stacks: selectedStacks,
      role: selectedRole,
      limit: 10,
    });

    direction = 'next';
    step = 4;
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
</script>

<form
  class="form"
  style={`--actions-h:${step === 1 ? '0px' : '56px'}`}
  on:submit|preventDefault={() => step === 3 && submit()}
>
  <div class="stage" aria-label="Search builder">
    {#key step}
      {#if step === 1}
        <div class="step step--1" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
          <label class="field-label" for="wdtw-desc">Project</label>

          <div class="try" aria-label="Example queries">
            {#each SAMPLE_QUERIES as q}
              <button type="button" class="chip" on:click={() => prefill(q)}>{q}</button>
            {/each}
          </div>

          <textarea
            id="wdtw-desc"
            bind:value={description}
            aria-describedby="wdtw-desc-count"
            aria-invalid={descTouched && !descOk}
            placeholder="Example: Real-time payment settlement. Need Rust/Go, distributed transactions, idempotency, replay safety, and operational maturity."
            rows={5}
          />

          <div class="step1-actions" aria-label="Step 1 actions">
            <div class="desc-hint" class:ok={descOk} id="wdtw-desc-count">
              {descOk ? 'Good signal.' : `Add ${Math.max(0, 20 - descCount)} more characters for better query expansion.`}
            </div>
            <button class="btn btn--accent" type="button" on:click={next} disabled={!descOk}>Next</button>
          </div>
        </div>

      {:else if step === 2}
        <div class="step" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
          <fieldset class="fieldset">
            <legend class="legend">Stack + domains</legend>
            <p class="hint-top">Nudge the search. Leave blank if you want the best answer regardless of stack.</p>
            <div class="chip-grid" aria-label="Stack constraints">
              {#each STACKS as s}
                <label class="stack-chip" class:selected={selectedStacks.includes(s)}>
                <input
                  type="checkbox"
                  checked={selectedStacks.includes(s)}
                  on:change={() => toggleStack(s)}
                />
                <span>{s}</span>
              </label>
            {/each}
          </div>
        </fieldset>

        </div>

      {:else if step === 3}
        <div class="step" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
          <fieldset class="fieldset">
            <legend class="legend">Role</legend>
          <div class="role-grid" role="radiogroup" aria-label="Target role">
            {#each ROLES as r}
              <label
                class="role-card"
                class:selected={selectedRole === r}
                use:selectionHandles
                data-handles={selectedRole === r ? 'on' : undefined}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={selectedRole === r}
                  on:change={() => (selectedRole = r)}
                />
                <span>{r}</span>
              </label>
            {/each}
          </div>
        </fieldset>

        </div>

      {:else}
        <div class="step" id="results" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
          {#if loading}
            <p class="status" role="status" aria-live="polite"><span class="accent-serif"><em>Searching…</em></span></p>
          {:else if error}
            <p class="error-title">Search failed</p>
            <pre class="error-text mono">{error}</pre>
          {:else if results.length > 0}
            <p class="count"><span class="mono">{results.length}</span> match{results.length !== 1 ? 'es' : ''}</p>
            <div class="cardlist" role="region" aria-label="Search results">
              {#each results as match, i}
                <MatchCard {match} rank={i + 1} />
              {/each}
            </div>
          {:else}
            <p class="status">No results.</p>
          {/if}
        </div>
      {/if}
    {/key}

    {#if step !== 1}
      <div class="actions" aria-label="Form actions">
        {#if step === 2}
          <button class="btn btn--ghost" type="button" on:click={back}>← Back</button>
          <button class="btn btn--accent" type="button" on:click={next}>Next</button>
        {:else if step === 3}
          <button class="btn btn--ghost" type="button" on:click={back}>← Back</button>
          <button class="btn btn--accent" type="submit" disabled={!selectedRole}>Search</button>
        {:else}
          <button class="btn btn--ghost" type="button" on:click={() => { direction = 'back'; step = 3; }}>← Back</button>
        {/if}
      </div>
    {/if}
  </div>
</form>

<style>
  .form {
    --actions-h: 56px;
    max-width: 58rem;
    margin: 0;
  }

  .stage {
    position: relative;
    padding-bottom: calc(var(--actions-h) + var(--sp-4));
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .actions {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--actions-h);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--sp-3);
    padding-top: var(--sp-3);
  }

  .step--1 {
    gap: 0.75rem;
  }

  .step1-actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-3);
    flex-wrap: wrap;
  }

  .step1-actions .desc-hint {
    flex: 1;
    min-width: 18rem;
  }

  .step { display: flex; flex-direction: column; gap: 1rem; }
  .hint-top { color: var(--color-muted); font-size: 1rem; margin: 0; max-width: 60ch; }

  .field-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  textarea {
    width: 100%; padding: 1rem 1rem; background: var(--color-surface);
    border: var(--b-1) solid var(--color-border-strong); border-radius: var(--r-1); color: var(--color-text);
    font-size: 1rem; line-height: 1.65; resize: vertical; min-height: 120px;
    box-sizing: border-box;
  }
  textarea:focus { border-color: var(--color-brand); }
  textarea[aria-invalid='true'] { border-color: var(--color-danger-ink); }

  .desc-hint { font-size: 0.85rem; color: var(--color-muted); }
  .desc-hint.ok { color: var(--color-on-accent); }

  .fieldset { border: none; padding: 0; margin: 0; }
  .legend {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.5rem;
  }

  .hint-top {
    margin-top: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .chip-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .stack-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.875rem; border-radius: 999px;
    background: rgba(255,255,255,0.72);
    border: var(--b-1) solid var(--color-border);
    color: var(--color-text-2);
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out), background var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out);
  }
  .stack-chip.selected {
    border-color: rgba(58, 42, 120, 0.35);
    color: var(--color-on-category);
    background: rgba(238,233,255,0.85);
  }
  .stack-chip:hover { transform: translateY(-1px); border-color: var(--color-border-strong); }

  .stack-chip input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    margin: 0;
  }

  .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .role-card {
    position: relative;
    padding: 1rem 1rem;
    background: rgba(255,255,255,0.78);
    border: var(--b-1) solid var(--color-border);
    border-radius: var(--r-1);
    color: var(--color-text-2);
    font-size: 0.95rem;
    cursor: pointer;
    text-align: left;
    transition: border-color var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out), background var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .role-card.selected {
    border-color: rgba(29, 78, 216, 0.55);
    color: var(--color-text);
    background: rgba(231,242,255,0.75);
    border-width: var(--b-2);
  }
  .role-card:hover { transform: translateY(-1px); border-color: var(--color-border-strong); }

  .role-card:focus-within { border-color: var(--color-brand); }

  .role-card input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    margin: 0;
  }

  :global(.btn:disabled) { opacity: 0.55; cursor: not-allowed; transform: none; }

  .status { margin: 0; color: var(--color-muted); }

  .count {
    margin: var(--sp-2) 0 0;
    font-size: 0.8rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
  }

  .cardlist {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    margin-top: var(--sp-3);
    overflow: auto;
    padding-right: 0.25rem;
    max-height: min(520px, 58vh);
  }

  .error-title {
    margin: 0 0 var(--sp-2);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .error-text {
    margin: 0;
    border: var(--b-1) solid rgba(184,176,165,0.70);
    border-radius: var(--r-1);
    background: rgba(255,255,255,0.75);
    padding: var(--sp-3) var(--sp-4);
    font-size: 0.85rem;
    color: var(--color-muted);
    white-space: pre-wrap;
  }

  .try {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
  }

  .chip {
    display: inline-block;
    background: rgba(255,255,255,0.75);
    border: var(--b-1) solid rgba(184, 176, 165, 0.75);
    color: var(--color-text-2);
    border-radius: 999px;
    padding: 0.32rem 0.8rem;
    font-size: 0.85rem;
    transition: background var(--dur-2) var(--ease-out), border-color var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out);
    font-family: inherit;
    cursor: pointer;
  }

  .chip:hover {
    background: rgba(238,233,255,0.85);
    border-color: rgba(58, 42, 120, 0.25);
    color: var(--color-on-category);
    transform: translateY(-1px);
  }

  @media (max-width: 540px) {
    .form { --actions-h: 56px; }
    .cardlist { max-height: min(460px, 50vh); }
  }
</style>
