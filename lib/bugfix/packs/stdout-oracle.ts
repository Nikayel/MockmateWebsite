/**
 * Character-exact stdout oracle (PLAN.md Sprint 1 item 2; INTERVIEWER_SPEC.md
 * "Execution + oracle"). Packs are verified by byte-diffing captured stdout against a
 * PUBLIC expected-output oracle, NOT by assert-based test suites. This module is the
 * pure diff core: it decides match/no-match and reports WHICH SECTION differs so the
 * interviewer can point the candidate at the wrong block without naming the bug.
 *
 * Pure + environment-independent so it is unit-testable and reused identically by the
 * local python3 validation harness and the in-browser Pyodide runner.
 */

export interface StdoutDiffResult {
  /** True only on a byte-for-byte match (including trailing newline). */
  match: boolean
  /** 0-indexed first differing line, or null when matched. */
  firstDiffLine: number | null
  /** The expected line at `firstDiffLine` (null if actual has extra trailing lines). */
  expectedLine: string | null
  /** The actual line at `firstDiffLine` (null if actual is shorter than expected). */
  actualLine: string | null
  /**
   * Label of the section containing the first diff — the nearest preceding header
   * line in the EXPECTED output, or "output" when there is no header. This is what the
   * interviewer surfaces ("the Totals block is wrong"), never the bug itself.
   */
  section: string | null
  expectedLineCount: number
  actualLineCount: number
}

const HEADER_PATTERNS: RegExp[] = [
  /^\s*#{1,6}\s+\S/, // markdown heading
  /^\s*={2,}.*={2,}\s*$/, // === Section ===
  /^\s*-{3,}.*-{3,}\s*$/, // --- Section ---
  /^\s*\[[^\]]+\]\s*$/, // [Section]
  /^\s*[A-Za-z][^:]*:\s*$/, // Label:  (nothing after the colon)
]

function isHeaderLine(line: string): boolean {
  return HEADER_PATTERNS.some((pattern) => pattern.test(line))
}

/**
 * Find the section label for a diff at `lineIndex` by scanning upward through the
 * EXPECTED lines for the nearest header. Returns "output" when none is found.
 */
function sectionLabelFor(expectedLines: string[], lineIndex: number): string {
  for (let i = Math.min(lineIndex, expectedLines.length - 1); i >= 0; i--) {
    if (isHeaderLine(expectedLines[i])) {
      return expectedLines[i].trim()
    }
  }
  return "output"
}

/**
 * Byte-exact comparison. The oracle contract (PACK_REALISM_GUIDE.md §7) is exact
 * strings — we compare the raw text first, then, only to LOCATE a mismatch, split on
 * LF. Splitting is diagnostic only; the match verdict is the raw string equality.
 */
export function diffStdout(actual: string, expected: string): StdoutDiffResult {
  const expectedLines = expected.split("\n")
  const actualLines = actual.split("\n")

  if (actual === expected) {
    return {
      match: true,
      firstDiffLine: null,
      expectedLine: null,
      actualLine: null,
      section: null,
      expectedLineCount: expectedLines.length,
      actualLineCount: actualLines.length,
    }
  }

  const maxLines = Math.max(expectedLines.length, actualLines.length)
  for (let i = 0; i < maxLines; i++) {
    const expectedLine = i < expectedLines.length ? expectedLines[i] : null
    const actualLine = i < actualLines.length ? actualLines[i] : null
    if (expectedLine !== actualLine) {
      return {
        match: false,
        firstDiffLine: i,
        expectedLine,
        actualLine,
        section: sectionLabelFor(expectedLines, i),
        expectedLineCount: expectedLines.length,
        actualLineCount: actualLines.length,
      }
    }
  }

  // Strings differ but no line differs — only possible via characters the split
  // collapses (should not happen for LF-only text). Report a trailing-content diff.
  return {
    match: false,
    firstDiffLine: maxLines,
    expectedLine: null,
    actualLine: null,
    section: "output",
    expectedLineCount: expectedLines.length,
    actualLineCount: actualLines.length,
  }
}

/**
 * A human-readable, NON-REVEALING one-liner for the interviewer/evidence log. Names
 * the wrong section and the line, never the cause.
 */
export function describeStdoutDiff(result: StdoutDiffResult): string {
  if (result.match) return "Output matches the oracle exactly."
  if (result.firstDiffLine === null) return "Output differs from the oracle."
  const where =
    result.section && result.section !== "output" ? ` in the "${result.section}" section` : ""
  return `Output diverges from the oracle at line ${result.firstDiffLine + 1}${where}.`
}
