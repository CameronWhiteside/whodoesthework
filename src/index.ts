// src/index.ts
import { Env } from './types/env';

export { DeveloperIngestion } from './ingestion/durable-object';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/mcp')) {
      return new Response('MCP not yet implemented', { status: 501 });
    }

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', version: '0.1.0' });
    }

    return new Response('whodoesthe.work', { status: 200 });
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    console.log(`Received ${batch.messages.length} messages`);
  },
};
