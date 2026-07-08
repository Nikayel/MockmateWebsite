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
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {/* Per-round interviewer prompt + how-to, kept above every station so the
            question the candidate works against never leaves the page. */}
        <StationBriefing kind={current} className="shrink-0" />
        <div className="min-h-0">{renderStation(current)}</div>
      </div>
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
