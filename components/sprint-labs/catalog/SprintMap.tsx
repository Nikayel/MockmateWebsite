"use client"

/**
 * SprintMap — the workbook overview's ten-sprint (or however many) list.
 *
 * UX-SPEC.md §3: number, title, lock/current/done state, objective count; each row expands to the
 * sprint goal plus its objective chips. Two things this component does NOT do, both deliberate
 * narrowings of the full spec for this task:
 *
 *  - Per-sprint ticket and point counts. `SprintPublic` (lib/sprint-labs/types.ts) and
 *    `sprint.yaml`'s authored shape carry no ticket-key list or point total per sprint (a ticket's
 *    `points` lives on `TicketPublic`, keyed by ticket, with no sprint-grouping field anywhere in the
 *    compiled public bundle). Rather than guess at a ticket-key numbering convention, this renders
 *    only what the content API actually exposes: title, goal, objective count. Flagged in
 *    task-10-report.md as a spec-vs-registry gap for whoever owns `SprintPublic` next.
 *  - Navigation into a sprint. UX-SPEC.md §3 "Interactions" is explicit: "Sprint rows expand in
 *    place; they never navigate into a sprint the learner has not reached." Rows are plain toggle
 *    buttons here, never links into `run/` routes, which this task does not own and which do not
 *    exist yet (Task 11).
 *
 * `currentSprint` (from the caller's run lookup) drives `done`/`current`; without a run, sprint 1
 * reads `available` and sprints 2-10 read locked-by-paywall. The `Pro` pill is a real link to
 * `/pricing` (UX-SPEC.md §3: "a Pro row's whole surface is not a link, its `Pro` pill is"), rendered
 * as a sibling of the toggle button rather than nested inside it, so no button ever contains a link.
 */

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"
import type { SprintPublic } from "@/lib/sprint-labs/types"

export type SprintMapRowState = "done" | "current" | "available" | "locked"

export interface SprintMapProps {
  sprints: SprintPublic[]
  /** The learner's current sprint number, when a run exists. Omit for a signed-out/not-enrolled visitor. */
  currentSprint?: number
}

const STATE_WORD: Record<SprintMapRowState, string> = {
  done: "Done",
  current: "Current sprint",
  available: "Available",
  locked: "Locked",
}

function rowState(sprintNumber: number, currentSprint: number | undefined): SprintMapRowState {
  if (currentSprint === undefined) {
    return sprintNumber === 1 ? "available" : "locked"
  }
  if (sprintNumber < currentSprint) return "done"
  if (sprintNumber === currentSprint) return "current"
  return sprintNumber === 1 ? "available" : "locked"
}

export function SprintMap({ sprints, currentSprint }: SprintMapProps) {
  const [openNumber, setOpenNumber] = useState<number | null>(null)

  return (
    <ol className="flex flex-col divide-y divide-[var(--wb-border)] rounded-lg border border-[var(--wb-border)]">
      {sprints.map((sprint) => {
        const state = rowState(sprint.number, currentSprint)
        const isOpen = openNumber === sprint.number
        const isPro = sprint.number > 1
        const rowId = `sprint-map-row-${sprint.number}`
        const objectiveCount = sprint.objectives.length

        return (
          <li
            key={sprint.number}
            className={cn(
              "border-l-2",
              state === "current"
                ? "border-[var(--wb-accent)] bg-[var(--wb-accent-soft)]"
                : "border-transparent"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={rowId}
                onClick={() => setOpenNumber(isOpen ? null : sprint.number)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-medium text-[var(--wb-text-secondary)]"
                >
                  {state === "done" ? (
                    <Check className="h-4 w-4 text-[var(--wb-success)]" />
                  ) : (
                    sprint.number
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      state === "locked" ? "text-[var(--wb-disabled)]" : "text-[var(--wb-text)]"
                    )}
                  >
                    {sprint.title}
                  </span>
                  <span className="sr-only">{STATE_WORD[state]}</span>
                </span>
                <span className="shrink-0 text-xs whitespace-nowrap text-[var(--wb-text-secondary)]">
                  {objectiveCount} {objectiveCount === 1 ? "objective" : "objectives"}
                </span>
                {state === "locked" && (
                  <Lock aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--wb-disabled)]" />
                )}
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-[var(--wb-muted)] transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isPro ? (
                <Link
                  href="/pricing"
                  className="shrink-0 rounded-full bg-[var(--wb-accent-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--wb-accent-strong)] uppercase hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
                >
                  Pro
                </Link>
              ) : (
                <span className="shrink-0 rounded-full bg-[var(--wb-panel)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--wb-text-secondary)] uppercase">
                  Free
                </span>
              )}
            </div>
            {isOpen && (
              <div
                id={rowId}
                className="flex flex-col gap-3 border-t border-[var(--wb-border)] px-3 py-3"
              >
                <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
                  {sprint.goal}
                </p>
                <ObjectiveList
                  density="chip"
                  objectives={sprint.objectives.map(toNotStartedObjectiveView)}
                />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
