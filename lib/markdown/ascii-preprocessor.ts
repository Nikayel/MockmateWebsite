/**
 * ASCII Art Preprocessor
 *
 * Detects ASCII art patterns in text and wraps them in code blocks
 * so they render with proper monospace formatting.
 */

// Characters that indicate ASCII art diagrams. Box-drawing and geometric glyphs
// essentially never appear in prose, so they stay a safe diagram signal.
// Arrows are deliberately excluded: `->` / `→` show up constantly in ordinary lesson
// prose ("ROW_NUMBER -> 1,2,3", "input → output"), and a lone arrow used to make this
// preprocessor fence the whole line, rendering it as raw monospace and breaking lists.
// A genuine arrow diagram is still caught by its box-drawing chars or indented structure.
const ASCII_ART_CHARS = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬▲▼◀▶●○◉■□▪▫]/
// An indented line that OPENS with a diagram stroke, e.g. the `/ \` under a tree node.
const TREE_PATTERN = /^\s{2,}[\/\\|]/
/**
 * A line whose slashes are diagram strokes rather than punctuation: strokes, pipes and
 * spacing only, no prose.
 *
 * This used to be the `[\/\\]\s*$` half of TREE_PATTERN — "ends with a slash" — which
 * fenced any ORDINARY SENTENCE that happened to end in one. A wrapped `pragma_index_list` /
 * `pragma_index_info` in sql-l3-indexes rendered as a monospace code box holding half a
 * sentence, and any line ending in a URL's trailing slash would do the same. It is the
 * exact trap the arrow chars were already excluded for, one line up.
 */
const TREE_EDGE_LINE = /^[\s\/\\|_+.-]*[\/\\][\s\/\\|_+.-]*$/
const BOX_PATTERN = /^\s*[\+\-\|]+\s*$/
const DIAGRAM_INDENT = /^\s{4,}\S/ // Lines with 4+ spaces of indent

// A GFM table delimiter row: pipes, dashes, and optional alignment colons only,
// e.g. `|---|---|`, `| --- | :--: |`, `col|---`. Must contain both a dash and a
// pipe so a plain horizontal rule (`---`) and prose never match.
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

/**
 * True for a GFM table delimiter row (the `|---|---|` line under a header).
 * This is exactly the line that trips BOX_PATTERN — it is all `|` and `-`, so
 * the ASCII fencer used to wrap it in a code block, which shattered the whole
 * table (header fell back to prose, body collapsed into one soft-wrapped line).
 */
function isTableDelimiterRow(line: string): boolean {
  return line.includes("|") && line.includes("-") && TABLE_DELIMITER.test(line)
}

/**
 * Check if a line looks like ASCII art
 */
function isAsciiArtLine(line: string, inBlock: boolean): boolean {
  // Empty lines in the middle of diagrams should be preserved
  if (line.trim() === "" && inBlock) return true

  // Check for ASCII art indicators
  if (ASCII_ART_CHARS.test(line)) return true
  if (TREE_PATTERN.test(line)) return true
  if (TREE_EDGE_LINE.test(line)) return true
  if (BOX_PATTERN.test(line)) return true

  // Check for diagram-like indentation patterns (4+ spaces with content)
  if (DIAGRAM_INDENT.test(line)) {
    const trimmed = line.trim()
    // Likely a diagram if it has special chars or very structured content
    if (/^[\[\](){}<>|\/\\:.*#@\-=+_^~`'"!?&%$;,\s\d]+$/.test(trimmed)) return true
    // Short lines with specific patterns
    if (trimmed.length < 40 && /[|\/\\<>\[\]{}()]/.test(trimmed)) return true
  }

  return false
}

/**
 * Preprocesses text to detect and wrap ASCII art in code blocks.
 *
 * Looks for:
 * - Box drawing characters (─, │, ┌, └, ├, ┤, ┬, ┴, ┼, etc.)
 * - Arrow characters (→, ←, ↑, ↓, ↔, ⟶, ⟵)
 * - Tree/diagram patterns with consistent indentation
 * - Lines with significant leading whitespace and special characters
 */
export function preprocessAsciiArt(text: string): string {
  const lines = text.split("\n")
  const result: string[] = []

  let inAsciiBlock = false
  let asciiBlockLines: string[] = []
  let consecutiveAsciiLines = 0

  const flushAsciiBlock = () => {
    if (asciiBlockLines.length >= 1) {
      result.push("```")
      result.push(...asciiBlockLines)
      result.push("```")
    }
    asciiBlockLines = []
    inAsciiBlock = false
    consecutiveAsciiLines = 0
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip if already inside a code block (marked with ```)
    if (line.trim().startsWith("```")) {
      if (inAsciiBlock) {
        flushAsciiBlock()
      }
      result.push(line)
      // Skip until end of code block
      let j = i + 1
      while (j < lines.length && !lines[j].trim().startsWith("```")) {
        result.push(lines[j])
        j++
      }
      if (j < lines.length) {
        result.push(lines[j])
      }
      i = j
      continue
    }

    // GFM table passthrough. A markdown table is a header row (contains `|`)
    // immediately followed by a delimiter row (`|---|---|`). remark-gfm turns
    // these into real tables, so the ASCII fencer must emit the whole block
    // verbatim and never touch the delimiter. Without this, the delimiter trips
    // BOX_PATTERN, gets fenced, and the table renders as unreadable raw text.
    if (
      line.includes("|") &&
      line.trim() !== "" &&
      i + 1 < lines.length &&
      isTableDelimiterRow(lines[i + 1])
    ) {
      if (inAsciiBlock) {
        flushAsciiBlock()
      }
      result.push(line) // header row
      result.push(lines[i + 1]) // delimiter row
      let j = i + 2
      // Body rows run until a blank line or a line with no pipe ends the table.
      while (j < lines.length && lines[j].trim() !== "" && lines[j].includes("|")) {
        result.push(lines[j])
        j++
      }
      i = j - 1
      continue
    }

    const isAscii = isAsciiArtLine(line, inAsciiBlock)

    if (isAscii) {
      if (!inAsciiBlock) {
        inAsciiBlock = true
      }
      asciiBlockLines.push(line)
      consecutiveAsciiLines++
    } else {
      if (inAsciiBlock) {
        // Check if this is just a label line followed by more ASCII
        const nextLines = lines.slice(i + 1, i + 3)
        const hasMoreAscii = nextLines.some((l) => isAsciiArtLine(l, true) && l.trim() !== "")

        if (
          hasMoreAscii &&
          line.trim() !== "" &&
          consecutiveAsciiLines >= 2 &&
          line.trim().length < 50
        ) {
          // This might be a label within the diagram, include it
          asciiBlockLines.push(line)
        } else {
          flushAsciiBlock()
          result.push(line)
        }
      } else {
        result.push(line)
      }
    }
  }

  // Flush any remaining ASCII block
  if (inAsciiBlock) {
    flushAsciiBlock()
  }

  return result.join("\n")
}
