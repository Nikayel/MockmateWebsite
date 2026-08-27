"use client"

/**
 * WorkbookOverviewShell — the workbook overview's one resume-state fetch, owning both CTA slots and
 * the arc's `currentSprint`.
 *
 * Fix round 1, I2+I3. Before this, the overview page rendered two independent
 * `WorkbookOverviewCta` instances (top and "repeat" after the arc), each running its own
 * `useAuth()` + `fetchActiveSprintLabRun` call, and `SprintMap` never received a live
 * `currentSprint` at all (its done/current markers were dead code). This component is the single
 * client boundary that owns the fetch once and threads its result to three render sites: the top
 * CTA, `SprintMap`'s `currentSprint`, and the repeat CTA. `children` is the static,
 * run-independent middle of the page (the grading panel and the objectives-by-sprint list),
 * rendered by the server and passed straight through — it needs no client state at all.
 *
 * Not used for a capability-locked workbook (`!workbookIsRunnable(summary)`): that branch has no
 * CTA and no run to speak of, so the page renders a plain `SprintMap` with no `currentSprint`
 * instead of mounting this shell.
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { fetchActiveSprintLabRun } from "@/lib/sprint-labs/runs-client"
import type { SprintPublic } from "@/lib/sprint-labs/types"
import { WorkbookOverviewCta, type RunLookupState } from "./WorkbookOverviewCta"
import { SprintMap } from "./SprintMap"

export interface WorkbookOverviewShellProps {
  workbookId: string
  sprints: SprintPublic[]
  /** The static `"N sprints - M tickets - ~H h - Level"` line rendered under the top CTA. */
  meterLine: string
  children: React.ReactNode
}

export function WorkbookOverviewShell({
  workbookId,
  sprints,
  meterLine,
  children,
}: WorkbookOverviewShellProps) {
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

  const currentSprint = state.kind === "run" ? state.run.currentSprint : undefined

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <WorkbookOverviewCta workbookId={workbookId} state={state} position="primary" />
        <p className="text-xs text-[var(--wb-text-secondary)]">{meterLine}</p>
      </div>

      {children}

      <section aria-labelledby="workbook-arc-heading" className="flex flex-col gap-4">
        <h2
          id="workbook-arc-heading"
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          The arc
        </h2>
        {sprints.length === 0 ? (
          <p className="text-sm text-[var(--wb-faint)]">
            The sprint map is not published for this workbook yet.
          </p>
        ) : (
          <SprintMap sprints={sprints} currentSprint={currentSprint} />
        )}
      </section>

      <div>
        <WorkbookOverviewCta workbookId={workbookId} state={state} position="repeat" />
      </div>
    </>
  )
}
