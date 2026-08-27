/**
 * Pure readers over a `reference.diff`'s unified-diff TEXT. Used by the
 * scorer (docs/sprint-labs/WORKBOOK-SPEC.md §5): `extractDiffFilePaths`
 * builds Understanding's reference manifest (which files a correct solution
 * touches), `countDiffChangedLines` sizes Code Quality's diff-size band.
 *
 * Neither function executes anything or reaches into the sealed bundle
 * beyond the diff string it is handed — both are safe to unit test with
 * plain fixture strings.
 */

const DIFF_GIT_HEADER = /^diff --git a\/(.+) b\/(.+)$/

/**
 * Every path touched by the diff, in order of first appearance, deduplicated.
 * A rename's old and new path are both included (both are places the
 * reference solution "touched"). Parses only `diff --git a/X b/Y` header
 * lines — content lines are irrelevant here.
 */
export function extractDiffFilePaths(diffText: string): string[] {
  const seen = new Set<string>()
  const paths: string[] = []
  for (const line of diffText.split("\n")) {
    const match = DIFF_GIT_HEADER.exec(line)
    if (!match) continue
    for (const path of [match[1], match[2]]) {
      if (!seen.has(path)) {
        seen.add(path)
        paths.push(path)
      }
    }
  }
  return paths
}

/**
 * Total added + removed CONTENT lines across every file in the diff.
 * Excludes the `--- a/X` / `+++ b/X` file-header lines (which also start
 * with `-`/`+`) and hunk headers (`@@ ... @@`) and context lines.
 */
export function countDiffChangedLines(diffText: string): number {
  let count = 0
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue
    if (line.startsWith("+") || line.startsWith("-")) count++
  }
  return count
}
