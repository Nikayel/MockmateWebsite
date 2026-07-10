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

import { useMemo, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { MILESTONE_ORDER, useCaseLabProgress, useCaseLabStore } from "@/lib/stores/case-lab-store"
import { DEFAULT_MILESTONE_META } from "@/lib/labs/milestones"
import type { CaseLabMilestone, MilestoneKind, MilestoneStatus } from "@/lib/labs/types"

/** Milestones from the active lab in canonical order, with a sane fallback. */
function useRailMilestones(): CaseLabMilestone[] {
  const lab = useCaseLabStore((s) => s.activeLab)
  return useMemo(() => {
    if (lab?.milestones?.length) {
      return [...lab.milestones].sort(
        (a, b) => MILESTONE_ORDER.indexOf(a.kind) - MILESTONE_ORDER.indexOf(b.kind)
      )
    }
    return MILESTONE_ORDER.map((kind) => ({ kind, ...DEFAULT_MILESTONE_META[kind] }))
  }, [lab])
}

function StatusMarker({ status }: { status: MilestoneStatus }) {
  if (status === "done") {
    return <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--wb-success)]" aria-hidden />
  }
  return (
    <span
      className={cn(
        "mt-[5px] h-2 w-2 shrink-0 rounded-full",
        status === "active" ? "bg-[var(--wb-accent)]" : "bg-[var(--wb-disabled)]"
      )}
      aria-hidden
    />
  )
}

export function MilestoneRail({ className }: { className?: string }) {
  const milestones = useRailMilestones()
  const run = useCaseLabStore((s) => s.activeRun)
  const goToMilestone = useCaseLabStore((s) => s.goToMilestone)
  const progress = useCaseLabProgress()
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
        <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
          Milestones
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="h-[3px] w-full overflow-hidden rounded-[2px] bg-[var(--wb-track)]">
            <div
              className="h-full rounded-[2px] bg-[var(--wb-accent)] transition-[width]"
              style={{ width: `${progress.percentage}%` }}
              role="progressbar"
              aria-label="Lab progress"
              aria-valuenow={progress.completed}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            />
          </div>
          <span className="text-[11px] text-[var(--wb-faint)]">
            {progress.completed} of {progress.total} complete
          </span>
        </div>
        {/* Small-screen toggle; the rail stays open on large screens. */}
        <CollapsibleTrigger
          className="flex items-center justify-between rounded-md border border-[var(--wb-border)] px-3 py-2 text-[12px] text-[var(--wb-text)] lg:hidden"
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
            const isDone = status === "done"
            const isLocked = status === "locked"
            return (
              <li key={m.kind}>
                {/* Navigation stays soft (P1): even "locked" rows are reachable —
                    the lock styling is a visual cue, not a hard gate. */}
                <button
                  type="button"
                  onClick={() => goToMilestone(m.kind)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-left transition-colors",
                    isCurrent
                      ? "border-[var(--wb-accent)] bg-[var(--wb-accent-soft)]"
                      : "border-transparent hover:bg-black/[0.03]"
                  )}
                >
                  <StatusMarker status={status} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-[12px]",
                        isCurrent && "font-medium text-[var(--wb-accent-strong)]",
                        isDone && "text-[var(--wb-success)] line-through",
                        isLocked && "text-[var(--wb-disabled)]",
                        !isCurrent && !isDone && !isLocked && "text-[var(--wb-muted)]"
                      )}
                    >
                      {m.title}
                    </span>
                    {/* P3: the "why" line. For the next milestone, frame it as
                        what you'll do. */}
                    <span className="text-[11px] leading-[1.4] text-[var(--wb-faint)]">
                      {isNext ? `Next: ${m.purpose}` : m.purpose}
                    </span>
                    {/* PF-09: name the real interview round, on the active row
                        only, so the rail stays calm. */}
                    {isCurrent && m.mapsToRound && (
                      <span className="mt-0.5 text-[10px] font-medium text-[var(--wb-accent-strong)]">
                        {m.mapsToRound}
                      </span>
                    )}
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
