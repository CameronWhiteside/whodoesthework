<svelte:head>
  <title>MCP Server — whodoesthe.work</title>
</svelte:head>

<div class="page">
  <!-- Back nav -->
  <a href="/" class="back-link">← Back to home</a>

  <!-- Hero -->
  <header class="doc-hero">
    <div class="eyebrow">MCP SERVER</div>
    <h1>Use as an MCP Server</h1>
    <p class="doc-sub">
      whodoesthe.work exposes a Model Context Protocol server so AI agents can search
      and retrieve developer profiles programmatically — no UI required.
    </p>
  </header>

  <!-- Connection config -->
  <section class="doc-section">
    <h2>Connection</h2>
    <p>Add this to your MCP client configuration:</p>
    <pre class="code-block">{`{
  "mcpServers": {
    "whodoesthework": {
      "url": "https://whodoesthe.work/mcp"
    }
  }
}`}</pre>
    <p class="note">Works with Claude Desktop, Cursor, and any MCP-compatible client. No auth required.</p>
  </section>

  <!-- Tools -->
  <section class="doc-section">
    <h2>Available Tools</h2>

    <!-- Tool 1: search_developers -->
    <div class="tool-card">
      <div class="tool-header">
        <code class="tool-name">search_developers</code>
        <span class="tool-badge">POST</span>
      </div>
      <p class="tool-desc">
        Search indexed developers by natural language description. Returns ranked matches
        with confidence scores and match explanations.
      </p>
      <h4>Parameters</h4>
      <table class="params-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>description</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>Natural language description of the project or required expertise</td>
          </tr>
          <tr>
            <td><code>stacks</code></td>
            <td>string[]</td>
            <td>No</td>
            <td>Technology stack filters (e.g. ["React", "TypeScript", "Postgres"])</td>
          </tr>
          <tr>
            <td><code>role</code></td>
            <td>string</td>
            <td>No</td>
            <td>Role type filter (e.g. "frontend", "backend", "ml")</td>
          </tr>
          <tr>
            <td><code>limit</code></td>
            <td>number</td>
            <td>No</td>
            <td>Max results to return (default 10)</td>
          </tr>
        </tbody>
      </table>
      <h4>Example response</h4>
      <pre class="code-block code-block--sm">{`[
  {
    "username": "torvalds",
    "matchConfidence": 94,
    "overallImpact": 0.97,
    "codeQuality": 0.95,
    "topDomains": [
      { "domain": "operating-systems", "score": 0.99 },
      { "domain": "kernel", "score": 0.98 }
    ],
    "whyMatched": "Deep systems programming background with 30+ years of
                   kernel and low-level C contributions."
  }
]`}</pre>
    </div>

    <!-- Tool 2: get_developer_profile -->
    <div class="tool-card">
      <div class="tool-header">
        <code class="tool-name">get_developer_profile</code>
        <span class="tool-badge">GET</span>
      </div>
      <p class="tool-desc">
        Retrieve the full scored profile for a specific developer by GitHub username.
      </p>
      <h4>Parameters</h4>
      <table class="params-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>username</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>GitHub username of the developer</td>
          </tr>
        </tbody>
      </table>
      <h4>Response includes</h4>
      <ul class="response-list">
        <li>Six quality dimension scores (impact, code quality, review quality, documentation, collaboration, consistency, recent activity)</li>
        <li>Domain expertise tags with per-domain scores and evidence repos</li>
        <li>Language breakdown by contribution percentage</li>
        <li>Ingestion status and last-indexed timestamp</li>
      </ul>
    </div>

    <!-- Tool 3: compare_developers -->
    <div class="tool-card">
      <div class="tool-header">
        <code class="tool-name">compare_developers</code>
        <span class="tool-badge">POST</span>
      </div>
      <p class="tool-desc">
        Compare two or more developers side-by-side across all quality dimensions.
        Returns a structured diff useful for shortlisting decisions.
      </p>
      <h4>Parameters</h4>
      <table class="params-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>usernames</code></td>
            <td>string[]</td>
            <td>Yes</td>
            <td>Array of GitHub usernames to compare (2–5)</td>
          </tr>
          <tr>
            <td><code>focus</code></td>
            <td>string</td>
            <td>No</td>
            <td>Dimension to emphasize in ranking (e.g. "codeQuality", "reviewQuality")</td>
          </tr>
        </tbody>
      </table>
      <h4>Output format</h4>
      <pre class="code-block code-block--sm">{`{
  "ranked": ["username_a", "username_b"],
  "comparison": {
    "username_a": { "overallImpact": 0.91, "codeQuality": 0.88, ... },
    "username_b": { "overallImpact": 0.87, "codeQuality": 0.92, ... }
  },
  "summary": "username_b leads on code quality; username_a on overall impact."
}`}</pre>
    </div>
  </section>

  <!-- Try it -->
  <section class="doc-section try-section">
    <p>Prefer a UI? <a href="/#find">Use the search form instead →</a></p>
  </section>
</div>

<style>
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 6rem;
  }

  .back-link {
    display: inline-block;
    font-size: 0.875rem;
    color: #8a8070;
    text-decoration: none;
    margin-bottom: 2.5rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: #0a0907;
  }

  /* Hero */
  .doc-hero {
    margin-bottom: 4rem;
    padding-bottom: 3rem;
    border-bottom: 1px solid #ddd8d0;
  }

  .eyebrow {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #2563eb;
    text-transform: uppercase;
    background: rgba(37,99,235,0.08);
    border: 1.5px solid #2563eb;
    border-radius: 4px;
    padding: 0.3rem 0.875rem;
    margin-bottom: 1.25rem;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 900;
    color: #0a0907;
    letter-spacing: -0.03em;
    line-height: 0.95;
    margin: 0 0 1.25rem;
  }

  .doc-sub {
    font-size: 1.05rem;
    color: #8a8070;
    line-height: 1.65;
    max-width: 580px;
    margin: 0;
  }

  /* Sections */
  .doc-section {
    margin-bottom: 3.5rem;
  }

  .doc-section h2 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0a0907;
    letter-spacing: -0.01em;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1.5px solid #ddd8d0;
  }

  .doc-section p {
    font-size: 0.9375rem;
    color: #3d3830;
    line-height: 1.65;
    margin: 0 0 1rem;
  }

  .doc-section code {
    background: #f0ede8;
    border: 1px solid #ddd8d0;
    border-radius: 4px;
    padding: 0.1em 0.4em;
    font-size: 0.85em;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    color: #0a0907;
  }

  .note {
    font-size: 0.8rem !important;
    color: #8a8070 !important;
  }

  /* Code blocks */
  .code-block {
    background: #1a1714;
    border: 1px solid #2d2925;
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.82rem;
    color: #b8ff57;
    line-height: 1.7;
    overflow-x: auto;
    margin: 0 0 1rem;
    white-space: pre;
  }

  .code-block--sm {
    font-size: 0.76rem;
  }

  /* Tool cards */
  .tool-card {
    background: #ffffff;
    border: 1.5px solid #ddd8d0;
    border-radius: 12px;
    padding: 1.75rem;
    margin-bottom: 1.5rem;
  }

  .tool-card h4 {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a8070;
    margin: 1.25rem 0 0.75rem;
  }

  .tool-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .tool-name {
    font-size: 1rem;
    font-weight: 700;
    color: #0a0907;
    background: #f0ede8;
    border: 1px solid #ddd8d0;
    border-radius: 6px;
    padding: 0.2em 0.6em;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    letter-spacing: -0.01em;
  }

  .tool-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(37,99,235,0.08);
    color: #2563eb;
    border: 1px solid #2563eb;
    border-radius: 4px;
    padding: 0.15em 0.5em;
  }

  .tool-desc {
    font-size: 0.9rem;
    color: #3d3830;
    line-height: 1.6;
    margin: 0;
  }

  /* Params table */
  .params-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .params-table th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a8070;
    padding: 0.5rem 0.75rem;
    border-bottom: 1.5px solid #ddd8d0;
  }

  .params-table td {
    padding: 0.625rem 0.75rem;
    color: #3d3830;
    border-bottom: 1px solid #f0ede8;
    vertical-align: top;
    line-height: 1.5;
  }

  .params-table td code {
    background: #f0ede8;
    border: 1px solid #ddd8d0;
    border-radius: 4px;
    padding: 0.1em 0.35em;
    font-size: 0.82em;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    color: #0a0907;
    white-space: nowrap;
  }

  .params-table tr:last-child td {
    border-bottom: none;
  }

  /* Response list */
  .response-list {
    margin: 0;
    padding: 0 0 0 1.25rem;
    color: #3d3830;
    font-size: 0.9rem;
    line-height: 1.8;
  }


  /* Try section */
  .try-section {
    border-top: 1px solid #ddd8d0;
    padding-top: 2rem;
  }

  .try-section p {
    color: #8a8070;
    font-size: 0.9rem;
  }

  .try-section a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.15s;
  }

  .try-section a:hover {
    color: #1d4ed8;
  }
</style>
