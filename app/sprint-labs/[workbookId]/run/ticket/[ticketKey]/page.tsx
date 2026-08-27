"use client"

/**
 * Sprint Labs ticket — `.../run/ticket/[ticketKey]` (UX-SPEC.md §6, screen 5).
 *
 * Client page, same shape as the board and standup screens (one `useActiveSprintLabRun` call backs
 * the whole screen). `run.board[ticketKey]` is the source of truth for BOTH "does this ticket exist
 * on this run" and "which sprint (roughly) is it in": there is no ticket-to-sprint field anywhere in
 * the compiled registry (the same gap `board/page.tsx` documents), so a ticket key absent from
 * `run.board` reads as `notFound()` — this is correct whether the key is simply wrong or belongs to a
 * sprint the learner has not reached yet, and it never needs a separate per-sprint lookup to decide.
 *
 * The Pro wall applies uniformly with the board and standup screens, keyed off the RUN's
 * `currentSprint` (not a per-ticket sprint number, which does not exist) — per the brief, all three
 * screens gate the same way rather than the ticket screen inventing a narrower "already-reached
 * tickets stay open" carve-out the spec does not actually bless either way.
 */

import { useEffect, useMemo, useState } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import { getWorkbookSummary, getTicket } from "@/lib/sprint-labs/content/registry"
import { sprintRequiresPro } from "@/lib/sprint-labs/entitlements"
import { useActiveSprintLabRun } from "@/components/sprint-labs/useActiveSprintLabRun"
import { useSprintLabProEntitlement } from "@/components/sprint-labs/useSprintLabProEntitlement"
import { SprintLabTopBar } from "@/components/sprint-labs/ui/SprintLabTopBar"
import { SprintLabProWall } from "@/components/sprint-labs/ui/SprintLabProWall"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { TicketView } from "@/components/sprint-labs/ticket/TicketView"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"

type TicketContentState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; ticket: CompiledTicket | null }

export default function SprintLabTicketPage() {
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

  const [content, setContent] = useState<TicketContentState>({ kind: "loading" })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!run) return
    if (!(ticketKey in run.board)) return // not on this board — handled below as notFound()
    let cancelled = false
    setContent({ kind: "loading" })
    getTicket(workbookId, ticketKey)
      .then((ticket) => {
        if (!cancelled) setContent({ kind: "ready", ticket: ticket ?? null })
      })
      .catch(() => {
        if (!cancelled) setContent({ kind: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [run, workbookId, ticketKey, reloadToken])

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
          <SparraLoader label="Loading the ticket…" />
        </div>
      </div>
    )
  }

  if (!run) return null // signed-out: SprintLabAuthGuard is already redirecting.

  // Not tracked on this run's board: either an unknown key, or a sprint not reached yet. Either way
  // this is a 404, never a 200 panel (UX-SPEC.md §6 States, "not found").
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

  if (content.kind === "loading") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBarCommon} />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading the ticket…" />
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
            message="Couldn't load this ticket."
            onRetry={() => setReloadToken((n) => n + 1)}
          />
        </div>
      </div>
    )
  }

  if (!content.ticket) notFound()

  return (
    <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
      <SprintLabTopBar {...topBarCommon} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-[1080px]">
          <TicketView
            workbookId={summary.id}
            ticket={content.ticket.ticket}
            status={run.board[ticketKey]}
          />
        </div>
      </div>
    </div>
  )
}
