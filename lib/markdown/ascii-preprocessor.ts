/**
 * ASCII Art Preprocessor
 *
 * Detects ASCII art patterns in text and wraps them in code blocks
 * so they render with proper monospace formatting.
 */

// Characters that indicate ASCII art diagrams
const ASCII_ART_CHARS = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬→←↑↓↔⟶⟵▲▼◀▶●○◉■□▪▫]/
const ARROW_PATTERN = /[→←↑↓↔]|->|<-|-->/
const TREE_PATTERN = /^\s{2,}[\/\\|]|[\/\\]\s*$/
const BOX_PATTERN = /^\s*[\+\-\|]+\s*$/
const DIAGRAM_INDENT = /^\s{4,}\S/ // Lines with 4+ spaces of indent

/**
 * Check if a line looks like ASCII art
 */
function isAsciiArtLine(line: string, inBlock: boolean): boolean {
  // Empty lines in the middle of diagrams should be preserved
  if (line.trim() === "" && inBlock) return true

  // Check for ASCII art indicators
  if (ASCII_ART_CHARS.test(line)) return true
  if (ARROW_PATTERN.test(line)) return true
  if (TREE_PATTERN.test(line)) return true
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
