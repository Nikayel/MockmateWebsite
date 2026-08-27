"use client"

/**
 * SubmitView — screen 7's content (UX-SPEC.md §8), the run's rendering half
 * of `useSubmitScreenController`'s state. Single column, `max-w-[720px]`.
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SANDBOX_NOTICE } from "./sandbox-notice"
import { GateSequence } from "./GateSequence"
import { formatCountdown } from "./format-countdown"
import type { SubmitScreenState } from "./useSubmitScreenController"

export interface SubmitViewProps {
  workbookId: string
  ticketKey: string
  state: SubmitScreenState
}

const PANEL_CLASS =
  "flex flex-col gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-5"

export function SubmitView({ workbookId, ticketKey, state }: SubmitViewProps) {
  const boardHref = `/sprint-labs/${workbookId}/run/board`
  const retroHref = `/sprint-labs/${workbookId}/run/retro/${ticketKey}`
  const reviewHref = `/sprint-labs/${workbookId}/run/review/${ticketKey}`

  if (state.phase === "loading") return null

  if (state.phase === "confirm-first") {
    return (
      <div className={PANEL_CLASS} role="note">
        <p className="text-sm font-medium text-[var(--wb-text)]">
          This finalizes your score for {ticketKey}.
        </p>
        <p className="text-sm text-[var(--wb-text-secondary)]">
          Your score for this ticket is set by this run. Escaped defect names and the reference diff
          unlock after it. Re-attempts get a different hidden set and are labeled practice.
        </p>
        <Button onClick={state.start} className="w-fit">
          Submit {ticketKey}
        </Button>
      </div>
    )
  }

  if (state.phase === "confirm-practice") {
    return (
      <div className={PANEL_CLASS} role="note">
        <p className="text-sm font-medium text-[var(--wb-text)]">
          Your finalized result for {ticketKey} is not available in this browser session.
        </p>
        <p className="text-sm text-[var(--wb-text-secondary)]">
          Practice run. Your finalized score for {ticketKey} does not change. Different hidden set.
        </p>
        <Button onClick={state.start} className="w-fit">
          Run practice attempt
        </Button>
      </div>
    )
  }

  if (state.phase === "budget-exceeded") {
    return (
      <div className={PANEL_CLASS} role="note">
        <p className="text-sm font-medium text-[var(--wb-text)]">
          No submissions left on {ticketKey}. This ticket&apos;s score is already set.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link href={retroHref}>See the retro</Link>
        </Button>
      </div>
    )
  }

  if (state.phase === "cooldown") {
    return (
      <div className={PANEL_CLASS} role="note">
        <p className="text-sm font-medium text-[var(--wb-text)]">
          Next submission in {formatCountdown(state.cooldownSecondsRemaining)}.
        </p>
        <Button
          onClick={state.start}
          disabled={state.cooldownSecondsRemaining > 0}
          className="w-fit"
        >
          Submit {ticketKey}
        </Button>
      </div>
    )
  }

  if (state.phase === "error") {
    return (
      <SprintLabErrorPanel
        message={state.errorMessage ?? "Something went wrong."}
        onRetry={state.retry}
      />
    )
  }

  // "active": queued, revealing, or fully settled — GateSequence owns all three sub-states.
  const settled = state.gateResults !== null
  // `finalized` is the server's own authoritative signal (attempts-service.ts: true on exactly the
  // first completion ever for this ticket) — never re-derive "is this a re-attempt" from
  // `submissionsRemaining`, which encodes SPRINT_LAB_SUBMISSION_BUDGET as a magic literal that would
  // silently mislabel every submission the day that budget changes.
  const isReattempt = settled && state.finalized === false

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-xs text-[var(--wb-text-secondary)]">{SANDBOX_NOTICE}</p>

      {isReattempt && (
        <div className="rounded-lg border border-[var(--wb-accent)] bg-[var(--wb-accent-soft)] px-4 py-2.5">
          <p className="text-sm text-[var(--wb-accent-strong)]">
            Practice run. Different hidden set. Your finalized score for {ticketKey} does not
            change.
          </p>
        </div>
      )}

      {settled && state.aiPolicy === "assisted" && (
        <div className="rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] px-4 py-2.5">
          <p className="text-sm text-[var(--wb-text-secondary)]">
            Assisted attempt. This result is feedback and does not feed your readiness score.
          </p>
        </div>
      )}

      <GateSequence
        ticketKey={ticketKey}
        gateResults={state.gateResults}
        escapedDefects={state.escapedDefects}
      />

      {state.gateResults !== null && (
        <div className="flex flex-col items-center gap-3 border-t border-[var(--wb-border)] pt-5">
          {state.submissionsRemaining !== null && (
            <p className="text-xs text-[var(--wb-text-secondary)]">
              {state.submissionsRemaining} submission
              {state.submissionsRemaining === 1 ? "" : "s"} left on {ticketKey}.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button asChild className="bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)]">
              <Link href={state.reviewComments?.length ? reviewHref : retroHref}>
                {state.reviewComments?.length ? "See the review" : "See the retro"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={boardHref}>Back to the board</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
