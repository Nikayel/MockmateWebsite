import type { DiagramCell } from "./schema"

/**
 * Render a diagram table cell to display text. One source of truth shared by every
 * table-shaped diagram (join, table) so NULL/boolean formatting can't drift between them.
 */
export function formatCell(v: DiagramCell): string {
  if (v === null) return "NULL"
  if (typeof v === "boolean") return v ? "true" : "false"
  return String(v)
}
