"use client"

/**
 * ObjectiveChip — one learning objective as an expandable chip.
 *
 * UX-SPEC.md §1.4: objectives are first-class UX, reused on the catalog, overview, standup, board
 * card, ticket, workspace, retro and summary screens. One pattern, two densities, so a learner
 * recognizes an objective on sight wherever it appears.
 *
 * The chip is a disclosure: a short label plus a state dot, and an `aria-expanded` button that
 * reveals the full "can do" sentence beneath it. Color is never the only channel for the state
 * (§14 accessibility rule) — the state word is always readable, via `title` and a visually-hidden
 * span, never only the dot's hue.
 *
 * Controlled/uncontrolled hybrid: a standalone caller (a board card, a ticket rail) can use this
 * with no `expanded` prop and it manages its own open state. `ObjectiveList` (the "Expand all"
 * caller) passes `expanded`/`onExpandedChange` to drive every chip from one place.
 */

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/** UX-SPEC.md §1.4. Not the storage/mastery schema — this is the screens' view model. */
export type ObjectiveState = "not_started" | "practicing" | "demonstrated" | "escaped"

/** UX-SPEC.md §1.4's `ObjectiveView`. `sentence` is the full authored "I can ___" line. */
export interface ObjectiveView {
  id: string
  label: string
  sentence: string
  state: ObjectiveState
}

const STATE_LABEL: Record<ObjectiveState, string> = {
  not_started: "Not started",
  practicing: "Practicing",
  demonstrated: "Demonstrated",
  escaped: "Escaped",
}

/**
 * UX-SPEC.md §1.4 dot colors. `escaped` is the one deliberate global-token exception (`destructive`)
 * because `--wb-*` has no failure hue (§1.1) — rendered as a ring, not a fill, per spec.
 */
const STATE_DOT_CLASS: Record<ObjectiveState, string> = {
  not_started: "bg-[var(--wb-track)]",
  practicing: "bg-[var(--wb-accent)]",
  demonstrated: "bg-[var(--wb-success)]",
  escaped: "bg-transparent ring-2 ring-destructive",
}

export interface ObjectiveChipProps {
  objective: ObjectiveView
  /** `"chip"` (default) renders an inline pill; `"full"` stacks the label over the sentence as a row. */
  density?: "chip" | "full"
  /** Controlled open state. Omit to let the chip manage its own (uncontrolled) open state. */
  expanded?: boolean
  onExpandedChange?: (next: boolean) => void
  className?: string
}

export function ObjectiveChip({
  objective,
  density = "chip",
  expanded,
  onExpandedChange,
  className,
}: ObjectiveChipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = expanded !== undefined
  const open = isControlled ? expanded : uncontrolledOpen
  const sentenceId = `objective-sentence-${objective.id}`

  function toggle() {
    const next = !open
    if (!isControlled) setUncontrolledOpen(next)
    onExpandedChange?.(next)
  }

  return (
    <div className={cn("flex flex-col gap-1", density === "chip" && "inline-flex", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={sentenceId}
        title={STATE_LABEL[objective.state]}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--wb-border)] px-2.5 py-1 text-left text-xs font-medium text-[var(--wb-text)] transition-colors",
          "hover:border-[var(--wb-accent)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]",
          density === "full" && "w-full justify-between gap-3 rounded-lg px-3 py-2"
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn("h-2 w-2 shrink-0 rounded-full", STATE_DOT_CLASS[objective.state])}
          />
          {/* The state word, always present for a reader who can't see the dot's color. */}
          <span className="sr-only">{STATE_LABEL[objective.state]}</span>
          <span className="truncate">{objective.label}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--wb-muted)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p
          id={sentenceId}
          className={cn(
            "text-xs leading-relaxed text-[var(--wb-text-secondary)]",
            density === "chip" ? "px-1" : "px-3"
          )}
        >
          {objective.sentence}
        </p>
      )}
    </div>
  )
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
