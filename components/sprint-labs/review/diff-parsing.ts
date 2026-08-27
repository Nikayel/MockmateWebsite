/**
 * Pure unified-diff-by-file splitter for `DiffCompare` (UX-SPEC.md §1.8: "a
 * shared file picker and a per-file changed-lines count"). No diff viewer
 * exists anywhere in this codebase (checked before writing this — the repo
 * has `CodeMirrorEditor` but no `DiffView`/`parseDiff` of any kind), so this
 * is the "else a CodeMirror read-only two-pane" fallback UX-SPEC.md §7
 * anticipates.
 *
 * Deliberately separate from `lib/sprint-labs/grading/diff-utils.ts` (Task
 * 8's, whole-diff `extractDiffFilePaths`/`countDiffChangedLines`) rather than
 * extending it: that module is owned by a different task and this needs a
 * PER-FILE split those two whole-diff readers don't attempt.
 */

const DIFF_GIT_HEADER = /^diff --git a\/(.+) b\/(.+)$/

export interface DiffFileEntry {
  /** The new-side path (falls back to the old-side path for a pure delete). */
  path: string
  /** This file's slice of the diff, headers included, ready to render as-is. */
  hunkText: string
  added: number
  removed: number
}

/**
 * Splits a unified diff into one entry per `diff --git` block, in the order
 * they appear. A diff with no recognizable `diff --git` header (or an empty
 * string) yields an empty array rather than one file with an empty path.
 */
export function splitDiffByFile(diffText: string): DiffFileEntry[] {
  const lines = diffText.split("\n")
  const entries: DiffFileEntry[] = []
  let current: { path: string; lines: string[] } | null = null

  function flush() {
    if (!current) return
    let added = 0
    let removed = 0
    for (const line of current.lines) {
      if (line.startsWith("+++") || line.startsWith("---")) continue
      if (line.startsWith("+")) added++
      else if (line.startsWith("-")) removed++
    }
    entries.push({ path: current.path, hunkText: current.lines.join("\n"), added, removed })
  }

  for (const line of lines) {
    const match = DIFF_GIT_HEADER.exec(line)
    if (match) {
      flush()
      current = { path: match[2] || match[1], lines: [line] }
      continue
    }
    if (current) current.lines.push(line)
  }
  flush()

  return entries
}

/** Formats a file's change count the way retro's mockup does: "+34 -6". */
export function formatChangedLines(added: number, removed: number): string {
  return `+${added} -${removed}`
}
