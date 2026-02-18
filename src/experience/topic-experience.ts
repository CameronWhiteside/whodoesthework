// src/experience/topic-experience.ts
import type { Env } from '../types/env';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';
import {
  TOPIC_EVIDENCE_REPO_LIMIT,
  TOPIC_MAX_REPO_CANDIDATES,
} from '../shared/constants';
import { embed, embedBatch } from '../search/embeddings';

export interface TopicRepoEvidence {
  repoFullName: string;
  similarity: number;
  stars: number;
  contributorsCount: number | null;
  recentContribCount12mo: number;
  totalContribCount: number;
}

export interface TopicExperienceResult {
  topic: string;
  repos: TopicRepoEvidence[];
}

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

function norm(a: number[]): number {
  let s = 0;
  for (const x of a) s += x * x;
  return Math.sqrt(s);
}

function cosine(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

export async function evaluateTopicExperience(
  env: Env,
  developerId: string,
  topics: string[],
): Promise<TopicExperienceResult[]> {
  if (topics.length === 0) return [];

  const db = createDB(env.DB);
  const queries = new Queries(db);
  const portfolios = await queries.getDeveloperRepoPortfolios(developerId, TOPIC_MAX_REPO_CANDIDATES);

  if (portfolios.length === 0) return topics.map((topic) => ({ topic, repos: [] }));

  const texts = portfolios.map((p) => p.summaryText);
  const repoVectors = await embedBatch(env.AI, texts);

  const results: TopicExperienceResult[] = [];
  for (const topic of topics) {
    const topicVector = await embed(env.AI, topic);
    const scored = portfolios.map((p, i) => {
      const sim = cosine(topicVector, repoVectors[i] ?? []);
      return {
        repoFullName: p.repoFullName,
        similarity: sim,
        stars: p.stars,
        contributorsCount: p.contributorsCount,
        recentContribCount12mo: p.recentContribCount12mo,
        totalContribCount: p.totalContribCount,
      } satisfies TopicRepoEvidence;
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    results.push({
      topic,
      repos: scored.slice(0, TOPIC_EVIDENCE_REPO_LIMIT),
    });
  }

  return results;
}
