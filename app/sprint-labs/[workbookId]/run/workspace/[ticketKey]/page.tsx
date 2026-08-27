"use client"

/**
 * Sprint Labs workspace — `.../run/workspace/[ticketKey]` (UX-SPEC.md §7, screen 6).
 *
 * Segment shape per RULING R25 (progress.md): the ticket route segment is `[ticketKey]` EVERYWHERE
 * under `run/`, and workspace/submit/review/retro are DISJOINT LEAF segments directly under `run/`
 * (`run/workspace/[ticketKey]/`), not nested under `run/ticket/[ticketKey]/`. UX-SPEC.md §1.2's own
 * routing table names `run/ticket/[key]/workspace/` — superseded, per the same ruling.
 *
 * Same shape as Task 11's standup/board/ticket pages (one `useActiveSprintLabRun` call backs the
 * whole screen, `run.board[ticketKey]` is the source of truth for "does this ticket exist on this
 * run," the Pro wall applies uniformly keyed off `run.currentSprint`). The only screen-6-specific
 * addition is `knowledgeOpen`, which this page owns because the button that opens it lives in this
 * page's own `SprintLabTopBar` mount (`rightSlot`), outside `WorkspaceView`'s subtree.
 *
 * `content.ticket.ticket.playable === false` (a compiled content stub) short-circuits before
 * `WorkspaceView` ever mounts, rendering `TicketNotPlayablePanel` instead — see that guard's own
 * comment below. This keeps a stub from ever reaching `WorkspaceView` with an empty seed/file tree.
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
import { WorkspaceView } from "@/components/sprint-labs/workspace/WorkspaceView"
import { WorkspaceKnowledgeButton } from "@/components/sprint-labs/workspace/WorkspaceKnowledgeButton"
import { TicketNotPlayablePanel } from "@/components/sprint-labs/ui/TicketNotPlayablePanel"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"

type WorkspaceContentState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; ticket: CompiledTicket | null }

export default function SprintLabWorkspacePage() {
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

  const [content, setContent] = useState<WorkspaceContentState>({ kind: "loading" })
  const [reloadToken, setReloadToken] = useState(0)
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)

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

  const backHref = `/sprint-labs/${summary.id}/run/ticket/${ticketKey}`

  if (runState.kind === "loading" || runState.kind === "no-run") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar
          workbookTitle={summary.title}
          backLabel={ticketKey}
          sprintNumber={1}
          sprintCount={summary.sprintCount}
          ticketKey={ticketKey}
          backHref={backHref}
        />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Opening workspace…" />
        </div>
      </div>
    )
  }

  if (!run) return null // signed-out: SprintLabAuthGuard is already redirecting.

  // Not tracked on this run's board: either an unknown key, or a sprint not reached yet. Either way
  // this is a 404, never a 200 panel (UX-SPEC.md §6 States, "not found" — the same rule the ticket
  // screen applies).
  if (!(ticketKey in run.board)) notFound()

  const topBarCommon = {
    workbookTitle: summary.title,
    backLabel: ticketKey,
    sprintNumber: run.currentSprint,
    sprintCount: summary.sprintCount,
    ticketKey,
    backHref,
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
          <SparraLoader label="Opening workspace…" />
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

  // A compiled content stub (no reference.diff/rubric.yaml yet — TicketPublic.playable's own doc
  // comment) has no editable seed and no sealed bundle. Mounting WorkspaceView for one would render
  // an empty file tree rather than a broken-but-plausible workspace, so this guard replaces the
  // whole editor mount with an honest "not playable yet" panel instead. `undefined` (every ticket
  // compiled before this field existed) reads the same as `true` — the check is strictly `=== false`.
  if (content.ticket.ticket.playable === false) {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBarCommon} />
        <TicketNotPlayablePanel />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
      <SprintLabTopBar
        {...topBarCommon}
        rightSlot={<WorkspaceKnowledgeButton onClick={() => setKnowledgeOpen(true)} />}
      />
      <WorkspaceView
        workbookId={summary.id}
        run={run}
        ticketKey={ticketKey}
        compiledTicket={content.ticket}
        knowledgeOpen={knowledgeOpen}
        onKnowledgeOpenChange={setKnowledgeOpen}
      />
    </div>
  )
}
