# Spec 03 — Analysis Workers (Diff Parsing & Quality Metrics)

**Status:** Not Started
**Blocks:** spec-05 (scoring needs quality metrics)
**Blocked By:** spec-00 (types), spec-01 (D1 schema)
**Parallelizable with:** spec-02 (builds the caller), spec-04, spec-06, spec-07
**Estimated effort:** 4-5 hours

---

## Objective

Build stateless analysis functions that take a GitHub commit detail response (fetched live by spec-02) and return computed quality metrics: cyclomatic complexity delta, change entropy, test correlation, and file classification.

**Key change from previous version:** These are pure functions called inline during ingestion, not a separate queue-driven worker reading from R2. Spec-02's queue handler calls `analyzeCommitDetail(detail)` directly — no storage layer involved.

---

## Research: Step 0

**Question:** Can tree-sitter WASM run in Cloudflare Workers?

**Resolution path:**
1. Try `web-tree-sitter` in a Worker
2. If it works: use for AST-based complexity. If not: regex fallback.
3. **Ship regex first regardless** — it's 80% accurate and zero-dependency.

**Time-box:** 1 hour. Regex is the MVP, tree-sitter is the upgrade.

---

## Execution Steps

### Step 1: File Classifier

Create `src/analysis/file-classifier.ts`. Classifies files by role (source, test, docs, config, generated) based on path and extension patterns.

```typescript
// src/analysis/file-classifier.ts

export type FileRole = 'source' | 'test' | 'docs' | 'config' | 'generated' | 'other';

// Order matters: generated and test patterns are checked before source.
const GENERATED_PATTERNS = [
  /\.min\.(js|css)$/,
  /\.bundle\.(js|css)$/,
  /\bdist\//,
  /\bbuild\//,
  /\.pb\.go$/,
  /\.generated\./,
  /\.schema\.ts$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

const TEST_PATTERNS = [
  /\.(test|spec)\.[jt]sx?$/i,
  /\/__tests__\//,
  /\/tests?\//,
  /__mocks__\//,
  /\.stories\.[jt]sx?$/i,
  /\/cypress\//,
  /\/e2e\//,
  /\/fixtures?\//,
];

const DOC_PATTERNS = [
  /\.mdx?$/i,
  /\.rst$/i,
  /\/docs?\//,
  /\/documentation\//,
  /CHANGELOG/i,
  /README/i,
  /LICENSE/i,
  /CONTRIBUTING/i,
];

const CONFIG_PATTERNS = [
  /\.(json|yaml|yml|toml|ini|conf)$/,
  /\.(config|rc)\.[jt]sx?$/,
  /\.config$/,
  /Makefile$/,
  /Dockerfile$/,
  /docker-compose/,
  /\.github\//,
  /\.husky\//,
  /tsconfig/,
  /vite\.config/,
  /webpack\.config/,
  /eslint/,
  /prettier/,
];

// Maps lowercase extension → canonical language name.
// Used for language extraction and as the positive check for 'source' classification.
const LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin', kts: 'Kotlin',
  swift: 'Swift',
  c: 'C', h: 'C',
  cpp: 'C++', cc: 'C++', hpp: 'C++',
  cs: 'C#',
  php: 'PHP',
  ex: 'Elixir', exs: 'Elixir',
  hs: 'Haskell',
  scala: 'Scala',
  clj: 'Clojure',
  r: 'R',
  dart: 'Dart',
  lua: 'Lua',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS', sass: 'SCSS',
  vue: 'Vue',
  svelte: 'Svelte',
  astro: 'Astro',
};

export function classifyFile(filepath: string): FileRole {
  if (GENERATED_PATTERNS.some(p => p.test(filepath))) return 'generated';
  if (TEST_PATTERNS.some(p => p.test(filepath))) return 'test';
  if (DOC_PATTERNS.some(p => p.test(filepath))) return 'docs';
  if (CONFIG_PATTERNS.some(p => p.test(filepath))) return 'config';
  const ext = filepath.split('.').pop()?.toLowerCase() ?? '';
  if (LANGUAGE_MAP[ext]) return 'source';
  return 'other';
}

export function extractLanguage(filepath: string): string | null {
  const ext = filepath.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGE_MAP[ext] ?? null;
}
```

### Step 2: Diff Parser

Create `src/analysis/diff-parser.ts` — takes a GitHub commit detail response **directly** (not from R2) and produces parsed file structures.

```typescript
// src/analysis/diff-parser.ts
import { FileRole, classifyFile, extractLanguage } from './file-classifier';
import type { GitHubCommitDetail } from '../schemas/github';

export interface ParsedFile {
  filename: string;
  status: string;
  role: FileRole;
  language: string | null;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface ParsedCommit {
  files: ParsedFile[];
  totalAdditions: number;
  totalDeletions: number;
  sourceFiles: ParsedFile[];
  testFiles: ParsedFile[];
  docFiles: ParsedFile[];
  languages: string[];
}

/**
 * Parse a GitHub commit detail response into classified file structures.
 * Input comes directly from GitHub API — no intermediate storage.
 */
export function parseCommitDetail(detail: GitHubCommitDetail): ParsedCommit {
  const files: ParsedFile[] = detail.files.map(f => ({
    filename: f.filename,
    status: f.status,
    role: classifyFile(f.filename),
    language: extractLanguage(f.filename),
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch ?? null,
  }));

  const languages = [...new Set(
    files.map(f => f.language).filter((l): l is string => l !== null)
  )];

  return {
    files,
    totalAdditions: detail.stats.additions,
    totalDeletions: detail.stats.deletions,
    sourceFiles: files.filter(f => f.role === 'source'),
    testFiles: files.filter(f => f.role === 'test'),
    docFiles: files.filter(f => f.role === 'docs'),
    languages,
  };
}
```

### Step 3: Cyclomatic Complexity Calculator

`src/analysis/complexity.ts` — counts decision points in added/removed lines of source file patches. A single combined regex matches all branch constructs; we count matches in `+` lines (added) and `-` lines (removed) separately.

```typescript
// src/analysis/complexity.ts
import type { ParsedFile } from './diff-parser';

export interface ComplexityResult {
  complexityDelta: number;      // added − removed (negative = reduced complexity, good)
  complexityDeltaAbs: number;   // |delta| — used in EffortH formula
  addedDecisionPoints: number;
  removedDecisionPoints: number;
}

/**
 * Matches every branching construct that increments McCabe cyclomatic complexity:
 * if, else if, for, while, do, case, catch, && (short-circuit), || (short-circuit), ??
 *
 * Applied only to source-classified files so test boilerplate (describe/it blocks)
 * doesn't inflate complexity scores.
 */
const DECISION_POINTS_RE =
  /\bif\s*\(|\belse\s+if\s*\(|\bfor\s*[(\s]|\bwhile\s*\(|\bdo\s*\{|\bcase\s+[^:]+:|\bcatch\s*\(|&&|\|\||\?\?/g;

export function computeComplexity(sourceFiles: ParsedFile[]): ComplexityResult {
  let added = 0;
  let removed = 0;

  for (const file of sourceFiles) {
    if (!file.patch) continue;

    for (const line of file.patch.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added += (line.slice(1).match(DECISION_POINTS_RE) ?? []).length;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removed += (line.slice(1).match(DECISION_POINTS_RE) ?? []).length;
      }
    }
  }

  const delta = added - removed;
  return {
    complexityDelta: delta,
    complexityDeltaAbs: Math.abs(delta),
    addedDecisionPoints: added,
    removedDecisionPoints: removed,
  };
}
```

### Step 4: Change Entropy Calculator

`src/analysis/entropy.ts` — normalized Shannon entropy H ∈ [0, 1] that measures how evenly a commit's churn is spread across files. H=0 for a single-file change; H=1 for perfectly uniform spread. Used as the entropy term in the SEU formula.

```typescript
// src/analysis/entropy.ts
import type { ParsedFile } from './diff-parser';

/**
 * Computes normalized Shannon entropy of file-level churn distribution.
 *
 *   H_raw = −Σ p_i × log₂(p_i)   where p_i = (add_i + del_i) / totalChurn
 *   H     = H_raw / log₂(F)       normalizes to [0, 1]
 *
 * H = 0: single-file change (no spread)
 * H = 1: churn perfectly uniform across all F files
 *
 * Applied to all files (source + test + docs) so a cross-cutting refactor
 * touching many file types gets the full spread signal.
 */
export function computeEntropy(files: ParsedFile[]): number {
  const changedFiles = files.filter(f => f.additions + f.deletions > 0);
  const F = changedFiles.length;

  if (F <= 1) return 0; // Single-file: entropy is undefined/zero by convention

  const totalChurn = changedFiles.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  if (totalChurn === 0) return 0;

  let H_raw = 0;
  for (const file of changedFiles) {
    const p = (file.additions + file.deletions) / totalChurn;
    if (p > 0) H_raw -= p * Math.log2(p);
  }

  // Normalize by maximum possible entropy for F files
  return H_raw / Math.log2(F); // result ∈ [0, 1]
}
```

### Step 5: Test Correlation Detector

`src/analysis/test-correlation.ts` — computes the test churn ratio for a commit. A value of 1.0 means the commit only touched test files; 0.0 means no test files. Used as the `testRatio` term in the QualityH formula.

```typescript
// src/analysis/test-correlation.ts
import type { ParsedFile } from './diff-parser';

export interface TestCorrelationResult {
  testRatio: number;  // [0, 1]: testChurn / (prodChurn + testChurn)
  hasTests: boolean;  // true if any test files were touched
}

/**
 * Computes the fraction of this commit's churn that is test code.
 *
 * testRatio = testChurn / (prodChurn + testChurn)
 *
 * Examples:
 *   Pure feature commit (no tests)  → testRatio ≈ 0.0
 *   Test-only commit                → testRatio = 1.0
 *   Feature + matching test file    → testRatio ≈ 0.3–0.5 (typical)
 *
 * Used in QualityH: higher testRatio → higher quality multiplier.
 * We count churn (additions + deletions) rather than file count to avoid a
 * tiny test file inflating the ratio against a large feature file.
 */
export function computeTestCorrelation(
  sourceFiles: ParsedFile[],
  testFiles: ParsedFile[],
): TestCorrelationResult {
  const prodChurn = sourceFiles.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  const testChurn = testFiles.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  const totalChurn = prodChurn + testChurn;

  return {
    testRatio: totalChurn > 0 ? testChurn / totalChurn : 0,
    hasTests: testFiles.length > 0,
  };
}
```

### Step 6: Unified Analysis Entry Point

**This is the new piece.** Create `src/analysis/metrics.ts` — a single function that spec-02's queue handler calls.

```typescript
// src/analysis/metrics.ts
import type { GitHubCommitDetail } from '../schemas/github';
import { parseCommitDetail } from './diff-parser';
import { computeComplexity } from './complexity';
import { computeEntropy } from './entropy';
import { computeTestCorrelation } from './test-correlation';

/**
 * All fields written to the contributions table (spec-01).
 * Flat numeric values only — designed to feed directly into the SEU/EffortH/QualityH
 * scoring formulas in spec-05 without any further transformation.
 */
export interface CommitAnalysisResult {
  // SEU inputs
  churn: number;               // totalAdditions + totalDeletions — log-scaled in SEU
  fileCount: number;           // files changed — file coordination overhead in SEU
  normalizedEntropy: number;   // H ∈ [0,1]: spread of churn across files

  // EffortH input
  complexityDeltaAbs: number;  // |ΔCC|: absolute change in cyclomatic complexity

  // QualityH inputs
  complexityDelta: number;     // signed ΔCC: negative = reduced complexity (good)
  testRatio: number;           // [0,1]: testChurn / totalChurn

  // Metadata
  languages: string[];
  hasTests: boolean;           // any test files touched?
  isTrivial: boolean;          // < 5 lines total and zero complexity change
  isDocOnly: boolean;          // only documentation files changed
  isGenerated: boolean;        // only generated files changed (zero scoring weight)
}

/**
 * Analyzes a commit detail response from GitHub.
 * Pure function — called inline during ingestion, no I/O.
 * Returns only the computed metrics written to D1.
 */
export function analyzeCommitDetail(detail: GitHubCommitDetail): CommitAnalysisResult {
  const parsed = parseCommitDetail(detail);

  const complexity = computeComplexity(parsed.sourceFiles);
  const normalizedEntropy = computeEntropy(parsed.files);
  const testCorrelation = computeTestCorrelation(parsed.sourceFiles, parsed.testFiles);

  const churn = parsed.totalAdditions + parsed.totalDeletions;
  const fileCount = parsed.files.length;
  const hasNonGenerated = parsed.files.some(f => f.role !== 'generated');

  return {
    churn,
    fileCount,
    normalizedEntropy,
    complexityDelta: complexity.complexityDelta,
    complexityDeltaAbs: complexity.complexityDeltaAbs,
    testRatio: testCorrelation.testRatio,
    languages: parsed.languages,
    hasTests: testCorrelation.hasTests,
    isTrivial: churn < 5 && complexity.complexityDeltaAbs === 0,
    isDocOnly:
      parsed.sourceFiles.length === 0 &&
      parsed.testFiles.length === 0 &&
      parsed.docFiles.length > 0,
    isGenerated: !hasNonGenerated && fileCount > 0,
  };
}
```

### Step 7: Test with fixture data

```bash
# Fetch a real commit for testing
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/cloudflare/workers-sdk/commits/HEAD" \
  > test/fixtures/sample-commit.json
```

```typescript
// test/analysis-test.ts (run with npx tsx)
import { analyzeCommitDetail } from '../src/analysis/metrics';
import sampleCommit from './fixtures/sample-commit.json';

const result = analyzeCommitDetail(sampleCommit as any);
console.log(JSON.stringify(result, null, 2));
// Verify: languages populated, complexity is a number, entropy >= 0
```

---

## Definition of Done

- [ ] `analyzeCommitDetail` returns all fields required by spec-05 scoring: `churn`, `fileCount`, `normalizedEntropy`, `complexityDelta`, `complexityDeltaAbs`, `testRatio`, `languages`, `hasTests`, `isTrivial`, `isDocOnly`, `isGenerated`
- [ ] `classifyFile`: `.ts` → source, `.test.ts` → test, `.md` → docs, `.min.js` → generated, `tsconfig.json` → config
- [ ] `computeComplexity`: single-file commit with one `if` → `complexityDelta=1`, `complexityDeltaAbs=1`
- [ ] `computeEntropy`: single-file change → `0`; N files with equal churn → approaches `1`
- [ ] `computeTestCorrelation`: commit touching only `foo.test.ts` → `testRatio=1.0`; no test files → `testRatio=0`
- [ ] **No R2 dependencies** — all functions are pure, taking GitHub API responses as input
- [ ] Test fixture runs without errors

## Output Artifacts

- `src/analysis/file-classifier.ts`
- `src/analysis/diff-parser.ts`
- `src/analysis/complexity.ts`
- `src/analysis/entropy.ts`
- `src/analysis/test-correlation.ts`
- `src/analysis/metrics.ts`
- `test/fixtures/sample-commit.json`
