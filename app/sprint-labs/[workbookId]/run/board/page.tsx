"use client"

/**
 * Sprint Labs board — `.../run/board` (UX-SPEC.md §5, screen 4).
 *
 * Client page (mirrors `app/labs/[labId]/page.tsx`'s shape: a run-shell page under an auth-gated,
 * force-dynamic branch has no SEO surface to protect, so there is no reason to split server/client
 * boundaries the way the public overview does). One `useActiveSprintLabRun` call backs the whole
 * screen — the top bar's sprint pill, the progress header, and the board itself all read the same
 * resolved run (UX-SPEC.md §16.1(b)).
 *
 * Board content is derived entirely from `run.board`: every ticket key the run currently tracks, its
 * status, and that ticket's compiled public content (title/points/labels/policy/objectives). There is
 * no per-sprint ticket-key API anywhere in the compiled registry (`lib/sprint-labs/runs.ts`'s own
 * `requireKnownWorkbookAndTickets` doc comment names this same gap), so "every key in `run.board`" is
 * read as "this sprint's board" — exactly correct for every workbook compiled today (`fixture-demo`
 * has one sprint), and the safe degrade once a multi-sprint workbook exists (a stale earlier sprint's
 * DONE tickets stay on the board rather than disappearing).
 */

import { useEffect, useMemo, useState } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getWorkbookSummary, getSprint, getTicket } from "@/lib/sprint-labs/content/registry"
import { sprintRequiresPro } from "@/lib/sprint-labs/entitlements"
import { useActiveSprintLabRun } from "@/components/sprint-labs/useActiveSprintLabRun"
import { useSprintLabProEntitlement } from "@/components/sprint-labs/useSprintLabProEntitlement"
import { SprintLabTopBar } from "@/components/sprint-labs/ui/SprintLabTopBar"
import { SprintLabProWall } from "@/components/sprint-labs/ui/SprintLabProWall"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"
import { SprintBoard } from "@/components/sprint-labs/board/SprintBoard"
import type { TicketCardView } from "@/components/sprint-labs/board/types"
import type { SprintPublic, TicketBoardStatus } from "@/lib/sprint-labs/types"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"

type BoardContentState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sprint: SprintPublic | null; tickets: Record<string, CompiledTicket> }

export default function SprintLabBoardPage() {
  const params = useParams<{ workbookId: string }>()
  const workbookId = params?.workbookId ?? ""
  const router = useRouter()

  const summary = useMemo(() => getWorkbookSummary(workbookId), [workbookId])
  const [runState] = useActiveSprintLabRun(workbookId)
  const run = runState.kind === "run" ? runState.run : null

  // A fresh visitor has no run yet: standup is the only screen that creates one, so send them there.
  useEffect(() => {
    if (runState.kind === "no-run") router.replace(`/sprint-labs/${workbookId}/run/standup`)
  }, [runState.kind, workbookId, router])

  const requiresPro = run !== null && sprintRequiresPro(run.currentSprint)
  const entitlement = useSprintLabProEntitlement(requiresPro)

  const [content, setContent] = useState<BoardContentState>({ kind: "loading" })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!run) return
    let cancelled = false
    setContent({ kind: "loading" })
    const ticketKeys = Object.keys(run.board)
    Promise.all([
      getSprint(workbookId, run.currentSprint),
      Promise.all(ticketKeys.map((key) => getTicket(workbookId, key))),
    ])
      .then(([sprint, ticketList]) => {
        if (cancelled) return
        const tickets: Record<string, CompiledTicket> = {}
        ticketList.forEach((ticket, index) => {
          if (ticket) tickets[ticketKeys[index]] = ticket
        })
        setContent({ kind: "ready", sprint: sprint ?? null, tickets })
      })
      .catch(() => {
        if (!cancelled) setContent({ kind: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [run, workbookId, reloadToken])

  if (!summary) notFound()

  if (runState.kind === "loading" || runState.kind === "no-run") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar
          workbookTitle={summary.title}
          sprintNumber={1}
          sprintCount={summary.sprintCount}
          backHref={`/sprint-labs/${summary.id}`}
        />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading the board…" />
        </div>
      </div>
    )
  }

  if (!run) return null // signed-out: SprintLabAuthGuard is already redirecting.

  const backHref = `/sprint-labs/${summary.id}`
  const topBarCommon = {
    workbookTitle: summary.title,
    sprintNumber: run.currentSprint,
    sprintCount: summary.sprintCount,
    backHref,
    rightSlot: (
      <Link
        href={`/sprint-labs/${summary.id}/run/standup`}
        className="text-xs font-medium text-[var(--wb-text-secondary)] hover:text-[var(--wb-accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
      >
        Standup
      </Link>
    ),
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
      const lockedSprint = content.kind === "ready" ? content.sprint : null
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBarCommon} />
          <div className="flex flex-1 items-start justify-center p-6">
            <div className="w-full max-w-[640px]">
              <SprintLabProWall
                sprintNumber={run.currentSprint}
                sprintTitle={lockedSprint?.title}
                sprintGoal={lockedSprint?.goal}
              />
            </div>
          </div>
        </div>
      )
    }
  }

  if (content.kind === "loading") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBarCommon} />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading the board…" />
        </div>
      </div>
    )
  }

  if (content.kind === "error") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBarCommon} />
        <div className="flex flex-1 items-center justify-center p-6">
          <SprintLabErrorPanel
            message="Couldn't load the board."
            onRetry={() => setReloadToken((n) => n + 1)}
          />
        </div>
      </div>
    )
  }

  const boardEntries = Object.entries(run.board) as Array<[string, TicketBoardStatus]>
  const ticketViews: TicketCardView[] = boardEntries
    .filter(([key]) => content.tickets[key])
    .map(([key, status]) => {
      const compiled = content.tickets[key]
      return {
        key: compiled.ticket.key,
        title: compiled.ticket.title,
        points: compiled.ticket.points,
        labels: compiled.ticket.labels,
        aiPolicy: compiled.ticket.aiPolicy,
        aiPolicyReason: compiled.ticket.aiPolicyReason,
        status,
        objectives: compiled.ticket.objectives.map(toNotStartedObjectiveView),
        // No GET endpoint exists yet to read a finalized attempt's escaped-defect count.
        escapedCount: undefined,
        playable: compiled.ticket.playable,
      }
    })

  const totalPoints = ticketViews.reduce((sum, t) => sum + t.points, 0)
  const donePoints = ticketViews
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + t.points, 0)
  const allDone = ticketViews.length > 0 && ticketViews.every((t) => t.status === "done")
  const progressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  return (
    <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
      <SprintLabTopBar {...topBarCommon} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--wb-border)] pb-3">
          <p className="text-sm font-medium text-[var(--wb-text)]">
            {content.sprint?.goal ?? `Sprint ${run.currentSprint}`}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs whitespace-nowrap text-[var(--wb-text-secondary)]">
              {donePoints} of {totalPoints} points
            </span>
            <div
              role="progressbar"
              aria-label="Sprint progress"
              aria-valuenow={donePoints}
              aria-valuemin={0}
              aria-valuemax={totalPoints}
              className="h-[6px] w-32 overflow-hidden rounded-full bg-[var(--wb-track)]"
            >
              <div
                className="h-full rounded-full bg-[var(--wb-accent)] transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {allDone && (
          <div className="rounded-lg border border-[var(--wb-success)] bg-[var(--wb-panel)] p-4">
            <p className="text-sm font-medium text-[var(--wb-text)]">
              Sprint {run.currentSprint} shipped. {totalPoints} of {totalPoints} points.
            </p>
          </div>
        )}

        <SprintBoard workbookId={summary.id} tickets={ticketViews} />
      </div>
    </div>
  )
}
