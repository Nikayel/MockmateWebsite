"use client"

/**
 * CaseLabProgressBadge — gallery resume indicator. Fetches the signed-in user's
 * in-progress run for one lab and shows how far they've gotten ("Resume ·
 * Design 2/5"). Renders nothing when signed out, on error, or when there's no
 * run in progress — so the card simply reads "Start". The play route resumes the
 * run automatically, so the badge only needs to surface the state, not link.
 */

import { useEffect, useState } from "react"
import { CheckCircle2, History } from "lucide-react"
import { fetchActiveCaseLabRun } from "@/lib/labs/case-lab-runs-client"
import { MILESTONE_ORDER } from "@/lib/stores/case-lab-store"
import { DEFAULT_MILESTONE_META } from "@/lib/labs/milestones"
import type { CaseLabRun } from "@/lib/labs/types"

export function CaseLabProgressBadge({ labId }: { labId: string }) {
  const [run, setRun] = useState<CaseLabRun | null>(null)

  useEffect(() => {
    let active = true
    fetchActiveCaseLabRun(labId)
      .then((result) => {
        if (active) setRun(result)
      })
      .catch(() => {
        // Resume hints are best-effort — a failed lookup just hides the badge.
      })
    return () => {
      active = false
    }
  }, [labId])

  if (!run) return null

  // A completed run reads as "Completed" — finished work stays visible in the
  // gallery instead of silently reverting to "Start".
  if (run.status === "completed") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md border border-[var(--wb-success)]/40 px-2 py-0.5 text-xs font-medium text-[var(--wb-success)]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Completed
      </span>
    )
  }

  const doneCount = MILESTONE_ORDER.filter((kind) => run.milestoneStatus[kind] === "done").length
  const currentLabel = DEFAULT_MILESTONE_META[run.currentMilestone].title

  return (
    <span className="border-primary/30 bg-primary/5 text-primary inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium">
      <History className="h-3.5 w-3.5" aria-hidden />
      Resume · {currentLabel} ({doneCount}/{MILESTONE_ORDER.length})
    </span>
  )
}
