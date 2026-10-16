export const BRIEF_LABEL = "text-muted-foreground text-xs font-medium"

const REDUNDANT_SECTIONS = /^\*\*(Your Task|Artifacts)\*\*\s*$/i

/**
 * Headings whose BODY is the content we want but whose LABEL the panel already
 * prints above the prose. Dropping just the label avoids rendering "Incident
 * Report" inline as a bold lead-in to its own first sentence, which is what
 * markdown does with a single newline after a `**Bold**` line.
 */
const REDUNDANT_LABELS = /^\*\*(Incident Report)\*\*\s*$/i

/**
 * Trim the narrative down to what the brief does not already say: drop any
 * "**Your Task**" / "**Artifacts**" section outright (the task box and file tree
 * cover those), and drop the "**Incident Report**" label while keeping its body.
 * A section runs until the next `**Heading**` line or the end.
 */
export function extractIncidentNarrative(statement: string, title?: string): string {
  const lines = statement.split("\n")
  const kept: string[] = []
  let skipping = false

  for (const line of lines) {
    // Only omit an exact repeated title, never a contract or program section.
    if (title && /^#{1,2}\s+/.test(line) && line.replace(/^#{1,2}\s+/, "").trim() === title.trim())
      continue
    if (/^\*\*[^*]+\*\*\s*$/.test(line)) {
      skipping = REDUNDANT_SECTIONS.test(line)
      if (!skipping && REDUNDANT_LABELS.test(line)) continue
    }
    if (!skipping) kept.push(line)
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
