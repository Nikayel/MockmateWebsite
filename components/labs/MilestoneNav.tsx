"use client"

/**
 * MilestoneNav — Back / Next controls for soft milestone navigation (P1).
 *
 * Complements the rail's click-to-jump: stations render this footer so the
 * user always has a clear forward path (P5: momentum) without hard gating —
 * nothing blocks moving on, the buttons just disable at the ends.
 */

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MILESTONE_ORDER, useCaseLabStore } from "@/lib/stores/case-lab-store"
import { trackCaseLabMilestoneCompleted } from "@/lib/labs/case-lab-analytics"

export function MilestoneNav({ className }: { className?: string }) {
  const current = useCaseLabStore((s) => s.getCurrentMilestone())
  const caseLabId = useCaseLabStore((s) => s.activeRun?.caseLabId)
  const goToNextMilestone = useCaseLabStore((s) => s.goToNextMilestone)
  const goToPreviousMilestone = useCaseLabStore((s) => s.goToPreviousMilestone)

  if (!current) return null

  const index = MILESTONE_ORDER.indexOf(current)
  const isFirst = index <= 0
  const isLast = index >= MILESTONE_ORDER.length - 1

  const handleNext = () => {
    // Advancing past a milestone counts it as completed (soft — P1).
    if (caseLabId) {
      trackCaseLabMilestoneCompleted({ labId: caseLabId, milestone: current })
    }
    goToNextMilestone()
  }

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={goToPreviousMilestone}
        disabled={isFirst}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </Button>
      <Button type="button" size="sm" onClick={handleNext} disabled={isLast}>
        Next
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
}
