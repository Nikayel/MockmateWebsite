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
 *
 * Fix round 1: `headingLevel` (M1) lets a caller that already owns the page's heading rhythm (a
 * catalog card, a board rail) opt out of a real heading element without losing the label's look or
 * its role as the group's accessible name; the objective group itself is a `<ul>` (M5) so
 * `aria-labelledby` plus the item count are exposed the way list semantics already guarantee, rather
 * than needing a bespoke `aria-label`.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ObjectiveChip, type ObjectiveView } from "./ObjectiveChip"

export type ObjectiveListHeadingLevel = "h2" | "h3" | "h4" | "none"

export interface ObjectiveListProps {
  objectives: ObjectiveView[]
  density: "chip" | "full"
  /** Optional group heading, e.g. "Sprint 3: Tenants" or "By Friday you can". */
  heading?: string
  /**
   * The heading element's level in the surrounding page outline. Defaults to `"h3"`. Pass `"none"`
   * when the caller's own heading rhythm has no slot for one here (a catalog card, a rail inside an
   * already-headed panel) — the label still renders, styled the same way, on a plain `<span>` that
   * carries the same id `aria-labelledby` points at.
   */
  headingLevel?: ObjectiveListHeadingLevel
  className?: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const HEADING_CLASS = "text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"

export function ObjectiveList({
  objectives,
  density,
  heading,
  headingLevel = "h3",
  className,
}: ObjectiveListProps) {
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
  const HeadingTag = headingLevel === "none" ? "span" : headingLevel

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        {heading ? (
          <HeadingTag id={headingId} className={HEADING_CLASS}>
            {heading}
          </HeadingTag>
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
        <ul
          aria-labelledby={headingId}
          className={cn(
            "list-none",
            density === "chip" ? "flex flex-wrap gap-2" : "flex flex-col gap-2"
          )}
        >
          {/* A plain `<li>` is still a direct flex item once its parent is a flex container (any
              direct child is blockified per the flex layout spec regardless of its own default
              display), so this needs no `display: contents` trick — which would risk stripping the
              listitem role in some browser/AT combinations, defeating the point of M5. */}
          {objectives.map((objective) => (
            <li key={objective.id}>
              <ObjectiveChip
                objective={objective}
                density={density}
                expanded={!!openIds[objective.id]}
                onExpandedChange={() => toggleOne(objective.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type { ObjectiveState, ObjectiveView } from "./ObjectiveChip"
