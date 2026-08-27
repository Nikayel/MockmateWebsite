/**
 * Objective view-model (UX-SPEC.md §1.4) — pure types plus the "no per-learner
 * signal yet" adapter, split out of ObjectiveChip.tsx on purpose.
 *
 * ObjectiveChip.tsx is "use client" (it renders a stateful chip), which marks
 * every one of its exports as a client reference. Several Server Components
 * (app/sprint-labs/[workbookId]/page.tsx, WorkbookCard.tsx, TicketView.tsx)
 * called `toNotStartedObjectiveView` during static generation and crashed the
 * build: "Attempted to call toNotStartedObjectiveView() from the server but
 * toNotStartedObjectiveView is on the client." A type-only import doesn't hit
 * this (types are erased before the client/server split matters), but a plain
 * function does — so the function needs a home outside any "use client" file.
 */

/** Not the storage/mastery schema — this is the screens' view model. */
export type ObjectiveState = "not_started" | "practicing" | "demonstrated" | "escaped"

/** UX-SPEC.md §1.4's `ObjectiveView`. `sentence` is the full authored "I can ___" line. */
export interface ObjectiveView {
  id: string
  label: string
  sentence: string
  state: ObjectiveState
}

/**
 * Adapter for screens that show a workbook's authored objectives with no per-learner mastery signal
 * (the catalog card, the public overview): every objective renders `not_started`, which is the
 * honest state for a visitor who has not attempted anything yet. Screens with real mastery data
 * (retro, summary) build their own `ObjectiveView[]` instead of using this.
 */
export function toNotStartedObjectiveView(objective: {
  id: string
  label: string
  canDo: string
}): ObjectiveView {
  return {
    id: objective.id,
    label: objective.label,
    sentence: objective.canDo,
    state: "not_started",
  }
}
