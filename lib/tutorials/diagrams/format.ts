import type { DiagramCell } from "./schema"

/**
 * Render a diagram cell to display text — JoinDiagram only.
 *
 * It also derives the JOIN MATCH KEY from this (`formatCell(left) === formatCell(right)`),
 * so the function is load-bearing logic here, not just presentation. That is why it did not
 * move to `lib/tutorials/table-cell`, which every learner-facing TABLE now shares: changing
 * how a value stringifies would change which rows the diagram claims match.
 *
 * If JoinDiagram ever separates its key derivation from its rendering, this should fold
 * into `table-cell` and stop being a second answer to the same question.
 */
export function formatCell(v: DiagramCell): string {
  if (v === null) return "NULL"
  if (typeof v === "boolean") return v ? "true" : "false"
  return String(v)
}
