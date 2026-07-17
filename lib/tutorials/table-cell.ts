/**
 * How a table cell reads — shared by every table the learner sees, so a live query result
 * and an authored example of the same data cannot render differently.
 *
 * The rule that matters: **a value must be distinguishable from its own name.** A real SQL
 * NULL and the three-character string `'NULL'` used to produce byte-identical markup in
 * `SqlResultGrid`, on a course that spends whole lessons on NULL semantics — so a learner
 * comparing their result against an expected one had no way to tell a missing value from a
 * literal. `DiagramTable` had already got this right, which is exactly the drift a shared
 * module prevents.
 *
 * Presentation lives in `cellToneClass`; the classification is kept separate so a caller
 * can align or tint without re-deriving what kind of value it holds.
 */

export type CellKind = "null" | "empty" | "number" | "boolean" | "text"

/** What sort of value this is, for alignment and tone. */
export function classifyCell(value: unknown): CellKind {
  if (value === null || value === undefined) return "null"
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "string" && value.length === 0) return "empty"
  return "text"
}

/**
 * The cell's display text.
 *
 * NULL and the empty string render as NAMES rather than as their (invisible) selves, and
 * `cellToneClass` marks them italic so the label cannot be mistaken for data: a row
 * holding the literal `'NULL'` shows upright `NULL`, a row holding SQL NULL shows italic
 * `NULL`. Empty string gets `''` rather than a blank cell, which was previously
 * indistinguishable from whitespace.
 */
export function formatCellText(value: unknown): string {
  switch (classifyCell(value)) {
    case "null":
      return "NULL"
    case "empty":
      return "''"
    case "boolean":
      return value ? "true" : "false"
    default:
      return String(value)
  }
}

/**
 * Tailwind classes for a cell of this kind.
 *
 * Numbers right-align with `tabular-nums` so digits stack into comparable columns — the
 * whole reason to render a result as a table rather than a list.
 *
 * NULL and empty are ITALIC but at full `text-muted-foreground`. The obvious move is to
 * fade them, and DiagramTable did (`text-muted-foreground/60`) — but that measures 2.41:1
 * in light mode and 3.71:1 in dark, both under the 4.5:1 AA bar. A NULL is not decoration;
 * it is the answer to "why is this row wrong", and on this course it is frequently the
 * whole point of the query. Muted-but-legible is 5.23:1 / 8.02:1, and the italic already
 * carries the distinction from a literal `'NULL'` on its own.
 */
export function cellToneClass(value: unknown): string {
  switch (classifyCell(value)) {
    case "null":
    case "empty":
      return "text-muted-foreground italic"
    case "number":
      return "text-right tabular-nums"
    default:
      return ""
  }
}
