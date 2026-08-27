"use client"

/**
 * Sprint Labs submit/CI — `.../run/submit/[ticketKey]` (UX-SPEC.md §8, screen 7).
 *
 * A run-LEAF, not nested under `run/ticket/[ticketKey]/` — fix round 1: RULING R25, Task 12's
 * workspace Submit button (pushes to `/run/submit/${ticketKey}`), and this task's own summary
 * screen (`run/summary`, no nesting) all use run-leaves, superseding UX-SPEC.md §1.2's original
 * nested routing table. `run/ticket/[ticketKey]/page.tsx` (screen 5) is unaffected and stays nested.
 *
 * Same shape as the ticket screen: one `useActiveSprintLabRun` call backs the whole screen,
 * `run.board[ticketKey]` is the source of truth for whether this ticket exists on this run (there
 * is no ticket-to-sprint field in the compiled registry — same documented gap the ticket screen and
 * `board/page.tsx` already carry), and the Pro wall gates the same way, keyed off the run's
 * `currentSprint`.
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
import { SubmitView } from "@/components/sprint-labs/submit/SubmitView"
import { useSubmitScreenController } from "@/components/sprint-labs/submit/useSubmitScreenController"

export default function SprintLabSubmitPage() {
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

  const boardStatus = run && ticketKey in run.board ? run.board[ticketKey] : null
  const controllerState = useSubmitScreenController({
    runId: run?.id ?? null,
    ticketKey,
    boardStatus,
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
        <div className="mx-auto flex max-w-[720px] flex-col gap-6">
          <SubmitView workbookId={summary.id} ticketKey={ticketKey} state={controllerState} />
        </div>
      </div>
    </div>
  )
}
