<script lang="ts">
  import { goto } from '$app/navigation';

  const SAMPLE_QUERIES = [
    'Distributed systems, Go or Rust',
    'Frontend React + TypeScript, design systems',
    'ML infrastructure, Python + CUDA',
    'Backend APIs, high-scale Postgres',
  ];

  function prefill(query: string) {
    goto(`/search?q=${encodeURIComponent(query)}`);
  }
</script>

<section class="hero pixel-grid">
  <div class="blob" aria-hidden="true" />
  <div class="content">
    <div class="eyebrow">DEVELOPER INTELLIGENCE</div>
    <h1>
      Find engineers who've built<br />
      <span class="accent">exactly what you need</span>
    </h1>
    <p class="tagline">Built from real commit evidence, not resumes.</p>
    <div class="cta-row">
      <a href="/#find" class="btn-primary">Find engineers →</a>
      <a href="/mcp" class="btn-ghost">MCP API for agents</a>
    </div>
    <div class="chips">
      <span class="chips-label">Try:</span>
      {#each SAMPLE_QUERIES as q}
        <button class="chip" on:click={() => prefill(q)}>{q}</button>
      {/each}
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: 6rem 1rem 5rem;
    text-align: center;
    overflow: hidden;
    background-color: #f5f2ed;
    /* pixel grid applied via class above */
  }
  .blob {
    position: absolute;
    top: 0; left: 50%; transform: translateX(-50%);
    width: 100%; height: 100%;
    background: radial-gradient(ellipse 700px 400px at 50% 0%, rgba(196,181,253,0.35) 0%, transparent 70%);
    pointer-events: none;
  }
  .content { position: relative; max-width: 760px; margin: 0 auto; }
  .eyebrow {
    display: inline-block;
    background: rgba(37,99,235,0.08);
    color: #2563eb;
    border: 1.5px solid #2563eb;
    border-radius: 4px;
    padding: 0.35rem 1rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 2rem;
  }
  h1 {
    font-size: clamp(3rem, 7vw, 5.5rem);
    font-weight: 900;
    color: #0a0907;
    line-height: 0.95;
    letter-spacing: -0.03em;
    margin: 0 0 1.5rem;
  }
  .accent { color: #b8ff57; }
  .tagline {
    font-style: italic;
    font-size: 1.1rem;
    color: #8a8070;
    margin: 0 auto 2rem;
    max-width: 480px;
    line-height: 1.5;
  }
  .cta-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem; }
  .btn-primary {
    padding: 0.75rem 1.75rem;
    background: #b8ff57;
    color: #1a3300;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: #a3f03d; transform: translateY(-1px); }
  .btn-ghost {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: #0a0907;
    border: 1.5px solid #0a0907;
    border-radius: 8px;
    font-size: 1rem;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: #2563eb; color: #2563eb; }
  .chips { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
  .chips-label { font-size: 0.8rem; color: #8a8070; }
  .chip {
    background: #f0ede8;
    border: 1px solid #ddd8d0;
    color: #3d3830;
    border-radius: 999px;
    padding: 0.3rem 0.875rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .chip:hover { background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }

  /* Global pixel grid utility */
  :global(.pixel-grid) {
    background-image: repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);
    background-size: 24px 24px;
    background-position: 0 0;
  }
</style>
