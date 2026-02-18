// src/analysis/file-classifier.ts
// Pure functions — no I/O. Classifies file paths by role.

export type FileCategory = 'test' | 'generated' | 'documentation' | 'config' | 'source';

// Order matters: checked in priority order (most-specific first).

const TEST_PATTERNS = [
  /\.(test|spec)\.[jt]sx?$/i,
  /\/__tests__\//,
  /\/tests?\//,
  /^tests?\//,
  /^__tests__\//,
];

const GENERATED_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
  /\.bundle\.(js|css)$/,
  /\bdist\//,
  /\bbuild\//,
  /\bnode_modules\//,
  /\.pb\.go$/,
  /_generated\./,
];

const DOCUMENTATION_PATTERNS = [
  /\.mdx?$/i,
  /\.rst$/i,
  /\.txt$/i,
  /\.pdf$/i,
  /\bdocs?\//,
  /^docs?\//,
];

const CONFIG_PATTERNS = [
  /\.json$/,
  /\.ya?ml$/,
  /\.toml$/,
  /\.env(\..+)?$/,
  /^\.env(\..+)?$/,
  /Makefile$/,
  /Dockerfile(\..*)?$/,
  /\.config\.[jt]sx?$/,
  /\.config$/,
];

/**
 * Classify a file path into one of five categories.
 * Priority: generated > test > documentation > config > source.
 * 'source' is the catch-all for anything that doesn't match the above.
 */
export function classifyFile(filename: string): FileCategory {
  if (GENERATED_PATTERNS.some(p => p.test(filename))) return 'generated';
  if (TEST_PATTERNS.some(p => p.test(filename))) return 'test';
  if (DOCUMENTATION_PATTERNS.some(p => p.test(filename))) return 'documentation';
  if (CONFIG_PATTERNS.some(p => p.test(filename))) return 'config';
  return 'source';
}

export function isTestFile(filename: string): boolean {
  return classifyFile(filename) === 'test';
}

export function isGeneratedFile(filename: string): boolean {
  return classifyFile(filename) === 'generated';
}
