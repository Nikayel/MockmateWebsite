"use client"

/**
 * StationSwitcher — center column of the Case Lab shell.
 *
 * Morphs to render the active milestone's station (P2: one thing at a time).
 * Phase 1 renders a stub per milestone; later phases swap in the real Clarify /
 * Decompose / Design / Build / Review stations without changing this contract.
 */

import { cn } from "@/lib/utils"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import { DEFAULT_MILESTONE_META } from "@/lib/labs/milestones"
import type { MilestoneKind } from "@/lib/labs/types"
import { MilestoneNav } from "./MilestoneNav"

/** Placeholder station — replaced by real stations in Phases 2–3. */
function StationStub({ kind }: { kind: MilestoneKind }) {
  const lab = useCaseLabStore((s) => s.activeLab)
  const fromLab = lab?.milestones.find((m) => m.kind === kind)
  const meta = fromLab ?? DEFAULT_MILESTONE_META[kind]

  return (
    <section
      aria-labelledby="station-title"
      className="border-border flex h-full flex-col gap-2 rounded-lg border border-dashed p-6"
    >
      <h2 id="station-title" className="text-foreground text-lg font-semibold">
        {meta.title}
      </h2>
      <p className="text-muted-foreground text-sm">{meta.purpose}</p>
      <p className="text-muted-foreground/70 mt-4 text-xs">This station is coming soon.</p>
    </section>
  )
}

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
    <div className={cn("flex h-full flex-col gap-3", className)}>
      <div className="min-h-0 flex-1">
        <StationStub kind={current} />
      </div>
      <MilestoneNav />
    </div>
  )
}
