/**
 * Shared, pure helpers for reasoning about unified-diff text (`setup.diff` /
 * `reference.diff`). Used by several validate rules:
 * `migration-filenames-unique-gapless` (which files a diff creates),
 * `one-name-per-file` (a banned filename appearing anywhere in a diff), and
 * `no-duplicated-hunk-from-unshipped-reference` (hunk fingerprints).
 */

const ADDED_LINE_RE = /^\+(?!\+\+)(.*)$/

/** Every non-blank added ("+") line in a unified diff, marker stripped and trimmed. */
export function extractAddedLines(diffText: string): string[] {
  return diffText
    .split("\n")
    .filter((line) => ADDED_LINE_RE.test(line))
    .map((line) => line.slice(1).trim())
    .filter((line) => line.length > 0)
}

/**
 * Groups consecutive added lines into blocks — an approximation of a diff
 * hunk's new content. `minBlockLines` filters out incidental single-line
 * matches (a shared `export {}` line, say) that would otherwise be noise:
 * only a genuinely copied chunk of `minBlockLines` or more consecutive new
 * lines counts as a duplicated hunk.
 */
export function extractAddedLineBlocks(diffText: string, minBlockLines = 3): string[][] {
  const lines = diffText.split("\n")
  const blocks: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    const match = ADDED_LINE_RE.exec(line)
    const content = match ? match[1].trim() : ""
    if (match && content.length > 0) {
      current.push(content)
      continue
    }
    if (current.length >= minBlockLines) blocks.push(current)
    current = []
  }
  if (current.length >= minBlockLines) blocks.push(current)
  return blocks
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
 * Contiguous non-blank line blocks of plain prose (MERIDIAN.md has no diff
 * markers), for hunk-duplication comparison against `extractAddedLineBlocks`.
 */
export function extractProseLineBlocks(text: string, minBlockLines = 3): string[][] {
  const lines = text.split("\n").map((line) => line.trim())
  const blocks: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    if (line.length > 0) {
      current.push(line)
    } else {
      if (current.length >= minBlockLines) blocks.push(current)
      current = []
    }
  }
  if (current.length >= minBlockLines) blocks.push(current)
  return blocks
}

/** A stable string fingerprint for a line block, for Set-based comparison. */
export function fingerprintBlock(block: string[]): string {
  return block.join("\n")
}
