// Cloudflare bindings — stays as TS interface (not Zod) because these are
// runtime platform objects, not data shapes we validate.
export interface Env {
  DB: D1Database;
  INGESTION_QUEUE: Queue;
  VECTOR_INDEX: VectorizeIndex;
  INGESTION_DO: DurableObjectNamespace;
  MCP_DO: DurableObjectNamespace;
  AI: Ai;
  ASSETS: Fetcher;
  GITHUB_TOKEN: string;
  API_SECRET_KEY: string;
  ENVIRONMENT: string;
}
