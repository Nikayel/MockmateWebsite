"use client"

/**
 * StationSwitcher — center column of the Case Lab shell.
 *
 * Morphs to render the active milestone's station (P2: one thing at a time).
 */

import { cn } from "@/lib/utils"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { MilestoneKind } from "@/lib/labs/types"
import { MilestoneNav } from "./MilestoneNav"
import { StationBriefing } from "./stations/StationBriefing"
import { ClarifyStation } from "./stations/ClarifyStation"
import { DecomposeStation } from "./stations/DecomposeStation"
import { DesignStation } from "./stations/DesignStation"
import { BuildStation } from "./stations/BuildStation"
import { ReviewStation } from "./stations/ReviewStation"

export function StationSwitcher({ className }: { className?: string }) {
  const current = useCaseLabStore((s) => s.getCurrentMilestone())

  if (!current) {
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="border-border text-muted-foreground flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-sm">
          No active milestone. Start a lab to begin.
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Per-round interviewer prompt + how-to. Kept ABOVE the station's own
          fill/scroll region so the question the candidate works against stays
          visible while a form scrolls, and so the Build station's editor still
          gets its full height (it fills the flex-1 region below). */}
      <StationBriefing kind={current} className="mb-4 shrink-0" />
      <div className="min-h-0 flex-1 overflow-y-auto">{renderStation(current)}</div>
      <MilestoneNav className="shrink-0" />
    </div>
  )
}

/** Map a milestone to its station. */
function renderStation(kind: MilestoneKind) {
  switch (kind) {
    case "clarify":
      return <ClarifyStation />
    case "decompose":
      return <DecomposeStation />
    case "design":
      return <DesignStation />
    case "build":
      return <BuildStation />
    case "review":
      return <ReviewStation />
  }
}
