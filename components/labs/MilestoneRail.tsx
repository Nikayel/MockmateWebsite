"use client"

/**
 * MilestoneRail — left-column vertical stepper for a Case Lab run.
 *
 * Answers P3 ("where am I, what's next, and why") at a glance: the current
 * milestone is highlighted, completed ones are checked, the next one is labeled
 * with a one-line "what you'll do," and every row carries its purpose (the why).
 * Navigation is soft (P1) — any milestone can be opened. Collapsible on small
 * screens so the center station gets the room.
 */

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { MILESTONE_ORDER, useCaseLabStore } from "@/lib/stores/case-lab-store"
import { DEFAULT_MILESTONE_META } from "@/lib/labs/milestones"
import type { CaseLabMilestone, MilestoneKind, MilestoneStatus } from "@/lib/labs/types"

/** Milestones from the active lab in canonical order, with a sane fallback. */
function useRailMilestones(): CaseLabMilestone[] {
  const lab = useCaseLabStore((s) => s.activeLab)
  if (lab?.milestones?.length) {
    return [...lab.milestones].sort(
      (a, b) => MILESTONE_ORDER.indexOf(a.kind) - MILESTONE_ORDER.indexOf(b.kind)
    )
  }
  return MILESTONE_ORDER.map((kind) => ({ kind, ...DEFAULT_MILESTONE_META[kind] }))
}

function StatusMarker({ status }: { status: MilestoneStatus }) {
  if (status === "done") {
    return (
      <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    )
  }
  if (status === "active") {
    return (
      <span className="border-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2">
        <span className="bg-primary h-2 w-2 rounded-full" />
      </span>
    )
  }
  return (
    <span className="border-muted-foreground/30 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2">
      <span className="bg-muted-foreground/30 h-2 w-2 rounded-full" />
    </span>
  )
}

export function MilestoneRail({ className }: { className?: string }) {
  const milestones = useRailMilestones()
  const run = useCaseLabStore((s) => s.activeRun)
  const goToMilestone = useCaseLabStore((s) => s.goToMilestone)
  const progress = useCaseLabStore((s) => s.getProgress())
  const [open, setOpen] = useState(true)

  const current = run?.currentMilestone ?? milestones[0]?.kind ?? null
  const statusOf = (kind: MilestoneKind): MilestoneStatus =>
    run?.milestoneStatus[kind] ?? (kind === current ? "active" : "locked")

  const currentIndex = milestones.findIndex((m) => m.kind === current)
  const nextKind = currentIndex >= 0 ? milestones[currentIndex + 1]?.kind : undefined

  const currentMeta = milestones.find((m) => m.kind === current)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">Milestones</h2>
          <span className="text-muted-foreground text-xs">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <Progress value={progress.percentage} aria-label="Lab progress" />
        {/* Small-screen toggle; the rail stays open on large screens. */}
        <CollapsibleTrigger
          className="border-border text-foreground flex items-center justify-between rounded-md border px-3 py-2 text-sm lg:hidden"
          aria-label="Toggle milestone list"
        >
          <span className="truncate">{currentMeta?.title ?? "Milestones"}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="lg:!block">
        <ol className="flex flex-col gap-1">
          {milestones.map((m) => {
            const status = statusOf(m.kind)
            const isCurrent = m.kind === current
            const isNext = m.kind === nextKind
            return (
              <li key={m.kind}>
                <button
                  type="button"
                  onClick={() => goToMilestone(m.kind)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  <StatusMarker status={status} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-foreground" : "text-foreground/80"
                      )}
                    >
                      {m.title}
                    </span>
                    {/* P3: the "why" line. For the next milestone, frame it as
                        what you'll do. */}
                    <span className="text-muted-foreground text-xs">
                      {isNext ? `Next: ${m.purpose}` : m.purpose}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}
