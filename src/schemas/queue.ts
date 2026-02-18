// src/schemas/queue.ts
import { z } from 'zod';

export const queueMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ingest_developer'), username: z.string() }),
  z.object({ type: z.literal('analyze_repo'), developerId: z.string(), username: z.string().optional(), repoFullName: z.string() }),
  z.object({ type: z.literal('analyze_reviews'), developerId: z.string(), username: z.string().optional(), repoFullName: z.string(), prNumbers: z.array(z.number().int()) }),
  z.object({ type: z.literal('compute_scores'), developerId: z.string() }),
  z.object({ type: z.literal('build_portfolio'), developerId: z.string() }),
  z.object({ type: z.literal('build_vectors'), developerId: z.string() }),
]);

export type QueueMessage = z.infer<typeof queueMessageSchema>;
