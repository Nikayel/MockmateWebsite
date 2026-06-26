"use client"

/**
 * CaseLabShell — the 3-column Case Lab layout.
 *
 * Reuses the `/interview` shell's column grid (rail | station | chat) so Case
 * Labs feel native. Left: MilestoneRail. Center: StationSwitcher (morphs per
 * milestone). Right: the AI interviewer — passed in via `chatSlot` so Phase 5
 * can drop in the real `InterviewerChat`; until then a placeholder holds the
 * column (P4: the AI is the spine, kept in its constant place).
 */

import type { ReactNode } from "react"
import { MilestoneRail } from "./MilestoneRail"
import { StationSwitcher } from "./StationSwitcher"
import { CaseLabBriefPanel } from "./CaseLabBrief"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import { cn } from "@/lib/utils"

function ChatPlaceholder() {
  return (
    <div className="border-border text-muted-foreground flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs">
      AI interviewer — coming soon
    </div>
  )
}

export function CaseLabShell({
  className,
  chatSlot,
}: {
  className?: string
  /** Right column content; defaults to a placeholder until the AI is wired. */
  chatSlot?: ReactNode
}) {
  const brief = useCaseLabStore((s) => s.activeLab?.brief)

  return (
    <div
      className={cn(
        "relative grid min-h-0 flex-1 gap-1.5 overflow-hidden sm:gap-2",
        "grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_240px] xl:grid-cols-[360px_minmax(0,1fr)_260px] 2xl:grid-cols-[400px_minmax(0,1fr)_280px]",
        className
      )}
    >
      <aside className="min-h-0 overflow-y-auto" aria-label="Milestones">
        <MilestoneRail />
      </aside>
      {/* Center: the problem brief stays pinned above the morphing station so the
          candidate never loses the context for what they're clarifying/building. */}
      <main className="flex min-h-0 flex-col gap-2 overflow-hidden" aria-label="Active station">
        {brief && <CaseLabBriefPanel brief={brief} className="shrink-0" />}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StationSwitcher className="h-full" />
        </div>
      </main>
      <aside className="min-h-0 overflow-y-auto" aria-label="AI interviewer">
        {chatSlot ?? <ChatPlaceholder />}
      </aside>
    </div>
  )
}
