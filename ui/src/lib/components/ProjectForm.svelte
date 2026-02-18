<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import type { SearchRequest } from '$lib/api';
  import { selectionHandles } from '$lib/actions/selectionHandles';

  const dispatch = createEventDispatcher<{ submit: SearchRequest }>();

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
  let direction: 'next' | 'back' = 'next';
  let description = initialDescription;
  let selectedStacks: string[] = [];
  let selectedRole = '';

  let reducedMotion = false;
  let descTouched = false;

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
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
</script>

<form class="form" on:submit|preventDefault={() => step === 3 && submit()}>
  <!-- Progress dots -->
  <div class="steps">
    {#each [1, 2, 3] as s}
      <div class="dot" class:active={step === s} class:done={step > s} />
      {#if s < 3}<div class="line" class:done={step > s} />{/if}
    {/each}
  </div>

  {#key step}
    {#if step === 1}
      <div class="step" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
        <h2>What are you building?</h2>
        <p class="hint-top">Enough detail to answer the only question that matters: who does the work?</p>

        <label class="field-label" for="wdtw-desc">Project</label>
        <textarea
          id="wdtw-desc"
          bind:value={description}
          aria-describedby="wdtw-desc-help wdtw-desc-count"
          aria-invalid={descTouched && !descOk}
          placeholder="Example: Real-time payment settlement. Need Rust/Go, distributed transactions, idempotency, replay safety, and operational maturity."
          rows={5}
        />
        <p class="help" id="wdtw-desc-help">Include constraints: throughput, latency, data model, correctness, and ops surface area.</p>
        <div class="desc-hint" class:ok={descOk} id="wdtw-desc-count">
          {descOk ? 'Good signal.' : `Add ${Math.max(0, 20 - descCount)} more characters for better query expansion.`}
        </div>

        <button class="btn btn--accent" type="button" on:click={next}>
          Next: constraints →
        </button>
      </div>

    {:else if step === 2}
      <div class="step" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
        <h2>Constraints (optional)</h2>
        <p class="hint-top">Nudge the search. Leave blank if you want the best “who does the work?” answer regardless of stack.</p>

        <fieldset class="fieldset">
          <legend class="legend">Stack + domains</legend>
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

        <div class="btn-row">
          <button class="btn btn--ghost" type="button" on:click={back}>← Back</button>
          <button class="btn btn--accent" type="button" on:click={next}>Next: role →</button>
        </div>
      </div>

    {:else}
      <div class="step" in:fly={{ x: xIn, y: 6, duration: dur }} out:fly={{ x: xOut, y: -6, duration: dur }}>
        <h2>Target role</h2>

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

        <div class="btn-row">
          <button class="btn btn--ghost" type="button" on:click={back}>← Back</button>
          <button class="btn btn--accent" type="submit" disabled={!selectedRole}>
            Show me who →
          </button>
        </div>
      </div>
    {/if}
  {/key}
</form>

<style>
  .form { max-width: 580px; margin: 0 auto; }
  .steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 2.5rem; }
  .dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: transparent; border: 2px solid var(--color-border);
    transition: background 0.2s, border-color 0.2s;
  }
  .dot.active { background: var(--color-brand); border-color: var(--color-brand); }
  .dot.done { background: var(--color-accent); border-color: var(--color-accent); }
  .line { flex: 1; height: 2px; background: var(--color-border); max-width: 48px; }
  .line.done { background: var(--color-accent); }
  .step { display: flex; flex-direction: column; gap: 1rem; }
  h2 { font-size: var(--text-h2); font-weight: 700; color: var(--color-text); margin: 0; }
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

  .help { margin: 0; font-size: 0.95rem; color: var(--color-muted); line-height: 1.6; }

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

  .btn-row { display: flex; gap: var(--sp-3); justify-content: flex-end; }
  :global(.btn:disabled) { opacity: 0.55; cursor: not-allowed; transform: none; }
</style>
