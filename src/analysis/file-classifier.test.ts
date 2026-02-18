import { describe, it, expect } from 'vitest';
import { classifyFile, isTestFile, isGeneratedFile } from './file-classifier';

describe('classifyFile', () => {
  describe('test files', () => {
    it('matches .test.ts', () => expect(classifyFile('src/foo.test.ts')).toBe('test'));
    it('matches .spec.ts', () => expect(classifyFile('src/foo.spec.ts')).toBe('test'));
    it('matches .test.js', () => expect(classifyFile('src/foo.test.js')).toBe('test'));
    it('matches __tests__/ directory', () => expect(classifyFile('src/__tests__/foo.ts')).toBe('test'));
    it('matches tests/ directory', () => expect(classifyFile('tests/unit/foo.ts')).toBe('test'));
  });

  describe('generated files', () => {
    it('matches package-lock.json', () => expect(classifyFile('package-lock.json')).toBe('generated'));
    it('matches yarn.lock', () => expect(classifyFile('yarn.lock')).toBe('generated'));
    it('matches .min.js', () => expect(classifyFile('dist/app.min.js')).toBe('generated'));
    it('matches dist/ directory', () => expect(classifyFile('dist/bundle.js')).toBe('generated'));
    it('matches node_modules/', () => expect(classifyFile('node_modules/react/index.js')).toBe('generated'));
  });

  describe('documentation files', () => {
    it('matches .md', () => expect(classifyFile('README.md')).toBe('documentation'));
    it('matches .mdx', () => expect(classifyFile('docs/guide.mdx')).toBe('documentation'));
    it('matches .rst', () => expect(classifyFile('docs/api.rst')).toBe('documentation'));
    it('matches docs/ directory', () => expect(classifyFile('docs/setup.ts')).toBe('documentation'));
  });

  describe('config files', () => {
    it('matches .json', () => expect(classifyFile('tsconfig.json')).toBe('config'));
    it('matches .yaml', () => expect(classifyFile('.github/workflows/ci.yaml')).toBe('config'));
    it('matches .toml', () => expect(classifyFile('Cargo.toml')).toBe('config'));
    it('matches Dockerfile', () => expect(classifyFile('Dockerfile')).toBe('config'));
    it('matches .config.ts', () => expect(classifyFile('vite.config.ts')).toBe('config'));
  });

  describe('source files (catch-all)', () => {
    it('matches .ts', () => expect(classifyFile('src/api/router.ts')).toBe('source'));
    it('matches .go', () => expect(classifyFile('cmd/server/main.go')).toBe('source'));
    it('matches .rs', () => expect(classifyFile('src/lib.rs')).toBe('source'));
    it('matches .py', () => expect(classifyFile('train.py')).toBe('source'));
  });

  describe('priority: generated > test', () => {
    it('classifies dist/__tests__/foo.js as generated, not test', () => {
      expect(classifyFile('dist/__tests__/foo.js')).toBe('generated');
    });
  });
});

describe('isTestFile', () => {
  it('returns true for a spec file', () => expect(isTestFile('auth.spec.ts')).toBe(true));
  it('returns false for a source file', () => expect(isTestFile('src/auth.ts')).toBe(false));
});

describe('isGeneratedFile', () => {
  it('returns true for a lockfile', () => expect(isGeneratedFile('package-lock.json')).toBe(true));
  it('returns false for source', () => expect(isGeneratedFile('src/index.ts')).toBe(false));
});
