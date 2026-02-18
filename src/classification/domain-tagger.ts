// src/classification/domain-tagger.ts
import type { Ai } from '@cloudflare/workers-types';

/**
 * Seed vocabulary — shown to the AI as a style guide for consistent naming.
 * The AI MAY emit tags not in this list if they're more accurate.
 * Tags are always stored as lowercase-kebab-case, max 60 chars.
 *
 * This list grows over time: when the AI emits a good new tag, add it here
 * to encourage consistent use across future classifications.
 */
export const DOMAIN_TAXONOMY = [
  'distributed-systems', 'machine-learning', 'web-frontend', 'web-backend',
  'mobile-ios', 'mobile-android', 'devops', 'security', 'cryptography',
  'database', 'networking', 'compilers', 'game-development', 'data-engineering',
  'api-design', 'real-time-systems', 'cloud-infrastructure', 'observability',
  'developer-tools', 'payments', 'authentication', 'search', 'streaming',
  'blockchain', 'embedded-systems', 'scientific-computing',
  // Add more as discovered from real ingestion runs
];

/**
 * Language names to filter OUT of domain tags.
 * Languages describe implementation choice, not the technical domain.
 */
const LANGUAGE_NAMES = new Set([
  'rust', 'golang', 'go', 'python', 'javascript', 'typescript', 'java',
  'cpp', 'c', 'csharp', 'ruby', 'scala', 'kotlin', 'swift', 'elixir',
  'haskell', 'zig', 'php', 'shell', 'bash', 'html', 'css',
]);

/**
 * Normalize a string to a valid domain tag:
 * - lowercase, words separated by hyphens
 * - strip non-alphanumeric characters (except hyphens)
 * - max 60 chars
 * - returns null if the result is too short (< 2 chars) or is a language name
 */
export function normalizeDomainTag(tag: string): string | null {
  const normalized = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')       // trim leading/trailing hyphens
    .slice(0, 60);

  if (normalized.length < 2) return null;

  return normalized;
}

/**
 * Tags a contribution with technical domain labels.
 *
 * Priority order:
 *   1. GitHub repo topics → normalize and return directly (no AI needed — highest confidence)
 *   2. Workers AI → open-vocabulary classification with taxonomy as style hint
 *
 * Returns an array of normalized domain tags, deduplicated, with language names filtered out.
 */
export async function tagDomains(
  ai: Ai,
  input: {
    repoTopics: string[];           // from GitHub repo.topics — highest confidence
    commitMessage: string;          // for AI context
    filePaths: string[];            // for AI context
    repoDescription: string | null; // for AI context
  },
): Promise<string[]> {
  // 1. Repo topics are curated by the owner — extremely high signal.
  //    Normalize them to kebab-case and use directly when present.
  if (input.repoTopics.length > 0) {
    const normalized = input.repoTopics
      .map(normalizeDomainTag)
      .filter((t): t is string => t !== null)
      .filter(t => !LANGUAGE_NAMES.has(t));

    const deduped = [...new Set(normalized)];
    if (deduped.length > 0) return deduped;
  }

  // 2. Workers AI — open vocabulary, taxonomy as a style hint
  const filesSample = input.filePaths.slice(0, 15).join(', ');
  const prompt = `Given a git commit, identify the relevant technical domains.

${input.repoDescription ? `Repository description: ${input.repoDescription}` : ''}
Commit message: ${input.commitMessage}
Files changed (sample): ${filesSample}

Use these domain names as a style guide for consistent naming (you may use others if more accurate):
${DOMAIN_TAXONOMY.join(', ')}

Rules:
- Use lowercase-kebab-case only
- Do NOT include programming language names (e.g. rust, python, typescript)
- List domains separated by spaces, most relevant first
- Maximum 5 domains

Domains:`;

  const response = await (ai.run as Function)('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'You are a technical domain classifier. Output only space-separated domain tags in lowercase-kebab-case.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 60,
    temperature: 0,
  }) as { response: string };

  // 3. Parse space-separated tags from the response
  const raw = response.response.trim();
  const tags = raw
    .split(/[\s,]+/)
    .map(t => normalizeDomainTag(t.trim()))
    .filter((t): t is string => t !== null)
    .filter(t => !LANGUAGE_NAMES.has(t));

  // Deduplicate and return
  return [...new Set(tags)];
}
