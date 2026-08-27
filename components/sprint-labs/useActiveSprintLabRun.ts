"use client"

/**
 * useActiveSprintLabRun — the one-fetch run-state hook for the auth-gated `run/**` screens.
 *
 * Extracted from `components/sprint-labs/catalog/WorkbookOverviewShell.tsx`'s inline effect (Task
 * 10), which established the canonical shape: fetch the active run exactly once per page, expose a
 * small state machine (`loading | signed-out | no-run | run`), and never let two mounted slots race
 * two independent fetches (UX-SPEC.md §16.1(b), the one-Sparra-per-screen brand rule's root cause).
 * Standup, board and ticket each mount this once; none of them re-implements the effect.
 *
 * Returns a `[state, setState]` tuple, not just `state`, for one reason: the standup screen is the
 * only place in the app that can CREATE a run (a first-time visitor's "no-run" state), and after
 * `startSprintLabRun` resolves it needs to fold the freshly-created run straight into this same state
 * machine without a second round-trip through `fetchActiveSprintLabRun`. Board and ticket only ever
 * read the state half of the tuple.
 *
 * Reuses `RunLookupState` from `WorkbookOverviewCta` (a type-only import — this never edits that
 * file) rather than redeclaring an equivalent union, so the public overview and the run surface can
 * never quietly drift onto two different definitions of "what a run lookup can resolve to."
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { fetchActiveSprintLabRun } from "@/lib/sprint-labs/runs-client"
import type { RunLookupState } from "@/components/sprint-labs/catalog/WorkbookOverviewCta"

export type { RunLookupState } from "@/components/sprint-labs/catalog/WorkbookOverviewCta"

export function useActiveSprintLabRun(
  workbookId: string
): [RunLookupState, React.Dispatch<React.SetStateAction<RunLookupState>>] {
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

  return [state, setState]
}
