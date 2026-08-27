"use client"

/**
 * Sprint Labs workbook summary — `.../run/summary` (UX-SPEC.md §11, screen 10). Workbook-level, not
 * ticket-scoped: no `[ticketKey]` segment, and `SprintLabTopBar` gets no `ticketKey` prop.
 *
 * Same shape as the other run screens: one `useActiveSprintLabRun` call, Pro wall keyed off the
 * run's `currentSprint` for consistency with every other screen under `run/**`.
 */

import { useEffect, useMemo } from "react"
import { notFound, useRouter, useParams } from "next/navigation"
import { getWorkbookSummary } from "@/lib/sprint-labs/content/registry"
import { sprintRequiresPro } from "@/lib/sprint-labs/entitlements"
import { useActiveSprintLabRun } from "@/components/sprint-labs/useActiveSprintLabRun"
import { useSprintLabProEntitlement } from "@/components/sprint-labs/useSprintLabProEntitlement"
import { SprintLabTopBar } from "@/components/sprint-labs/ui/SprintLabTopBar"
import { SprintLabProWall } from "@/components/sprint-labs/ui/SprintLabProWall"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { SummaryView } from "@/components/sprint-labs/summary/SummaryView"
import { useWorkbookSummaryData } from "@/components/sprint-labs/summary/useWorkbookSummaryData"

export default function SprintLabSummaryPage() {
  const params = useParams<{ workbookId: string }>()
  const workbookId = params?.workbookId ?? ""
  const router = useRouter()

  const summary = useMemo(() => getWorkbookSummary(workbookId), [workbookId])
  const [runState] = useActiveSprintLabRun(workbookId)
  const run = runState.kind === "run" ? runState.run : null

  useEffect(() => {
    if (runState.kind === "no-run") router.replace(`/sprint-labs/${workbookId}/run/standup`)
  }, [runState.kind, workbookId, router])

  const requiresPro = run !== null && sprintRequiresPro(run.currentSprint)
  const entitlement = useSprintLabProEntitlement(requiresPro)

  const summaryState = useWorkbookSummaryData(workbookId, run?.id ?? null)

  if (!summary) notFound()

  if (runState.kind === "loading" || runState.kind === "no-run") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar
          workbookTitle={summary.title}
          backLabel={summary.title}
          sprintNumber={1}
          sprintCount={summary.sprintCount}
          backHref={`/sprint-labs/${summary.id}/run/board`}
        />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading…" />
        </div>
      </div>
    )
  }

  if (!run) return null // signed-out: SprintLabAuthGuard is already redirecting.

  const topBarCommon = {
    workbookTitle: summary.title,
    backLabel: summary.title,
    sprintNumber: run.currentSprint,
    sprintCount: summary.sprintCount,
    backHref: `/sprint-labs/${summary.id}/run/board`,
  }

  if (requiresPro) {
    if (entitlement.isPro === null) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBarCommon} />
          <div className="flex flex-1 items-center justify-center">
            <SparraLoader label="Checking your plan…" />
          </div>
        </div>
      )
    }
    if (entitlement.entitlementFailed) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBarCommon} />
          <div className="flex flex-1 items-center justify-center p-6">
            <SprintLabErrorPanel message="Couldn't check your plan." onRetry={entitlement.retry} />
          </div>
        </div>
      )
    }
    if (!entitlement.isPro) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBarCommon} />
          <div className="flex flex-1 items-start justify-center p-6">
            <div className="w-full max-w-[640px]">
              <SprintLabProWall sprintNumber={run.currentSprint} />
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
      <SprintLabTopBar {...topBarCommon} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-[880px]">
          <SummaryView workbookTitle={summary.title} state={summaryState} />
        </div>
      </div>
    </div>
  )
}
