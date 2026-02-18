// src/analysis/diff-parser.ts
// Pure functions — no I/O. Parses git patch strings to extract added/removed lines
// and counts cyclomatic complexity decision points.

/**
 * Regex matching branching constructs that increment McCabe cyclomatic complexity.
 * Applied to individual lines of a patch (with the leading +/- stripped).
 */
const DECISION_POINTS_RE =
  /\b(if|else|elif|for|while|case|catch|&&|\|\||switch|ternary|\?[^:])\b/g;

export interface ParsedDiff {
  /** Lines starting with '+' (excluding the +++ header) */
  addedLines: string[];
  /** Lines starting with '-' (excluding the --- header) */
  removedLines: string[];
  /** Number of decision points in added lines */
  addedDecisionPoints: number;
  /** Number of decision points in removed lines */
  removedDecisionPoints: number;
}

/**
 * Count decision points (cyclomatic complexity signals) across an array of lines.
 * Each line should already have its leading +/- stripped before calling this.
 */
export function countDecisionPoints(lines: string[]): number {
  let count = 0;
  for (const line of lines) {
    // Reset lastIndex between matches since we reuse the global regex
    DECISION_POINTS_RE.lastIndex = 0;
    const matches = line.match(DECISION_POINTS_RE);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Parse a git patch string (as returned by GitHub API file.patch) into:
 *  - addedLines / removedLines (content only, leading +/- stripped)
 *  - addedDecisionPoints / removedDecisionPoints counts
 *
 * Empty or undefined patch strings return zero-valued ParsedDiff.
 */
export function parsePatch(patch: string): ParsedDiff {
  if (!patch) {
    return {
      addedLines: [],
      removedLines: [],
      addedDecisionPoints: 0,
      removedDecisionPoints: 0,
    };
  }

  const addedLines: string[] = [];
  const removedLines: string[] = [];

  for (const rawLine of patch.split('\n')) {
    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      addedLines.push(rawLine.slice(1));
    } else if (rawLine.startsWith('-') && !rawLine.startsWith('---')) {
      removedLines.push(rawLine.slice(1));
    }
  }

  return {
    addedLines,
    removedLines,
    addedDecisionPoints: countDecisionPoints(addedLines),
    removedDecisionPoints: countDecisionPoints(removedLines),
  };
}
