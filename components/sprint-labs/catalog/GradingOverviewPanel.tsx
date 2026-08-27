/**
 * GradingOverviewPanel — the workbook overview's "How it is graded" panel.
 *
 * UX-SPEC.md §3 draws a two-panel row here: "WHAT YOU INHERIT" (file/line/test counts, named seed
 * defects) beside "HOW IT IS GRADED" (the four gates, escaped defect rate). Only the second panel is
 * built: `WorkbookSummary` (lib/sprint-labs/types.ts, Task 1) carries no inherited-codebase stats or
 * planted-defect list, and `SprintPublic`/`getWorkbookSprints` don't either, so "WHAT YOU INHERIT"
 * has no real data source in the stable content API this task imports. Fabricating file/line counts
 * would be worse than omitting the panel. Flagged in task-10-report.md; the gate names and
 * definitions below are fixed platform vocabulary (WORKBOOK-SPEC.md §4, quoted verbatim in
 * UX-SPEC.md §8) and need no per-workbook data, so this half of the row is fully buildable today.
 */

const GATES: ReadonlyArray<{ name: string; definition: string }> = [
  { name: "Visible", definition: "The definition of done on the ticket." },
  { name: "Hidden", definition: "The edge cases a careful engineer would have thought of." },
  { name: "Regression", definition: "Every earlier sprint's suite." },
  { name: "Adversary", definition: "A hostile actor runs against your implementation." },
]

export function GradingOverviewPanel() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-4 sm:p-5">
      <h2 className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
        How it is graded
      </h2>
      <ul className="flex flex-col gap-2">
        {GATES.map((gate) => (
          <li key={gate.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-semibold text-[var(--wb-text)]">{gate.name}</span>
            <span className="text-[var(--wb-text-secondary)]">{gate.definition}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-[var(--wb-text-secondary)]">
        Scored on escaped defect rate: the share of hidden checks that get past you. It goes down
        over the arc, and that curve is the artifact.
      </p>
    </div>
  )
}
