<section class="mcp" id="mcp">
  <div class="content">
    <h2>Agent tools</h2>

    <div class="row">
      <span class="subhead">Endpoint</span>
      <span class="pill mono">https://whodoesthe.work/mcp</span>
    </div>

    <p class="copy">Add this to your MCP client config:</p>
    <pre class="code mono">{`{
  "mcpServers": {
    "whodoesthework": {
      "url": "https://whodoesthe.work/mcp"
    }
  }
}`}</pre>

    <p class="subhead">Tools</p>
    <p class="note">JSON arguments, JSON output.</p>

    <div class="tool">
      <h3 class="tool-name mono">search_developers</h3>
      <p class="copy">Search by intent (natural language), with optional filters.</p>
      <div class="params mono">
        <div><code>query</code> string (required)</div>
        <div><code>domains</code> string[] (optional)</div>
        <div><code>languages</code> string[] (optional)</div>
        <div><code>minQualityScore</code> number 0-100 (optional)</div>
        <div><code>minReviewScore</code> number 0-100 (optional)</div>
        <div><code>requiresDocumentation</code> boolean (optional)</div>
        <div><code>activeWithinMonths</code> number (default 12)</div>
        <div><code>limit</code> number (default 10, max 50)</div>
      </div>
      <pre class="code mono">{`{
  "tool": "search_developers",
  "arguments": {
    "query": "Rust engineer for distributed systems (consensus, storage)",
    "languages": ["Rust"],
    "limit": 8
  }
}`}</pre>

      <div class="meta out-head">Output (example)</div>
      <pre class="code mono">{`{
  "developers": [
    {
      "githubUsername": "someuser",
      "githubUrl": "https://github.com/someuser",
      "overallImpact": 82.4,
      "codeQualityPercentile": 77.1,
      "reviewQualityPercentile": 61.3,
      "topDomains": [
        { "domain": "distributed-systems", "score": 88.2 },
        { "domain": "databases", "score": 74.6 },
        { "domain": "observability", "score": 62.9 }
      ],
      "topLanguages": [
        { "language": "Rust", "percentage": 54 },
        { "language": "TypeScript", "percentage": 26 },
        { "language": "Go", "percentage": 20 }
      ],
      "activeReposCount": 12,
      "recentActivity": "active",
      "matchExplanation": "They've shipped Rust distributed-systems
        work (consensus/storage) across 12 repos with strong impact."
    }
  ],
  "totalMatches": 1,
  "queryInterpretation": "Searched for: \"Rust engineer for distributed systems (consensus, storage)\"
    with languages: Rust."
}`}</pre>
    </div>

    <div class="tool">
      <h3 class="tool-name mono">get_developer_profile</h3>
      <p class="copy">Get a scored profile for a GitHub username (domains, evidence repos, score breakdown).</p>
      <div class="params mono">
        <div><code>githubUsername</code> string (required)</div>
        <div><code>includeEvidence</code> boolean (default true)</div>
        <div><code>domains</code> string[] (optional)</div>
      </div>
      <pre class="code mono">{`{
  "tool": "get_developer_profile",
  "arguments": {
    "githubUsername": "someuser",
    "includeEvidence": true
  }
}`}</pre>

      <div class="meta out-head">Output (example)</div>
      <pre class="code mono">{`{
  "githubUsername": "someuser",
  "githubUrl": "https://github.com/someuser",
  "overallImpact": 82.4,
  "codeQuality": 78.9,
  "reviewQuality": 61.3,
  "documentationQuality": 55.0,
  "collaborationBreadth": 64.2,
  "consistencyScore": 71.8,
  "recentActivityScore": 58.0,
  "scoreVersion": "0.1",
  "scoredAt": "2026-02-18T12:34:56.789Z",
  "domains": [
    {
      "domain": "distributed-systems",
      "score": 88.2,
      "contributionCount": 47,
      "evidenceRepos": ["org/raft-kv", "org/txn-log"]
    }
  ]
}`}</pre>
    </div>

    <div class="tool">
      <h3 class="tool-name mono">compare_developers</h3>
      <p class="copy">Compare 2-5 developers across dimensions and get rankings + narrative summary.</p>
      <div class="params mono">
        <div><code>githubUsernames</code> string[] (required; 2-5)</div>
        <div><code>focusDomains</code> string[] (optional)</div>
      </div>
      <pre class="code mono">{`{
  "tool": "compare_developers",
  "arguments": {
    "githubUsernames": ["dev_a", "dev_b"],
    "focusDomains": ["distributed-systems"]
  }
}`}</pre>

      <div class="meta out-head">Output (example)</div>
      <pre class="code mono">{`{
  "comparisonSummary": "dev_a leads overall impact and code quality,
    while dev_b edges review quality.",
  "dimensionRankings": [
    { "dimension": "overall_impact", "rankedUsernames": ["dev_a", "dev_b"] },
    { "dimension": "review_quality", "rankedUsernames": ["dev_b", "dev_a"] }
  ]
}`}</pre>
    </div>
  </div>
</section>

<style>
  .mcp { padding: var(--sp-7) var(--sp-5) var(--sp-8); }

  .content {
    max-width: 60rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  h2 {
    margin: 0;
    font-size: clamp(2.25rem, 5.4vw, 4.25rem);
    line-height: 0.92;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.035em;
  }

  h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--color-text); }

  .subhead {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--color-text);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    flex-wrap: wrap;
    padding: var(--sp-3) 0;
    border-top: 1px solid rgba(231,225,216,0.9);
    border-bottom: 1px solid rgba(231,225,216,0.9);
  }

  .pill {
    display: inline-block;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    border: var(--b-1) solid rgba(184,176,165,0.65);
    background: rgba(255,255,255,0.7);
    color: var(--color-text-2);
    font-size: 0.85rem;
  }

  .copy { margin: 0 0 var(--sp-3); color: var(--color-text-2); }

  .note { margin: 0; color: var(--color-muted); font-size: 0.95rem; }

  .tool {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding-top: var(--sp-5);
    border-top: 1px solid rgba(231,225,216,0.8);
    margin-top: var(--sp-2);
  }

  .tool-name { font-weight: 600; color: var(--color-text); }

  .params {
    display: grid;
    gap: 0.35rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .params code {
    padding: 0.05em 0.35em;
    border-radius: 6px;
    border: 1px solid rgba(184,176,165,0.55);
    background: rgba(255,255,255,0.6);
    color: var(--color-text-2);
  }

  .code {
    margin: 0;
    padding: var(--sp-5);
    border-radius: var(--r-2);
    border: 1px solid rgba(11,10,8,0.12);
    background: rgba(11,10,8,0.92);
    color: var(--color-accent);
    overflow-x: auto;
    line-height: 1.7;
    font-size: 0.85rem;
  }

  .out-head {
    margin-top: var(--sp-5);
  }

  @media (max-width: 540px) {
    .mcp { padding: var(--sp-7) var(--sp-4) var(--sp-7); }
  }
</style>
