// src/classification/contribution-classifier.ts
import type { Ai } from '@cloudflare/workers-types';
import type { GitHubCommitDetail } from '../schemas/github';

export type ContributionType =
  | 'feature' | 'bugfix' | 'refactor' | 'test'
  | 'documentation' | 'infrastructure' | 'dependency'
  | 'formatting' | 'generated';

const VALID_TYPES = new Set<ContributionType>([
  'feature', 'bugfix', 'refactor', 'test',
  'documentation', 'infrastructure', 'dependency',
  'formatting', 'generated',
]);

/**
 * Classifies a commit into a contribution type using Workers AI with heuristic fallback.
 *
 * Fast-path heuristics are checked first to avoid AI cost for obvious cases.
 * Falls back to heuristics again if the AI returns an unrecognized response.
 */
export async function classifyContributionType(
  ai: Ai,
  detail: GitHubCommitDetail,
): Promise<ContributionType> {
  const files = detail.files.map(f => f.filename);
  const additions = detail.stats.additions;
  const deletions = detail.stats.deletions;
  const messageHead = detail.commit.message.split('\n')[0] ?? '';

  // Fast-path heuristics — skip LLM for obvious cases
  const heuristic = heuristicClassify(messageHead, files, additions, deletions);
  if (heuristic !== null) return heuristic;

  // Build prompt with commit message head, file extensions, and line counts
  const extensions = [...new Set(files.map(f => {
    const dot = f.lastIndexOf('.');
    return dot !== -1 ? f.slice(dot) : '(no ext)';
  }))];

  const prompt = buildPrompt(messageHead, extensions, files.length, additions, deletions);

  const response = await (ai.run as Function)('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: `You are a code contribution classifier. Given a git commit, classify it into exactly one category. Respond with ONLY the category name, nothing else.

Valid categories: feature, bugfix, refactor, test, documentation, infrastructure, dependency, formatting, generated`,
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 20,
    temperature: 0,
  }) as { response: string };

  // Parse and normalize the AI response — strip all text except the type keyword
  const raw = response.response.trim().toLowerCase().replace(/[^a-z]/g, '');
  const normalized = normalizeType(raw);

  if (VALID_TYPES.has(normalized as ContributionType)) {
    return normalized as ContributionType;
  }

  // AI returned garbage — fall back to heuristics or default
  return heuristicClassify(messageHead, files, additions, deletions) ?? 'feature';
}

function buildPrompt(
  messageHead: string,
  extensions: string[],
  fileCount: number,
  additions: number,
  deletions: number,
): string {
  return `Commit message: ${messageHead}
File extensions (${fileCount} files total): ${extensions.slice(0, 20).join(', ')}
Changes: +${additions} -${deletions}

Category:`;
}

function heuristicClassify(
  messageHead: string,
  files: string[],
  additions: number,
  deletions: number,
): ContributionType | null {
  if (files.length === 0) return null;

  const msg = messageHead.toLowerCase();

  // Dependency updates — lock files and manifest files only
  const depFiles = [
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'go.sum', 'go.mod', 'Cargo.lock', 'Cargo.toml',
    'requirements.txt', 'Pipfile.lock', 'poetry.lock', 'Gemfile.lock',
  ];
  if (files.every(f => depFiles.some(dep => f.endsWith(dep)))) {
    return 'dependency';
  }

  // Generated — only lock/sum files
  if (files.every(f =>
    f.endsWith('.lock') || f.endsWith('-lock.json') ||
    f.endsWith('-lock.yaml') || f.endsWith('.sum'),
  )) {
    return 'generated';
  }

  // Test-only — files only in test dirs or named *.test.* / *.spec.*
  if (files.every(f =>
    f.includes('.test.') || f.includes('.spec.') || f.includes('_test.') ||
    f.includes('/tests/') || f.includes('/__tests__/') || f.includes('/test/'),
  )) {
    return 'test';
  }

  // Documentation-only — only .md / .rst / .txt changes
  if (files.every(f =>
    f.endsWith('.md') || f.endsWith('.mdx') || f.endsWith('.rst') ||
    f.endsWith('.txt') || f.includes('/docs/'),
  )) {
    return 'documentation';
  }

  // Formatting — whitespace-only: additions ≈ deletions, message signals
  if (
    (msg.includes('format') || msg.includes('prettier') || msg.includes('lint fix') ||
     msg.includes('eslint') || msg.includes('gofmt') || msg.includes('rustfmt')) &&
    (additions === deletions || Math.abs(additions - deletions) < 5)
  ) {
    return 'formatting';
  }

  // Pure whitespace diff — additions exactly equals deletions with no new logic
  if (additions > 0 && additions === deletions) {
    return 'formatting';
  }

  return null;
}

/**
 * Maps common LLM abbreviations to canonical type names.
 */
function normalizeType(raw: string): string {
  const map: Record<string, string> = {
    feat: 'feature',
    fix: 'bugfix',
    bug: 'bugfix',
    docs: 'documentation',
    doc: 'documentation',
    ci: 'infrastructure',
    chore: 'infrastructure',
    build: 'infrastructure',
    deps: 'dependency',
    dep: 'dependency',
    style: 'formatting',
    format: 'formatting',
    gen: 'generated',
    auto: 'generated',
  };
  return map[raw] ?? raw;
}
