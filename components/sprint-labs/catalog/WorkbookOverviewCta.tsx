"use client"

/**
 * WorkbookOverviewCta — the workbook overview's primary CTA, resume-aware.
 *
 * UX-SPEC.md §3 "States" / §12.1-§12.2. A signed-in visitor's run (if any) decides the CTA text:
 * not enrolled, resume mid-ticket, or workbook complete. Client-side because it needs `useAuth()`
 * and one authenticated call (`fetchActiveSprintLabRun`, lib/sprint-labs/runs-client.ts) that a
 * static/ISR server page cannot make.
 *
 * State mapping, derived only from the fields `SprintLabRun` actually carries (no sprint-to-ticket
 * association exists to infer anything finer):
 *  - `status === "completed"` -> "See your summary" (screen 10).
 *  - `in_progress` with a `currentTicketKey` -> "Resume: <ticketKey>" + a "Go to board" link.
 *  - `in_progress` with no `currentTicketKey` -> "Start sprint <currentSprint> standup". This
 *    covers both "just enrolled, no ticket picked yet" and "sprint complete, next standup is next"
 *    (UX-SPEC.md's "enrolled, sprint complete" state) — the run schema doesn't distinguish them
 *    further, and both want the same CTA.
 *
 * `fetchActiveSprintLabRun` collapses "no run", "signed out" and "request failed" all to `null`
 * (lib/sprint-labs/runs-client.ts's documented graceful-degradation contract, mirroring Case Labs'
 * own resume fetch). That means a failed fetch is indistinguishable from "not enrolled" here and
 * renders the same marketing state rather than a dedicated error panel — flagged in
 * task-10-report.md rather than guessing at a client-visible distinction the fetch wrapper doesn't
 * expose.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { fetchActiveSprintLabRun, type SprintLabRunRecord } from "@/lib/sprint-labs/runs-client"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { Button } from "@/components/ui/button"

export interface WorkbookOverviewCtaProps {
  workbookId: string
}

type RunLookupState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "no-run" }
  | { kind: "run"; run: SprintLabRunRecord }

const CTA_BUTTON_CLASS =
  "h-11 bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)] hover:bg-[var(--wb-accent-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"

const SECONDARY_LINK_CLASS =
  "text-sm font-medium text-[var(--wb-text-secondary)] hover:text-[var(--wb-accent-strong)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"

export function WorkbookOverviewCta({ workbookId }: WorkbookOverviewCtaProps) {
  const { user, initialized } = useAuth()
  const [state, setState] = useState<RunLookupState>({ kind: "loading" })

  useEffect(() => {
    if (!initialized) return
    if (!user) {
      setState({ kind: "signed-out" })
      return
    }
    let cancelled = false
    setState({ kind: "loading" })
    fetchActiveSprintLabRun(workbookId).then((run) => {
      if (cancelled) return
      setState(run ? { kind: "run", run } : { kind: "no-run" })
    })
    return () => {
      cancelled = true
    }
  }, [initialized, user, workbookId])

  const runPath = `/sprint-labs/${workbookId}/run`
  const loginRedirect = `/login?redirect=${encodeURIComponent(`${runPath}/standup`)}`

  if (state.kind === "loading") {
    return <SparraLoader label="Checking your progress" size={28} className="justify-start py-0" />
  }

  if (state.kind === "signed-out") {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
          <Link href={loginRedirect}>Sign in to start</Link>
        </Button>
        <p className="text-xs text-[var(--wb-text-secondary)]">
          Free for signed in users. Sprints 2 to 10 need Pro.
        </p>
      </div>
    )
  }

  if (state.kind === "no-run") {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
          <Link href={`${runPath}/standup`}>Start sprint 1</Link>
        </Button>
        <p className="text-xs text-[var(--wb-text-secondary)]">
          Free for signed in users. Sprints 2 to 10 need Pro.
        </p>
      </div>
    )
  }

  const { run } = state

  if (run.status === "completed") {
    return (
      <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
        <Link href={`${runPath}/summary`}>See your summary</Link>
      </Button>
    )
  }

  if (run.currentTicketKey) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
          <Link href={`${runPath}/ticket/${run.currentTicketKey}`}>
            Resume: {run.currentTicketKey}
          </Link>
        </Button>
        <Link href={`${runPath}/board`} className={SECONDARY_LINK_CLASS}>
          Go to board
        </Link>
      </div>
    )
  }

  return (
    <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
      <Link href={`${runPath}/standup`}>Start sprint {run.currentSprint} standup</Link>
    </Button>
  )
}
