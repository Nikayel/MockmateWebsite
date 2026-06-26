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
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--wb-border)] p-4 text-center text-xs text-[var(--wb-faint)]">
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
        "relative grid min-h-0 flex-1 overflow-hidden",
        "grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_220px]",
        className
      )}
    >
      <aside
        className="min-h-0 overflow-y-auto border-b border-[var(--wb-border)] bg-[var(--wb-sidebar)] px-3 py-4 lg:border-r lg:border-b-0"
        aria-label="Milestones"
      >
        <MilestoneRail />
      </aside>
      {/* Center: the brief collapses to a "View brief" toggle (the spec's
          progressive-disclosure default) so the active station owns the space,
          but context stays one click away on every milestone. */}
      <main
        className="flex min-h-0 flex-col overflow-hidden bg-[var(--wb-main)] px-7 py-6"
        aria-label="Active station"
      >
        {brief && <CaseLabBriefPanel brief={brief} className="mb-4 shrink-0" />}
        <StationSwitcher className="min-h-0 flex-1" />
      </main>
      <aside
        className="min-h-0 overflow-y-auto border-t border-[var(--wb-border)] bg-[var(--wb-panel)] px-3.5 py-4 lg:border-t-0 lg:border-l"
        aria-label="AI interviewer"
      >
        {chatSlot ?? <ChatPlaceholder />}
      </aside>
    </div>
  )
}
