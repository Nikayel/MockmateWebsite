"use client"

/**
 * Sprint Labs standup — `.../run/standup` (UX-SPEC.md §4, screen 3).
 *
 * "Start the sprint in fiction." One route (no sprint-number segment, per UX-SPEC.md §1.2's own
 * routing table), so this always renders whatever sprint the resolved run's `currentSprint` says is
 * current — there is no way to revisit an EARLIER sprint's standup from a URL this task owns (see
 * this file's own note below; recorded as a scope gap rather than guessed at).
 *
 * **Run creation lives here, and only here.** `WorkbookOverviewCta`'s "no-run" state (Task 10) links
 * straight to this route without creating a run first, so the first screen a brand-new learner lands
 * on with no run yet IS this one. Creating one needs `ticketKeys` for sprint 1
 * (`createSprintLabRunInputSchema` requires a non-empty array), and there is no per-sprint
 * ticket-key API anywhere in the compiled registry (`lib/sprint-labs/runs.ts`'s own
 * `requireKnownWorkbookAndTickets` doc comment names this exact gap: "there is no exposed 'ticket
 * keys for sprint N' lookup"). This falls back to every ticket key the compiled workbook has at all
 * (`Object.keys(content.ticketsByKey)`) — exactly correct for a single-sprint compiled workbook
 * (`fixture-demo`, the only one that exists today) and a documented interim limitation once a
 * multi-sprint workbook compiles (it would over-seed later sprints' tickets onto sprint 1's board).
 * `contentVersion` has no authored source on `WorkbookSummary` either; a placeholder string is used
 * (matching the literal `"v1"` already used by this feature's own route/service tests).
 */

import { useEffect, useMemo, useState } from "react"
import { notFound, useParams } from "next/navigation"
import Link from "next/link"
import {
  getWorkbookSummary,
  getSprint,
  loadWorkbookContent,
} from "@/lib/sprint-labs/content/registry"
import { sprintRequiresPro } from "@/lib/sprint-labs/entitlements"
import { startSprintLabRun } from "@/lib/sprint-labs/runs-client"
import { useActiveSprintLabRun } from "@/components/sprint-labs/useActiveSprintLabRun"
import { useSprintLabProEntitlement } from "@/components/sprint-labs/useSprintLabProEntitlement"
import { SprintLabTopBar } from "@/components/sprint-labs/ui/SprintLabTopBar"
import { SprintLabProWall } from "@/components/sprint-labs/ui/SprintLabProWall"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { SlackQuote } from "@/components/sprint-labs/ui/SlackQuote"
import { ArchMapDelta } from "@/components/sprint-labs/ui/ArchMapDelta"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/objective-view"
import { Button } from "@/components/ui/button"
import type { SprintPublic } from "@/lib/sprint-labs/types"

/** No authored content-versioning scheme exists yet; matches the literal used in this feature's own
 *  service/route tests (`contentVersion: "v1"`). Replace once a real scheme lands. */
const SPRINT_LAB_CONTENT_VERSION_PLACEHOLDER = "v1"

const STALE_VISIT_DAYS = 14

const CTA_BUTTON_CLASS =
  "h-11 bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)] hover:bg-[var(--wb-accent-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"

export default function SprintLabStandupPage() {
  const params = useParams<{ workbookId: string }>()
  const workbookId = params?.workbookId ?? ""

  const summary = useMemo(() => getWorkbookSummary(workbookId), [workbookId])
  const [runState, setRunState] = useActiveSprintLabRun(workbookId)
  const run = runState.kind === "run" ? runState.run : null

  // First-time visitor: create the run for sprint 1. See this file's header for the ticketKeys gap.
  const [creationFailed, setCreationFailed] = useState(false)
  const [creationAttempt, setCreationAttempt] = useState(0)
  useEffect(() => {
    if (runState.kind !== "no-run") return
    let cancelled = false
    setCreationFailed(false)
    ;(async () => {
      const content = await loadWorkbookContent(workbookId)
      const ticketKeys = content ? Object.keys(content.ticketsByKey) : []
      if (!content || ticketKeys.length === 0) {
        if (!cancelled) setCreationFailed(true)
        return
      }
      const created = await startSprintLabRun({
        workbookId,
        contentVersion: SPRINT_LAB_CONTENT_VERSION_PLACEHOLDER,
        ticketKeys,
      })
      if (cancelled) return
      if (!created) {
        setCreationFailed(true)
        return
      }
      setRunState({ kind: "run", run: created })
    })()
    return () => {
      cancelled = true
    }
  }, [runState.kind, workbookId, creationAttempt, setRunState])

  const requiresPro = run !== null && sprintRequiresPro(run.currentSprint)
  const entitlement = useSprintLabProEntitlement(requiresPro)

  const [sprint, setSprint] = useState<SprintPublic | null | undefined>(undefined)
  const [sprintLoadFailed, setSprintLoadFailed] = useState(false)
  const [sprintReloadToken, setSprintReloadToken] = useState(0)

  useEffect(() => {
    if (!run) return
    let cancelled = false
    setSprint(undefined)
    setSprintLoadFailed(false)
    getSprint(workbookId, run.currentSprint)
      .then((found) => {
        if (!cancelled) setSprint(found ?? null)
      })
      .catch(() => {
        if (!cancelled) setSprintLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [run, workbookId, sprintReloadToken])

  if (!summary) notFound()

  const topBarBase = {
    workbookTitle: summary.title,
    sprintCount: summary.sprintCount,
    backHref: `/sprint-labs/${summary.id}`,
  }

  if (runState.kind === "loading") {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBarBase} sprintNumber={1} />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading standup…" />
        </div>
      </div>
    )
  }

  if (runState.kind === "signed-out") return null // SprintLabAuthGuard is already redirecting.

  if (runState.kind === "no-run") {
    if (creationFailed) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBarBase} sprintNumber={1} />
          <div className="flex flex-1 items-center justify-center p-6">
            <SprintLabErrorPanel
              message="Couldn't start this workbook."
              onRetry={() => setCreationAttempt((n) => n + 1)}
            />
          </div>
        </div>
      )
    }
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBarBase} sprintNumber={1} />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading standup…" />
        </div>
      </div>
    )
  }

  if (!run) return null

  const topBar = { ...topBarBase, sprintNumber: run.currentSprint }

  if (requiresPro) {
    if (entitlement.isPro === null) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBar} />
          <div className="flex flex-1 items-center justify-center">
            <SparraLoader label="Checking your plan…" />
          </div>
        </div>
      )
    }
    if (entitlement.entitlementFailed) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBar} />
          <div className="flex flex-1 items-center justify-center p-6">
            <SprintLabErrorPanel message="Couldn't check your plan." onRetry={entitlement.retry} />
          </div>
        </div>
      )
    }
    if (!entitlement.isPro) {
      return (
        <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
          <SprintLabTopBar {...topBar} />
          <div className="flex flex-1 items-start justify-center p-6">
            <div className="w-full max-w-[640px]">
              <SprintLabProWall
                sprintNumber={run.currentSprint}
                sprintTitle={sprint?.title}
                sprintGoal={sprint?.goal}
              />
            </div>
          </div>
        </div>
      )
    }
  }

  if (sprint === undefined) {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBar} />
        <div className="flex flex-1 items-center justify-center">
          <SparraLoader label="Loading standup…" />
        </div>
      </div>
    )
  }

  if (sprintLoadFailed || sprint === null) {
    return (
      <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <SprintLabTopBar {...topBar} />
        <div className="flex flex-1 items-center justify-center p-6">
          <SprintLabErrorPanel
            message={
              sprint === null ? "This sprint isn't published yet." : "Couldn't load the standup."
            }
            onRetry={() => setSprintReloadToken((n) => n + 1)}
          />
        </div>
      </div>
    )
  }

  const boardHref = `/sprint-labs/${summary.id}/run/board`
  const revisited = Object.values(run.board).some((status) => status !== "todo")
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(run.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isStaleReturn = daysSinceUpdate >= STALE_VISIT_DAYS
  const objectives = sprint.objectives.map(toNotStartedObjectiveView)

  return (
    <div className="flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
      <SprintLabTopBar {...topBar} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 p-6">
          {isStaleReturn && (
            <p className="text-xs text-[var(--wb-text-secondary)]">
              You were last here {daysSinceUpdate} days ago. This is where the sprint stood.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
              Sprint {sprint.number}
            </span>
            <h1 className="text-xl leading-snug font-bold text-[var(--wb-text)] sm:text-2xl">
              {sprint.title}
            </h1>
          </div>

          <SlackQuote body={sprint.standupQuote} />

          <section aria-labelledby="standup-goal-heading" className="flex flex-col gap-2">
            <h2
              id="standup-goal-heading"
              className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
            >
              Sprint goal
            </h2>
            <p className="text-sm leading-relaxed text-[var(--wb-text)]">{sprint.goal}</p>
          </section>

          <section aria-labelledby="standup-archmap-heading" className="flex flex-col gap-3">
            <h2
              id="standup-archmap-heading"
              className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
            >
              What changed in the system
            </h2>
            <ArchMapDelta delta={sprint.archMapDelta} sprintNumber={sprint.number} />
          </section>

          {objectives.length > 0 && (
            <ObjectiveList
              heading="By Friday you can"
              headingLevel="h2"
              density="full"
              objectives={objectives}
            />
          )}

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--wb-border)] pt-4">
            <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
              <Link href={boardHref}>{revisited ? "Back to the board" : "Open the board"}</Link>
            </Button>
            {sprint.ticketCount !== undefined && sprint.points !== undefined && (
              <span className="text-xs text-[var(--wb-text-secondary)]">
                {sprint.ticketCount} {sprint.ticketCount === 1 ? "ticket" : "tickets"} ·{" "}
                {sprint.points} {sprint.points === 1 ? "point" : "points"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
