/**
 * Shared, pure helpers for reasoning about unified-diff text and prose,
 * used by `migration-filenames-unique-gapless`, `one-name-per-file`, and
 * `no-duplicated-hunk-from-unshipped-reference`.
 *
 * Fingerprinting uses fixed-size SLIDING WINDOWS over a flattened line
 * sequence (review round 1, C-2), not whole contiguous runs: a whole-run
 * fingerprint only catches a byte-identical copy of an ENTIRE hunk, so a
 * partial copy (3 of a leaked hunk's 5 lines), or the same lines with
 * unrelated CONTEXT interleaved between them (which breaks textual
 * contiguity in the raw diff without changing what was actually copied),
 * both evaded it -- proven empirically by the reviewer's fixtures. A
 * 3-line sliding window over the flattened sequence of "real" lines
 * (non-added / non-fence / blank lines dropped, never treated as breaks)
 * makes any 3-line run that appears in BOTH sequences count as a match,
 * regardless of what surrounds it in either source.
 */

const ADDED_LINE_RE = /^\+(?!\+\+)(.*)$/
const FENCE_RE = /^```/
const LEADING_COMMENT_RE = /^(?:\/\/|#|\/\*+|\*|--)\s*/

/**
 * Every added ("+") line in a unified diff, marker stripped and trimmed,
 * in order. Non-"+" lines (context, "-" removals, headers, hunk markers)
 * are dropped entirely rather than treated as breaks: a hunk's added lines
 * are one logical sequence regardless of what unchanged context sits
 * between them in the raw diff text.
 */
export function extractAddedLines(diffText: string): string[] {
  return diffText
    .split("\n")
    .map((line) => ADDED_LINE_RE.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match[1].trim())
    .filter((line) => line.length > 0)
}

/** Every file path a unified diff touches, read from its `+++ b/<path>` headers. */
export function extractDiffFilePaths(diffText: string): string[] {
  const paths: string[] = []
  const re = /^\+\+\+ b\/(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(diffText)) !== null) {
    paths.push(match[1].trim())
  }
  return paths
}

/**
 * Plain-prose lines (MERIDIAN.md), normalized for hunk-duplication
 * comparison against `extractAddedLines`'s flattening: a code-fence
 * delimiter line (``` or ```lang) is dropped entirely (not content, not a
 * break -- surrounding lines still flow together into the same sequence),
 * a leading comment marker (//, #, /*, *, --) is stripped from each
 * remaining line, and blank lines are dropped. The result is one flat
 * sequence, matching the diff side's flattening exactly.
 */
export function extractProseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !FENCE_RE.test(line))
    .map((line) => line.replace(LEADING_COMMENT_RE, "").trim())
    .filter((line) => line.length > 0)
}

/** Every contiguous window of exactly `size` lines from a flat sequence. */
export function slidingWindows(lines: string[], size = 3): string[][] {
  const windows: string[][] = []
  for (let i = 0; i + size <= lines.length; i++) {
    windows.push(lines.slice(i, i + size))
  }
  return windows
}

/** A stable string fingerprint for a line window, for Set-based comparison. */
export function fingerprintBlock(block: string[]): string {
  return block.join("\n")
}
