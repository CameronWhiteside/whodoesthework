<section class="mcp" id="mcp">
  <div class="inner mosaic-frame">
    <div class="grid" aria-hidden="true" />
    <div class="content">
      <div class="meta-sm mono">whodoesthe.work / MCP</div>
      <h2>MCP server for “who does the work?”</h2>
      <p class="lead accent-serif">Use the same evidence index from your agent. No UI. Just answers.</p>

      <div class="card">
        <div class="card-top">
          <span class="meta">Connection</span>
          <span class="pill mono">/mcp</span>
        </div>
        <p class="copy">Add this to your MCP client:</p>
        <pre class="code mono">{`{
  "mcpServers": {
    "whodoesthework": {
      "url": "https://whodoesthe.work/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEY"
      }
    }
  }
}`}</pre>
        <p class="note">Compatible with Claude Desktop, Cursor, and any MCP client.</p>
      </div>

      <div class="tools">
        <div class="tool">
          <div class="tool-head">
            <span class="name mono">search_developers</span>
            <span class="badge">Tool</span>
          </div>
          <p class="copy">Vector-search by intent, then return ranked matches with fit %, scores, and match notes.</p>
        </div>

        <div class="tool">
          <div class="tool-head">
            <span class="name mono">get_developer_profile</span>
            <span class="badge">Tool</span>
          </div>
          <p class="copy">Fetch a full scored profile (domains, evidence repos, and quality dimensions) for a username.</p>
        </div>
      </div>

      <div class="auth">
        <span class="meta">Auth</span>
        <div class="auth-box mono">Authorization: Bearer YOUR_KEY</div>
        <p class="note">UI search is public; MCP is gated.</p>
      </div>
    </div>
  </div>
</section>

<style>
  .mcp { padding: var(--sp-9) var(--sp-5); }

  .inner {
    position: relative;
    max-width: 60rem;
    margin: 0 auto;
    border-radius: var(--r-2);
    border: var(--b-1) solid rgba(184,176,165,0.65);
    background: rgba(255,255,255,0.62);
    overflow: hidden;
  }

  .grid {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(11,10,8,0.04) 0, rgba(11,10,8,0.04) 1px, transparent 1px, transparent 36px),
      repeating-linear-gradient(90deg, rgba(11,10,8,0.03) 0, rgba(11,10,8,0.03) 1px, transparent 1px, transparent 36px);
    opacity: 0.45;
    pointer-events: none;
  }

  .content {
    position: relative;
    padding: var(--sp-7);
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  h2 {
    margin: 0;
    font-size: var(--text-h1);
    line-height: 1.02;
    font-weight: 700;
    color: var(--color-text);
  }

  .lead {
    margin: 0;
    font-size: clamp(1.125rem, 2vw, 1.4rem);
    line-height: 1.4;
    color: var(--color-muted);
    max-width: 65ch;
  }

  .card {
    border: var(--b-1) solid rgba(184,176,165,0.65);
    border-radius: var(--r-2);
    background: rgba(255,255,255,0.78);
    padding: var(--sp-5);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-3);
    margin-bottom: var(--sp-3);
  }

  .pill {
    display: inline-block;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    border: var(--b-1) solid rgba(184,176,165,0.65);
    background: rgba(255,255,255,0.8);
    color: var(--color-text-2);
    font-size: 0.85rem;
  }

  .copy { margin: 0 0 var(--sp-3); color: var(--color-text-2); }

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

  .note { margin: var(--sp-3) 0 0; color: var(--color-muted); font-size: 0.95rem; }

  .tools {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-4);
  }

  .tool {
    border: var(--b-1) solid rgba(184,176,165,0.65);
    border-radius: var(--r-2);
    background: rgba(255,255,255,0.70);
    padding: var(--sp-5);
  }

  .tool-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-3);
    margin-bottom: var(--sp-2);
  }

  .name { font-weight: 600; color: var(--color-text); }

  .badge {
    font-size: var(--text-meta-sm);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-link);
    background: rgba(29, 78, 216, 0.07);
    border: var(--b-1) solid rgba(29, 78, 216, 0.35);
    border-radius: 999px;
    padding: 0.25rem 0.55rem;
  }

  .auth {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .auth-box {
    display: inline-block;
    width: fit-content;
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--r-2);
    border: 1px solid rgba(11,10,8,0.12);
    background: rgba(11,10,8,0.92);
    color: var(--color-accent);
    font-size: 0.9rem;
  }

  @media (max-width: 900px) {
    .tools { grid-template-columns: 1fr; }
  }

  @media (max-width: 540px) {
    .mcp { padding: var(--sp-8) var(--sp-4); }
    .content { padding: var(--sp-5); }
  }
</style>
