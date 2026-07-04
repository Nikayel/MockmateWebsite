"use client"

import { Check, PanelLeftOpen } from "lucide-react"
import { LESSON_SECTION_ORDER } from "@/lib/stores/tutorial-store"
import { PHASE_ICON, SECTION_LABEL } from "./lessonPhases"
import type { LessonSection, SectionStatus } from "@/lib/tutorials/types"

/**
 * The lesson outline's collapsed state: a slim (~58px) vertical strip that trades the full stepper
 * for orientation-at-a-glance. Top to bottom — an expand button, a hairline divider, then the phase
 * dots. A three-step tracker doesn't earn 248px of permanent width; the dots preserve "where am I"
 * at a fraction of the cost and hand the reclaimed space to the editor (editor primacy). Each dot
 * mirrors the stepper's current/done state and is clickable to jump phases, so the two rails stay in
 * sync. Purely presentational — the player owns section state and the collapsed/expanded choice.
 */
export function LessonRailStrip({
  sections,
  active,
  onSelect,
  onExpand,
}: {
  sections: Record<LessonSection, SectionStatus>
  active: LessonSection
  onSelect: (section: LessonSection) => void
  onExpand: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand lesson outline"
        aria-expanded={false}
        title="Expand outline"
        className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-accent/50 flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
      </button>

      <span className="bg-border h-px w-6" aria-hidden="true" />

      <nav aria-label="Lesson sections" className="flex flex-col items-center gap-2">
        {LESSON_SECTION_ORDER.map((section) => {
          const isActive = active === section
          const isDone = sections[section] === "completed"
          const Icon = PHASE_ICON[section]
          const label = SECTION_LABEL[section]
          const status = isDone ? "completed" : isActive ? "current" : "upcoming"
          return (
            <button
              key={section}
              type="button"
              onClick={() => onSelect(section)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${label} — ${status}`}
              title={label}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors",
                "focus-visible:ring-accent/50 focus-visible:ring-2 focus-visible:outline-none",
                // Clay ring is the unambiguous "you are here", even when a completed dot shares the fill.
                isActive ? "ring-accent ring-offset-background ring-2 ring-offset-2" : "",
                isDone || isActive
                  ? "bg-accent text-accent-foreground border-transparent"
                  : "bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:border-accent/40",
              ].join(" ")}
            >
              {isDone ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Icon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
