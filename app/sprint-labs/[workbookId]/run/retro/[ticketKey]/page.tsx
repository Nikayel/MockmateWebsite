"use client"

/**
 * Sprint Labs retro — `.../run/retro/[ticketKey]` (UX-SPEC.md §10, screen 9).
 *
 * A run-LEAF, not nested under `run/ticket/[ticketKey]/` — fix round 1: RULING R25 + Task 12's
 * workspace + this task's own summary screen all use run-leaves, superseding UX-SPEC.md §1.2's
 * original nested routing table. `run/ticket/[ticketKey]/page.tsx` (screen 5) is unaffected.
 *
 * Same shape as the ticket screen: one `useActiveSprintLabRun` call, `run.board[ticketKey]`
 * is the source of truth for whether this ticket exists on this run, and the Pro wall gates the same way.
 * Unlike submit/review, this screen never opens or completes an attempt — it only reads.
 */

import { useEffect, useMemo } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import { getWorkbookSummary } from "@/lib/sprint-labs/content/registry"
import { sprintRequiresPro } from "@/lib/sprint-labs/entitlements"
import { useActiveSprintLabRun } from "@/components/sprint-labs/useActiveSprintLabRun"
import { useSprintLabProEntitlement } from "@/components/sprint-labs/useSprintLabProEntitlement"
import { SprintLabTopBar } from "@/components/sprint-labs/ui/SprintLabTopBar"
import { SprintLabProWall } from "@/components/sprint-labs/ui/SprintLabProWall"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { RetroView } from "@/components/sprint-labs/retro/RetroView"
import { useTicketRetro } from "@/components/sprint-labs/retro/useTicketRetro"

export default function SprintLabRetroPage() {
  const params = useParams<{ workbookId: string; ticketKey: string }>()
  const workbookId = params?.workbookId ?? ""
  const ticketKey = params?.ticketKey ?? ""
  const router = useRouter()

  const summary = useMemo(() => getWorkbookSummary(workbookId), [workbookId])
  const [runState] = useActiveSprintLabRun(workbookId)
  const run = runState.kind === "run" ? runState.run : null

  useEffect(() => {
    if (runState.kind === "no-run") router.replace(`/sprint-labs/${workbookId}/run/standup`)
  }, [runState.kind, workbookId, router])

  const requiresPro = run !== null && sprintRequiresPro(run.currentSprint)
  const entitlement = useSprintLabProEntitlement(requiresPro)

  const retroState = useTicketRetro({
    workbookId,
    ticketKey,
    runId: run?.id ?? null,
    board: run?.board ?? null,
  })

  if (!summary) notFound()

  if (runState.kind === "loading" || runState.kind === "no-run") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar
          workbookTitle={summary.title}
          backLabel="Board"
          sprintNumber={1}
          sprintCount={summary.sprintCount}
          ticketKey={ticketKey}
          backHref={`/sprint-labs/${summary.id}/run/board`}
        />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading…" />
        </div>
      </div>
    )
  }

  if (!run) return null // signed-out: SprintLabAuthGuard is already redirecting.

  if (!(ticketKey in run.board)) notFound()

  const topBarCommon = {
    workbookTitle: summary.title,
    backLabel: "Board",
    sprintNumber: run.currentSprint,
    sprintCount: summary.sprintCount,
    ticketKey,
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
          <RetroView workbookId={summary.id} ticketKey={ticketKey} state={retroState} />
        </div>
      </div>
    </div>
  )
}
