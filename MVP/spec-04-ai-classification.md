# Spec 04 — Workers AI Classification (Contribution Type + Domain Tagging)

**Status:** Not Started
**Blocks:** spec-05 (scoring needs contribution types and domains), spec-06 (vectors need domain tags)
**Blocked By:** spec-00 (types), spec-01 (D1 schema)
**Parallelizable with:** spec-02, spec-03, spec-06, spec-07
**Estimated effort:** 4-5 hours

---

## Objective

Build the LLM classification layer that takes commit metadata (message, file list, truncated diff) and produces:

1. **Contribution type** — one of: `feature`, `bugfix`, `refactor`, `test`, `documentation`, `infrastructure`, `dependency`, `formatting`, `generated`
2. **Technical domain tags** — e.g., `distributed-systems`, `frontend-react`, `ml-infrastructure`

This runs on Workers AI. It reads unclassified rows from D1, classifies them, and writes results back.

---

## Research: Step 0

**Question:** Which Workers AI model to use? Need: fast inference, follows simple classification prompts, available on Cloudflare.

**Resolution path:**
1. Test `@cf/meta/llama-3.1-8b-instruct` — good balance of speed and instruction following
2. If too slow or inaccurate, test `@cf/meta/llama-3-8b-instruct`
3. Measure: latency per inference, accuracy on 20 manually-labeled samples

**Acceptance:** <500ms per inference, >80% agreement with manual labels on a 20-sample test set.

**Time-box:** 1 hour.

**Question 2:** What's the Workers AI rate limit and pricing at scale?

**Resolution:** Check the Cloudflare Workers AI pricing page. At MVP scale (~100K inferences/month), we need to stay within free tier or budget ~$10/month. If Cloudflare's AI gateway has per-minute rate limits, we need to batch and throttle.

**Time-box:** 30 minutes.

**Note:** No R2 dependency. The classifier reads file lists and diff previews either from D1 (message_head, file metadata) or re-fetches from GitHub. For MVP, classification uses the commit message + file paths stored in D1, plus a truncated patch re-fetched from GitHub only when the heuristic fast-path can't determine the type.

---

## Execution Steps

### Step 1: Contribution Type Classifier

Create `src/classification/contribution-classifier.ts`.

```typescript
// src/classification/contribution-classifier.ts
import { contributionType, type ContributionType } from '../schemas/contribution';

// Use Zod enum values as the source of truth
const VALID_TYPES = contributionType.options;

interface ClassificationInput {
  commitMessage: string;
  fileList: string[];       // file paths changed
  diffPreview: string;      // first 1500 chars of the concatenated patch
  additions: number;
  deletions: number;
}

export async function classifyContributionType(
  ai: Ai,
  input: ClassificationInput
): Promise<ContributionType> {
  // Fast-path heuristics (skip LLM for obvious cases)
  const heuristic = heuristicClassify(input);
  if (heuristic) return heuristic;

  const prompt = buildClassificationPrompt(input);

  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: `You are a code contribution classifier. Given a git commit, classify it into exactly one category. Respond with ONLY the category name, nothing else.

Valid categories: feature, bugfix, refactor, test, documentation, infrastructure, dependency, formatting, generated`
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 20,
    temperature: 0,
  }) as { response: string };

  const raw = response.response.trim().toLowerCase().replace(/[^a-z]/g, '');

  // Map common LLM variations
  const normalized = normalizeType(raw);
  if (VALID_TYPES.includes(normalized as ContributionType)) {
    return normalized as ContributionType;
  }

  // Fallback: if LLM returns garbage, use heuristic or default to 'feature'
  return heuristicClassify(input) ?? 'feature';
}

function buildClassificationPrompt(input: ClassificationInput): string {
  const filesSample = input.fileList.slice(0, 20).join('\n');
  const diffSample = input.diffPreview.slice(0, 1500);

  return `Commit message: ${input.commitMessage}

Files changed (${input.fileList.length} total, showing first 20):
${filesSample}

Changes: +${input.additions} -${input.deletions}

Diff preview:
${diffSample}

Category:`;
}

function heuristicClassify(input: ClassificationInput): ContributionType | null {
  const msg = input.commitMessage.toLowerCase();
  const files = input.fileList;

  // Dependency updates
  if (files.length <= 3 && files.every(f =>
    f.endsWith('package.json') || f.endsWith('package-lock.json') ||
    f.endsWith('yarn.lock') || f.endsWith('pnpm-lock.yaml') ||
    f.endsWith('go.sum') || f.endsWith('go.mod') ||
    f.endsWith('Cargo.lock') || f.endsWith('Cargo.toml') ||
    f.endsWith('requirements.txt') || f.endsWith('Pipfile.lock')
  )) return 'dependency';

  // Generated (lock files only)
  if (files.every(f =>
    f.endsWith('.lock') || f.endsWith('-lock.json') || f.endsWith('-lock.yaml') || f.endsWith('.sum')
  )) return 'generated';

  // Formatting commits
  if (msg.includes('format') || msg.includes('prettier') || msg.includes('lint fix') ||
      msg.includes('eslint') || msg.includes('gofmt') || msg.includes('rustfmt')) {
    if (input.additions === input.deletions || Math.abs(input.additions - input.deletions) < 5) {
      return 'formatting';
    }
  }

  // Doc-only
  if (files.every(f => f.endsWith('.md') || f.endsWith('.mdx') || f.endsWith('.rst') ||
      f.endsWith('.txt') || f.includes('/docs/'))) return 'documentation';

  // Test-only
  if (files.every(f =>
    f.includes('.test.') || f.includes('.spec.') || f.includes('_test.') ||
    f.includes('/tests/') || f.includes('/__tests__/')
  )) return 'test';

  // CI/CD only
  if (files.every(f =>
    f.startsWith('.github/') || f.startsWith('.circleci/') || f.includes('Dockerfile') ||
    f.includes('docker-compose') || f.endsWith('.yml') || f.endsWith('.yaml')
  )) return 'infrastructure';

  // Bug fix signals in commit message
  if (msg.startsWith('fix') || msg.includes('bugfix') || msg.includes('hotfix') ||
      msg.match(/fix(es|ed)?\s+(#|bug|issue|crash|error)/)) return 'bugfix';

  // Refactor signals
  if (msg.startsWith('refactor') || msg.includes('cleanup') || msg.includes('rename') ||
      msg.includes('reorganize') || msg.includes('restructure')) return 'refactor';

  // Can't determine heuristically — fall through to LLM
  return null;
}

function normalizeType(raw: string): string {
  const map: Record<string, string> = {
    'feat': 'feature',
    'fix': 'bugfix',
    'bug': 'bugfix',
    'docs': 'documentation',
    'doc': 'documentation',
    'ci': 'infrastructure',
    'chore': 'infrastructure',
    'build': 'infrastructure',
    'deps': 'dependency',
    'dep': 'dependency',
    'style': 'formatting',
    'format': 'formatting',
    'gen': 'generated',
    'auto': 'generated',
  };
  return map[raw] ?? raw;
}
```

### Step 2: Domain Tagger

Create `src/classification/domain-tagger.ts`.

**Design: open vocabulary with a hint list, not a closed constraint**

The taxonomy list is shown to the AI as *suggested vocabulary* — it keeps common tags consistent (e.g. `distributed-systems` not `distributed_systems`) but does **not** prevent the AI from emitting richer tags like `zero-knowledge-proofs`, `raft-consensus`, or `post-quantum-cryptography` when that's the accurate label. Free-form tags are stored as-is and get indexed in Vectorize, where embedding-based search handles semantic proximity automatically.

**GitHub repo topics are the highest-quality signal and should short-circuit the AI call entirely.** Topics like `zk-snarks`, `consensus-algorithms`, `tls-certificates` are curated by the repo owner and map directly to meaningful domain tags.

```typescript
// src/classification/domain-tagger.ts

/**
 * Seed vocabulary — shown to the AI as a style guide for consistent naming.
 * The AI MAY emit tags not in this list if they're more accurate.
 * Tags are always stored as lowercase-kebab-case, max 60 chars.
 *
 * This list grows over time: when the AI emits a good new tag, add it here
 * to encourage consistent use across future classifications.
 */
export const DOMAIN_TAXONOMY: string[] = [
  // Systems
  'distributed-systems', 'networking', 'databases', 'operating-systems',
  'concurrency', 'storage', 'consensus', 'message-queues', 'caching',
  // Backend
  'web-backend', 'api-design', 'authentication', 'microservices',
  'graphql', 'rest-api', 'grpc', 'serverless', 'event-driven',
  // Frontend
  'frontend-react', 'frontend-vue', 'frontend-angular', 'frontend-svelte',
  'css-styling', 'accessibility', 'web-performance', 'state-management',
  'web-components',
  // Mobile
  'ios', 'android', 'react-native', 'flutter',
  // Data & ML
  'ml-infrastructure', 'data-pipelines', 'data-engineering',
  'machine-learning', 'nlp', 'computer-vision', 'llm-inference',
  'feature-engineering', 'model-serving',
  // DevOps & Infra
  'ci-cd', 'containers', 'kubernetes', 'terraform',
  'monitoring', 'observability', 'cloud-infrastructure', 'service-mesh',
  // Security
  'security', 'cryptography', 'zero-knowledge-proofs', 'tls',
  'key-management', 'identity', 'oauth', 'authorization',
  // Fintech
  'fintech', 'payments', 'blockchain', 'smart-contracts', 'defi',
  // Tooling
  'cli-tools', 'developer-tooling', 'testing-frameworks', 'build-systems',
  'compiler-design', 'language-design', 'static-analysis',
  // Embedded
  'embedded-systems', 'iot', 'firmware', 'real-time-systems',
  // Game
  'game-development', 'game-engine', 'graphics', 'webgl',
];

export interface DomainInput {
  commitMessage: string;
  fileList: string[];
  languages: string[];
  repoDescription: string | null;
  repoName: string;
  repoTopics: string[];   // GitHub repo.topics — high-confidence signal, use first
}

/**
 * Tags a contribution with technical domain labels.
 *
 * Priority order:
 *   1. GitHub repo topics → direct use (no AI needed, highest confidence)
 *   2. File-path heuristics → skip AI for obvious patterns
 *   3. Workers AI → open-vocabulary classification with taxonomy as hint
 */
export async function tagDomains(
  ai: Ai,
  input: DomainInput,
): Promise<{ primary: string; secondary: string[] }> {
  // 1. Repo topics are curated by the owner — extremely high signal.
  //    Normalize them to kebab-case and use directly when present.
  if (input.repoTopics.length > 0) {
    const normalized = input.repoTopics
      .map(normalizeDomainTag)
      .filter(Boolean)
      .filter(t => t !== 'unknown') as string[];

    if (normalized.length > 0) {
      // Map common GitHub topic names to our vocabulary
      const mapped = normalized.map(t => TOPIC_ALIASES[t] ?? t);
      return { primary: mapped[0], secondary: mapped.slice(1, 3) };
    }
  }

  // 2. File-path heuristics — fast, no AI cost
  const heuristic = heuristicDomains(input);
  if (heuristic) return heuristic;

  // 3. Workers AI — open vocabulary, taxonomy as a hint
  const prompt = `Given a git commit, identify the primary technical domain and up to 2 secondary domains.

Repository: ${input.repoName}
${input.repoDescription ? `Description: ${input.repoDescription}` : ''}
Languages: ${input.languages.join(', ')}
Commit: ${input.commitMessage}
Files (first 15): ${input.fileList.slice(0, 15).join(', ')}

Common domain names for reference (use these exact strings when they fit, but use more specific terms when appropriate):
${DOMAIN_TAXONOMY.slice(0, 30).join(', ')}

Rules:
- Use lowercase-kebab-case only
- Prefer specific over generic (e.g. "raft-consensus" over "distributed-systems" if appropriate)
- Maximum 3 words per tag

Respond in this exact format:
primary: <domain>
secondary: <domain1>, <domain2>
If no secondary domains apply: secondary: none`;

  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'You are a technical domain classifier. Respond only in the requested format.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 60,
    temperature: 0,
  }) as { response: string };

  return parseDomainResponse(response.response);
}

/**
 * Normalize a string to a valid domain tag:
 * - lowercase, words separated by hyphens
 * - strip non-alphanumeric characters
 * - max 60 chars
 */
export function normalizeDomainTag(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')       // trim leading/trailing hyphens
    .slice(0, 60);
  return normalized || 'unknown';
}

/**
 * Common GitHub topic names that differ from our taxonomy vocabulary.
 * Maps GitHub topic → our preferred tag name.
 * Extend this as you discover common divergences.
 */
const TOPIC_ALIASES: Record<string, string> = {
  'react': 'frontend-react',
  'reactjs': 'frontend-react',
  'vue': 'frontend-vue',
  'vuejs': 'frontend-vue',
  'angular': 'frontend-angular',
  'svelte': 'frontend-svelte',
  'nextjs': 'frontend-react',
  'nuxt': 'frontend-vue',
  'k8s': 'kubernetes',
  'docker': 'containers',
  'machine-learning': 'machine-learning',
  'deep-learning': 'machine-learning',
  'neural-network': 'machine-learning',
  'llm': 'llm-inference',
  'large-language-model': 'llm-inference',
  'crypto': 'cryptography',
  'defi': 'defi',
  'ethereum': 'smart-contracts',
  'solidity': 'smart-contracts',
  'rust': null,   // language, not domain — skip
  'golang': null,
  'python': null,
  'typescript': null,
  'javascript': null,
} as unknown as Record<string, string>;

function parseDomainResponse(raw: string): { primary: string; secondary: string[] } {
  const lines = raw.trim().split('\n');
  let primary = 'unknown';
  let secondary: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith('primary:')) {
      primary = normalizeDomainTag(lower.replace('primary:', '').trim());
    }
    if (lower.startsWith('secondary:')) {
      const rest = lower.replace('secondary:', '').trim();
      if (rest !== 'none' && rest !== '') {
        secondary = rest.split(',')
          .map(s => normalizeDomainTag(s.trim()))
          .filter(s => s && s !== 'unknown');
      }
    }
  }

  return { primary, secondary: secondary.slice(0, 2) };
}

function heuristicDomains(input: DomainInput): { primary: string; secondary: string[] } | null {
  const allFiles = input.fileList.join(' ').toLowerCase();

  if ((allFiles.includes('.tsx') || allFiles.includes('.jsx') || allFiles.includes('components/')) &&
      (input.languages.includes('TypeScript') || input.languages.includes('JavaScript'))) {
    return { primary: 'frontend-react', secondary: ['state-management'] };
  }

  if (allFiles.includes('kubernetes') || allFiles.includes('/k8s/') || allFiles.includes('helm/')) {
    return { primary: 'kubernetes', secondary: ['cloud-infrastructure'] };
  }

  if (allFiles.includes('.github/workflows') || allFiles.includes('.circleci/') ||
      allFiles.includes('gitlab-ci')) {
    return { primary: 'ci-cd', secondary: [] };
  }

  if (allFiles.includes('.tf') && allFiles.includes('terraform')) {
    return { primary: 'terraform', secondary: ['cloud-infrastructure'] };
  }

  if (allFiles.includes('proto/') || allFiles.includes('.proto')) {
    return { primary: 'grpc', secondary: ['api-design'] };
  }

  return null;
}
```

### Step 3: Batch Classification Runner

Create `src/classification/batch-runner.ts` — processes unclassified contributions in batches.

```typescript
// src/classification/batch-runner.ts
import { Env } from '../types/env';
import { classifyContributionType } from './contribution-classifier';
import { tagDomains } from './domain-tagger';
import { createDB } from '../db/client';
import { Queries } from '../db/queries';

const BATCH_SIZE = 50;
const AI_DELAY_MS = 100; // Throttle to avoid rate limits

export async function classifyBatch(env: Env): Promise<{ processed: number; errors: number }> {
  const queries = new Queries(createDB(env.DB));
  let processed = 0;
  let errors = 0;

  // Get unclassified contributions via Drizzle
  const rows = await queries.getUnclassified(BATCH_SIZE);

  for (const row of rows.results) {
    try {
      // Get file list by re-fetching commit detail from GitHub.
      // We don't store raw diffs — commit SHAs are immutable so this is safe.
      const { GitHubClient } = await import('../ingestion/github-client');
      const gh = new GitHubClient(env.GITHUB_TOKEN);

      let fileList: string[] = [];
      let diffPreview = '';

      try {
        const { data: detail } = await gh.getCommitDetail(
          row.repo_full_name as string, row.id as string
        );
        fileList = detail.files.map(f => f.filename);
        diffPreview = detail.files
          .map(f => f.patch ?? '')
          .join('\n')
          .slice(0, 1500);
      } catch {
        // If re-fetch fails (deleted repo, etc.), classify from message alone
      }

      const languages: string[] = row.languages ? JSON.parse(row.languages as string) : [];

      // Classify contribution type
      const contributionType = await classifyContributionType(env.AI, {
        commitMessage: (row.message_head as string) ?? '',
        fileList,
        diffPreview,
        additions: row.additions as number,
        deletions: row.deletions as number,
      });

      // Fetch repo metadata (topics are cached in D1 by spec-02's upsertRepo)
      const repoMeta = await queries.getRepo(row.repo_full_name as string);
      const repoTopics: string[] = repoMeta?.topics ? JSON.parse(repoMeta.topics) : [];

      // Tag domains — repo topics are the highest-quality signal
      const domains = await tagDomains(env.AI, {
        commitMessage: (row.message_head as string) ?? '',
        fileList,
        languages,
        repoDescription: repoMeta?.description ?? null,
        repoName: row.repo_full_name as string,
        repoTopics,
      });

      const allDomains = [domains.primary, ...domains.secondary].filter(d => d !== 'unknown');

      // Write back via Drizzle
      await queries.markClassified(row.id, contributionType, allDomains);
      processed++;

      // Throttle
      await new Promise(r => setTimeout(r, AI_DELAY_MS));

    } catch (err) {
      console.error(`Classification error for ${row.id}: ${err}`);
      errors++;
    }
  }

  return { processed, errors };
}
```

### Step 4: Classification Trigger

The classifier runs in two modes:

**Mode A: Inline during ingestion.** After spec-02 finishes ingesting a repo, it can call the classifier for new contributions. Add to the queue handler:

```typescript
// In queue-handler.ts, after analyze_repo completes:
case 'classify_batch':
  const { classifyBatch } = await import('../classification/batch-runner');
  await classifyBatch(env);
  break;
```

**Mode B: Cron trigger.** Add a scheduled handler to process any backlog:

```typescript
// In src/index.ts
export default {
  // ... fetch, queue handlers ...

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const { classifyBatch } = await import('./classification/batch-runner');
    const result = await classifyBatch(env);
    console.log(`Classified ${result.processed} contributions, ${result.errors} errors`);
  },
};
```

Add to `wrangler.jsonc`:

```toml
[triggers]
crons = ["*/5 * * * *"]   # Every 5 minutes
```

### Step 5: Admin endpoint for manual trigger

```typescript
// Add to fetch handler in index.ts
if (url.pathname === '/admin/classify' && request.method === 'POST') {
  const { classifyBatch } = await import('./classification/batch-runner');
  const result = await classifyBatch(env);
  return Response.json(result);
}
```

### Step 6: Accuracy Validation

Create 20 manually-labeled samples:

```typescript
// test/classification-labels.ts
export const LABELED_SAMPLES = [
  {
    message: 'fix: resolve null pointer in auth middleware',
    files: ['src/middleware/auth.ts'],
    expectedType: 'bugfix',
    expectedDomain: 'authentication',
  },
  {
    message: 'feat: add retry logic for failed consensus rounds',
    files: ['src/consensus/raft.go', 'src/consensus/raft_test.go'],
    expectedType: 'feature',
    expectedDomain: 'distributed-systems',
  },
  // ... 18 more ...
];
```

Run through the classifier and report accuracy:

```bash
npx tsx test/classification-accuracy.ts
# Output: Type accuracy: 17/20 (85%), Domain accuracy: 16/20 (80%)
```

---

## Definition of Done

- [ ] `classifyContributionType` returns valid type for 20 test cases with >80% accuracy
- [ ] `tagDomains` returns sensible primary domain for 20 test cases with >80% accuracy
- [ ] When `repoTopics` is non-empty, `tagDomains` uses them directly without an AI call
- [ ] `normalizeDomainTag` produces consistent kebab-case for varied input strings
- [ ] AI-generated domains that are NOT in `DOMAIN_TAXONOMY` are stored as-is (e.g. `zero-knowledge-proofs` is valid)
- [ ] `upsertRepo` persists `topics` JSON so `getRepo` can return it for classification
- [ ] Heuristic fast-paths correctly classify obvious cases without hitting Workers AI
- [ ] `classifyBatch` processes unclassified contributions and writes results to D1
- [ ] Cron trigger runs every 5 minutes and processes backlog
- [ ] `/admin/classify` endpoint triggers manual classification run
- [ ] Workers AI calls stay under 500ms per inference

## Output Artifacts

- `src/classification/contribution-classifier.ts`
- `src/classification/domain-tagger.ts`
- `src/classification/batch-runner.ts`
- `test/classification-labels.ts`
- `test/classification-accuracy.ts`
- Updated `wrangler.jsonc` with cron trigger
