"use client"

/**
 * ObjectiveList — a group of `ObjectiveChip`s with an "Expand all" toggle and an optional heading.
 *
 * UX-SPEC.md §1.4 / §1.8: `density="chip"` wraps chips inline (catalog card, board card, ticket
 * rail, summary grid); `density="full"` stacks them as rows, one per line (overview, standup,
 * retro). Both densities share the same expand-in-place interaction; only the layout differs.
 *
 * State lives here, not in each chip: toggling one chip flips only that chip, and "Expand
 * all"/"Collapse all" drives every chip from one place. This is what lets the same `ObjectiveChip`
 * be used standalone (uncontrolled) elsewhere while still supporting a group-level bulk toggle here.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ObjectiveChip, type ObjectiveView } from "./ObjectiveChip"

export interface ObjectiveListProps {
  objectives: ObjectiveView[]
  density: "chip" | "full"
  /** Optional group heading, e.g. "Sprint 3: Tenants" or "By Friday you can". */
  heading?: string
  className?: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function ObjectiveList({ objectives, density, heading, className }: ObjectiveListProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})
  const allOpen = objectives.length > 0 && objectives.every((objective) => openIds[objective.id])

  function toggleOne(id: string) {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAll() {
    if (allOpen) {
      setOpenIds({})
      return
    }
    setOpenIds(Object.fromEntries(objectives.map((objective) => [objective.id, true])))
  }

  const headingId = heading ? `objective-list-${slugify(heading)}` : undefined

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        {heading ? (
          <h3
            id={headingId}
            className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
          >
            {heading}
          </h3>
        ) : (
          <span />
        )}
        {objectives.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-[var(--wb-accent-strong)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>
      {objectives.length === 0 ? (
        <p className="text-xs text-[var(--wb-faint)]">No objectives yet.</p>
      ) : (
        <div
          aria-labelledby={headingId}
          className={density === "chip" ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}
        >
          {objectives.map((objective) => (
            <ObjectiveChip
              key={objective.id}
              objective={objective}
              density={density}
              expanded={!!openIds[objective.id]}
              onExpandedChange={() => toggleOne(objective.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export type { ObjectiveState, ObjectiveView } from "./ObjectiveChip"
