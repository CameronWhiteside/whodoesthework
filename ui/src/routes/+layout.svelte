<svelte:head>
  <link rel="preconnect" href="https://fonts.bunny.net" />
  <link
    href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:600i,700i|ibm-plex-mono:400,500,600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="app">
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="nav" aria-label="Primary">
    <div class="nav-inner mono">
      <a class="nav-item brand" href="/#find">WHODOESTHE.WORK</a>
      <span class="sep" aria-hidden="true">|</span>
      <a class="nav-item" href="https://github.com/CameronWhiteside/whodoesthework" target="_blank" rel="noopener">GITHUB</a>
      <span class="sep" aria-hidden="true">|</span>
      <a class="nav-item" href="/#mcp">MCP</a>
    </div>
  </header>

  <div class="bg" aria-hidden="true" />
  <main id="main">
    <slot />
  </main>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(:root) {
    /* Color system (editorial paper + pastel atmosphere) */
    --color-bg: #f6f1ea;
    --color-surface: #ffffff;
    --color-surface-2: #faf7f3;
    --color-bg-sky: #e7f2ff;
    --color-bg-lav: #eee9ff;

    --color-text: #0b0a08;
    --color-text-2: #2d2823;
    --color-muted: #61584e; /* darker than the old #8a8070 for readability */
    --color-subtle: #877d70;

    --color-border: #ddd8d0;
    --color-border-strong: #b8b0a5;
    --color-divider: #e7e1d8;

    --color-link: #1d4ed8;
    --color-link-hover: #1e40af;

    --color-brand: #2563eb;
    --color-accent: #b8ff57;
    --color-on-accent: #163100;

    --color-category: #eee9ff;
    --color-on-category: #3a2a78;
    --color-category-border: rgba(58, 42, 120, 0.18);

    --color-warn-bg: #fef3c7;
    --color-warn-ink: #78350f;
    --color-danger-bg: #fee2e2;
    --color-danger-ink: #7f1d1d;

    --bg-ambient:
      radial-gradient(900px 520px at 20% -10%, rgba(231,242,255,0.95) 0%, transparent 60%),
      radial-gradient(760px 520px at 90% 10%, rgba(238,233,255,0.85) 0%, transparent 62%),
      linear-gradient(180deg, rgba(231,242,255,0.55) 0%, var(--color-bg) 58%, rgba(238,233,255,0.35) 100%);

    /* Typography */
    --font-sans: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-accent: 'Fraunces', Georgia, serif;
    --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

    /* Type ramp */
    --text-body: 1rem;
    --lh-body: 1.65;

    --text-meta: 0.75rem;
    --text-meta-sm: 0.6875rem;

    --text-h2: clamp(1.5rem, 2.6vw, 2.125rem);
    --text-h1: clamp(2.25rem, 4.2vw, 3.25rem);
    --text-hero: clamp(3.25rem, 8vw, 6.75rem);

    /* Spacing (4px rhythm) */
    --sp-1: 0.25rem;
    --sp-2: 0.5rem;
    --sp-3: 0.75rem;
    --sp-4: 1rem;
    --sp-5: 1.5rem;
    --sp-6: 2rem;
    --sp-7: 3rem;
    --sp-8: 4rem;
    --sp-9: 6rem;

    /* Shape + rules */
    --r-1: 8px;
    --r-2: 14px;
    --b-1: 1.5px;
    --b-2: 2.5px;

    /* Motion */
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --dur-1: 120ms;
    --dur-2: 180ms;
    --dur-3: 240ms;
    --shadow-1: 0 10px 40px rgba(0,0,0,0.10);
  }

  :global(body) {
    margin: 0;
    background: var(--bg-ambient);
    color: var(--color-text);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    background-attachment: fixed;
  }

  :global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(0deg, rgba(11,10,8,0.05) 0, rgba(11,10,8,0.05) 1px, transparent 1px, transparent 34px),
      repeating-linear-gradient(90deg, rgba(11,10,8,0.04) 0, rgba(11,10,8,0.04) 1px, transparent 1px, transparent 34px);
    opacity: 0.28;
    mix-blend-mode: multiply;
    z-index: -1;
  }
  :global(a) { color: inherit; }
  :global(h1, h2, h3, h4) {
    font-family: var(--font-sans);
    letter-spacing: -0.02em;
  }

  :global(p) {
    font-size: var(--text-body);
    line-height: var(--lh-body);
    color: var(--color-text-2);
  }

  :global(:focus-visible) {
    outline: 2px solid var(--color-brand);
    outline-offset: 2px;
  }

  :global(a:hover),
  :global(a:focus-visible) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :global(.accent-serif) {
    font-family: var(--font-accent);
    font-style: italic;
  }

  :global(.mono) {
    font-family: var(--font-mono);
  }

  :global(.meta) {
    font-size: var(--text-meta);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  :global(.meta-sm) {
    font-size: var(--text-meta-sm);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  :global(.btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    border-radius: var(--r-1);
    padding: 0.75rem 1.25rem;
    font-weight: 700;
    text-decoration: none;
    border: var(--b-1) solid transparent;
    transition: transform var(--dur-2) var(--ease-out), background var(--dur-2) var(--ease-out), border-color var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out);
  }

  :global(.btn--accent) {
    background: var(--color-accent);
    color: var(--color-on-accent);
    border-color: var(--color-accent);
  }

  :global(.btn--accent:hover) {
    transform: translateY(-1px);
    background: #a3f03d;
    border-color: #a3f03d;
  }

  :global(.btn--ghost) {
    background: transparent;
    border-color: var(--color-border-strong);
    color: var(--color-text);
  }

  :global(.btn--ghost:hover) {
    border-color: var(--color-brand);
    color: var(--color-brand);
    transform: translateY(-1px);
  }

  :global(.accent-tag) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.9rem;
    font-size: var(--text-meta-sm);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-link);
    background: rgba(29, 78, 216, 0.07);
    border: var(--b-1) solid rgba(29, 78, 216, 0.35);
    border-radius: var(--r-1);
    width: fit-content;
    text-decoration: none;
  }

  :global(.mosaic-frame) {
    background-image:
      url('/mosaic-corner.svg'),
      url('/mosaic-corner.svg'),
      url('/mosaic-corner.svg'),
      url('/mosaic-corner.svg');
    background-repeat: no-repeat;
    background-position: left top, right top, left bottom, right bottom;
    background-size: 150px 150px;
  }

  :global(.wdtw-handle) {
    position: absolute;
    width: var(--wdtw-handle-size, 8px);
    height: var(--wdtw-handle-size, 8px);
    background: var(--color-brand);
    border-radius: 2px;
    opacity: 0.55;
    transform: translate(0, 0);
    transition: opacity var(--dur-1) var(--ease-out);
    pointer-events: none;
    z-index: 5;
  }
  :global(.wdtw-handle--tl) { top: var(--wdtw-handle-inset, -4px); left: var(--wdtw-handle-inset, -4px); }
  :global(.wdtw-handle--tr) { top: var(--wdtw-handle-inset, -4px); right: var(--wdtw-handle-inset, -4px); transform: translate(-2px, 2px); }
  :global(.wdtw-handle--bl) { bottom: var(--wdtw-handle-inset, -4px); left: var(--wdtw-handle-inset, -4px); transform: translate(2px, -2px); }
  :global(.wdtw-handle--br) { bottom: var(--wdtw-handle-inset, -4px); right: var(--wdtw-handle-inset, -4px); transform: translate(-2px, -2px); }

  :global(.wdtw-handle-host:hover .wdtw-handle),
  :global(.wdtw-handle-host:focus-within .wdtw-handle),
  :global(.wdtw-handle-host:focus-visible .wdtw-handle),
  :global(.wdtw-handle-host[data-handles='on'] .wdtw-handle) {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*) { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }

  .app { min-height: 100vh; }

  .bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(650px 420px at 18% 15%, rgba(238,233,255,0.60) 0%, transparent 60%),
      radial-gradient(700px 420px at 82% 18%, rgba(231,242,255,0.65) 0%, transparent 62%);
    opacity: 0.7;
    z-index: 0;
  }

  main {
    position: relative;
    z-index: 1;
    min-height: calc(100vh - 1px);
    padding-left: clamp(12px, 3vw, 28px);
    padding-right: clamp(12px, 3vw, 28px);
  }

  .skip-link {
    position: absolute;
    left: 10px;
    top: 10px;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    border: var(--b-1) solid var(--color-border);
    border-radius: var(--r-1);
    color: var(--color-text);
    text-decoration: none;
    transform: translateY(-200%);
    transition: transform var(--dur-2) var(--ease-out);
    z-index: 1000;
  }

  .skip-link:focus-visible {
    transform: translateY(0);
  }

  .nav {
    position: sticky;
    top: 0;
    z-index: 200;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .nav-inner {
    max-width: 60rem;
    margin: 0 auto;
    padding: var(--sp-3) var(--sp-5);
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
  }

  @media (max-width: 540px) {
    main {
      padding-left: 0;
      padding-right: 0;
    }
  }

  .nav-item {
    display: inline-flex;
    align-items: baseline;
    gap: var(--sp-2);
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--color-text-2);
    padding: 0.15rem 0;
  }

  .brand {
    font-weight: 800;
    color: var(--color-text);
  }

  .sep {
    color: var(--color-border-strong);
    user-select: none;
  }

  .nav-item:hover,
  .nav-item:focus-visible {
    color: var(--color-link);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :global(#find),
  :global(#mcp),
  :global(#results) {
    scroll-margin-top: 4.5rem;
  }
</style>
