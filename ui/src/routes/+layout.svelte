<script lang="ts">
  import { page } from '$app/stores';
  import { shortlistStore } from '$lib/stores/ShortlistStore';

  $: shortlistCount = $shortlistStore.length;
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.bunny.net" />
  <link href="https://fonts.bunny.net/css?family=plus-jakarta-sans:400,600,700,800,900&display=swap" rel="stylesheet" />
</svelte:head>

<div class="app">
  <nav>
    <a href="/" class="brand">whodoesthe.work</a>
    <div class="nav-links">
      <a
        href="/#find"
        class:active={$page.url.pathname.startsWith('/search') || $page.url.pathname.startsWith('/matches')}
      >
        Find Engineers
      </a>
      <a href="/mcp" class:active={$page.url.pathname === '/mcp'}>MCP</a>
      <a href="/shortlist" class:active={$page.url.pathname === '/shortlist'}>
        Shortlist{shortlistCount > 0 ? ` (${shortlistCount})` : ''}
      </a>
    </div>
  </nav>
  <main>
    <slot />
  </main>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    background: #f5f2ed;
    color: #0a0907;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    background-image: repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);
    background-size: 24px 24px;
    background-position: 0 0;
  }
  :global(a) { color: inherit; }
  :global(h1, h2, h3, h4) {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .app { min-height: 100vh; }

  nav {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    padding: 0 2rem;
    background: rgba(245,242,237,0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #ddd8d0;
  }

  .brand {
    font-size: 1rem;
    font-weight: 800;
    color: #0a0907;
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-links a {
    font-size: 0.9rem;
    color: #3d3830;
    text-decoration: none;
    transition: color 0.15s;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: #0a0907;
  }

  main {
    min-height: calc(100vh - 60px);
  }
</style>
