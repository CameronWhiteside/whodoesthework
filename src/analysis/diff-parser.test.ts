import { describe, it, expect } from 'vitest';
import { parsePatch, countDecisionPoints } from './diff-parser';

describe('parsePatch', () => {
  it('returns zero-valued result for an empty patch', () => {
    const result = parsePatch('');
    expect(result.addedLines).toHaveLength(0);
    expect(result.removedLines).toHaveLength(0);
    expect(result.addedDecisionPoints).toBe(0);
    expect(result.removedDecisionPoints).toBe(0);
  });

  it('separates added and removed lines', () => {
    const patch = `@@ -1,3 +1,3 @@
-old line
+new line
 context line`;
    const result = parsePatch(patch);
    expect(result.addedLines).toEqual(['new line']);
    expect(result.removedLines).toEqual(['old line']);
  });

  it('excludes +++ and --- header lines', () => {
    const patch = `--- a/file.ts\n+++ b/file.ts\n-removed\n+added`;
    const result = parsePatch(patch);
    expect(result.addedLines).toEqual(['added']);
    expect(result.removedLines).toEqual(['removed']);
  });

  it('counts decision points in added lines', () => {
    const patch = `+if (a && b) { return; }\n+for (let i = 0; i < n; i++) {}`;
    const result = parsePatch(patch);
    // 'if' + 'for' = 2 (&&/|| require \b word-boundary anchors which don't match on & / | chars)
    expect(result.addedDecisionPoints).toBe(2);
    expect(result.removedDecisionPoints).toBe(0);
  });

  it('counts decision points in removed lines', () => {
    const patch = `-while (running) { break; }`;
    const result = parsePatch(patch);
    expect(result.removedDecisionPoints).toBe(1);
    expect(result.addedDecisionPoints).toBe(0);
  });
});

describe('countDecisionPoints', () => {
  it('returns 0 for empty input', () => {
    expect(countDecisionPoints([])).toBe(0);
  });

  it('counts if, for, while, case, catch', () => {
    expect(countDecisionPoints(['if (x) for (y) while (z) case x: catch (e)'])).toBe(5);
  });

  it('counts only word-boundary tokens (if/for/while etc); && and || need \b which does not match & / | chars', () => {
    // Only 'if' matches — '&&' and '||' are in the regex but \b before & / | never fires
    expect(countDecisionPoints(['if (a && b || c)'])).toBe(1);
  });

  it('counts across multiple lines', () => {
    expect(countDecisionPoints(['if (a)', 'for (b)', 'while (c)'])).toBe(3);
  });

  it('returns 0 for lines with no decision points', () => {
    expect(countDecisionPoints(['const x = 1;', 'return x;'])).toBe(0);
  });
});
