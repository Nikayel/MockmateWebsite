/**
 * Sprint Labs workspace — diff-stat computation (PLAN.md Task 12).
 *
 * A `git diff --stat`-shaped summary computed entirely client-side, since the browser workspace has
 * no real git anywhere in reach: AGENT-CONTEXT.md §3 Layer D ("`git diff --stat`-shaped summary
 * since ticket start") and the workspace's `TurnStateStrip` (UX-SPEC.md §7) both need "what changed"
 * without a git binary. Deliberately NOT a byte-exact diff algorithm (no Myers/LCS): a
 * common-prefix/common-suffix trim per file gives an honest added/removed line count in O(n) per
 * file, which is the right cost for a UI summary line and a per-turn prompt note, not a merge tool.
 *
 * `lib/sprint-labs/partner/context-layers.ts`'s `LayerBInput.diffStat` and `PerTurnState.diffStat`
 * both consume the `summary` string this produces, verbatim.
 */

export interface DiffStatResult {
  /** Count of paths whose content differs from the seed (or that exist only on one side). */
  filesChanged: number
  /** git-diff-stat-shaped summary, e.g. "+34 -6 across 3 files". "" when nothing changed. */
  summary: string
}

/**
 * Common-prefix/common-suffix line trim: the cheapest honest approximation of "how much changed"
 * without a real diff algorithm. Two edits at opposite ends of a large file will slightly
 * over-count the middle as fully replaced rather than finding a smaller edit script inside it —
 * an acceptable trade for O(n) cost on a UI summary line.
 */
function countLineDelta(
  oldContent: string,
  newContent: string
): { added: number; removed: number } {
  if (oldContent === newContent) return { added: 0, removed: 0 }
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")

  const maxCommon = Math.min(oldLines.length, newLines.length)
  let prefix = 0
  while (prefix < maxCommon && oldLines[prefix] === newLines[prefix]) prefix++

  let suffix = 0
  const maxSuffix = maxCommon - prefix
  while (
    suffix < maxSuffix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix++
  }

  return {
    removed: oldLines.length - prefix - suffix,
    added: newLines.length - prefix - suffix,
  }
}

/**
 * Compares `current` against `seed` (both keyed by workspace-relative path) and produces a
 * diff-stat summary. A path present only in `current` counts as fully added; a path present only in
 * `seed` (a learner deletion) counts as fully removed. Pure and input-order-independent.
 */
export function computeDiffStat(
  seed: Readonly<Record<string, string>>,
  current: Readonly<Record<string, string>>
): DiffStatResult {
  let totalAdded = 0
  let totalRemoved = 0
  let filesChanged = 0

  const allPaths = new Set([...Object.keys(seed), ...Object.keys(current)])
  for (const path of allPaths) {
    const before = seed[path] ?? ""
    const after = current[path] ?? ""
    if (before === after) continue
    filesChanged++
    const { added, removed } = countLineDelta(before, after)
    totalAdded += added
    totalRemoved += removed
  }

  if (filesChanged === 0) return { filesChanged: 0, summary: "" }
  const fileWord = filesChanged === 1 ? "file" : "files"
  return {
    filesChanged,
    summary: `+${totalAdded} -${totalRemoved} across ${filesChanged} ${fileWord}`,
  }
}
