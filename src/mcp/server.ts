// src/mcp/server.ts
//
// MCP server implemented as a Cloudflare Durable Object.
//
// We intentionally do NOT extend @cloudflare/agents' Agent base class.
// Agent requires Durable Object SQLite (state.sql) to be enabled for the class,
// and DO SQL cannot be retrofitted onto an already-deployed DO class.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { searchDevelopers } from './tools/search-developers';
import { getDeveloperProfile } from './tools/get-developer-profile';
import { compareDevelopers } from './tools/compare-developers';
import type { Env } from '../types/env';

export class WhodoestheworkMCP {
  private env: Env;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  /**
   * Create and configure a fresh McpServer instance.
   * Called once per request inside fetch() so that each stateless
   * Streamable HTTP session gets its own server object.
   */
  private createMcpServer(): McpServer {
    const mcpServer = new McpServer({
      name: 'whodoesthe.work',
      version: '0.1.0',
    });

    // ----------------------------------------------------------------
    // Tool 1: search_developers
    // ----------------------------------------------------------------
    mcpServer.tool(
      'search_developers',
      'Search for software developers by technical skills, domains, code quality, and review habits. Returns a ranked list with match explanations.',
      {
        query: z.string().min(1).describe(
          "Natural language description of the developer you need. Example: 'Rust developer with distributed systems experience who reviews code regularly.'",
        ),
        domains: z.array(z.string()).optional().describe(
          "Filter by technical domains: 'distributed-systems', 'frontend-react', 'ml-infrastructure', etc.",
        ),
        languages: z.array(z.string()).optional().describe(
          "Filter by programming languages: 'Go', 'Rust', 'TypeScript', etc.",
        ),
        minQualityScore: z.number().min(0).max(100).optional().describe(
          'Minimum code quality percentile (0-100).',
        ),
        minReviewScore: z.number().min(0).max(100).optional().describe(
          'Minimum review quality percentile (0-100).',
        ),
        requiresDocumentation: z.boolean().optional().describe(
          'Only return developers with documentation contributions.',
        ),
        activeWithinMonths: z.number().int().positive().optional().default(12).describe(
          'Only return developers active within this many months.',
        ),
        limit: z.number().int().min(1).max(50).optional().default(10).describe(
          'Max results to return.',
        ),
      },
      async (params) => {
        const result = await searchDevelopers(params, this.env);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    // ----------------------------------------------------------------
    // Tool 2: get_developer_profile
    // ----------------------------------------------------------------
    mcpServer.tool(
      'get_developer_profile',
      'Get a detailed engineering profile for a specific GitHub developer, including quality scores, domain expertise, and links to top contributions as evidence.',
      {
        githubUsername: z.string().min(1).describe('GitHub username to look up.'),
        includeEvidence: z.boolean().optional().default(true).describe(
          'Include links to top contributions as evidence.',
        ),
        domains: z.array(z.string()).optional().describe('Focus the profile on these domains.'),
      },
      async (params) => {
        const profile = await getDeveloperProfile(params, this.env);
        if (profile === null) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                status: 'ingestion_started',
                message: `Developer "${params.githubUsername}" is being analyzed. This typically takes 5-15 minutes for a first-time analysis. Please retry shortly.`,
                githubUsername: params.githubUsername,
              }, null, 2),
            }],
          };
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(profile, null, 2) }] };
      },
    );

    // ----------------------------------------------------------------
    // Tool 3: compare_developers
    // ----------------------------------------------------------------
    mcpServer.tool(
      'compare_developers',
      'Compare 2-5 developers side-by-side across all scoring dimensions. Returns per-dimension rankings and a narrative summary.',
      {
        githubUsernames: z.array(z.string()).min(2).max(5).describe(
          'GitHub usernames to compare.',
        ),
        focusDomains: z.array(z.string()).optional().describe(
          'Domains to emphasize in comparison.',
        ),
      },
      async (params) => {
        const result = await compareDevelopers(params, this.env);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    return mcpServer;
  }

  /**
   * Handle every incoming HTTP request.
   * A new stateless transport + McpServer is created per request.
   */
  async fetch(request: Request): Promise<Response> {
    // The MCP SDK transport is strict about Accept headers on POST.
    // Some MCP clients send `Accept: */*` or only `application/json`, which
    // the transport rejects with 406. Normalize to the required values.
    if (request.method === 'POST') {
      const accept = request.headers.get('accept') ?? '';
      const needsJson = !accept.includes('application/json');
      const needsSse = !accept.includes('text/event-stream');
      if (needsJson || needsSse) {
        const headers = new Headers(request.headers);
        headers.set('accept', 'application/json, text/event-stream');
        request = new Request(request, { headers });
      }
    }

    // ------------------------------------------------------------------
    // Wire up a fresh stateless MCP transport for this request
    // ------------------------------------------------------------------
    const transport = new WebStandardStreamableHTTPServerTransport({
      // sessionIdGenerator: undefined → stateless mode (no session tracking)
    });

    const mcpServer = this.createMcpServer();
    await mcpServer.connect(transport);

    // Delegate to the transport — it handles GET (SSE), POST (JSON-RPC), DELETE
    return transport.handleRequest(request);
  }
}
