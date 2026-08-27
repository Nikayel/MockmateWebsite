"use client"

/**
 * RetroView — screen 9's content (UX-SPEC.md §10). Diff on top, prose below,
 * single column.
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { AiPolicyBanner } from "@/components/sprint-labs/ui/AiPolicyBanner"
import { DiffCompare } from "@/components/sprint-labs/review/DiffCompare"
import { EscapedDefectList } from "@/components/sprint-labs/submit/EscapedDefectList"
import type { ObjectiveState } from "@/components/sprint-labs/ui/ObjectiveChip"
import type { TicketRetroState } from "./useTicketRetro"

export interface RetroViewProps {
  workbookId: string
  ticketKey: string
  state: TicketRetroState
}

const STATE_WORD: Record<ObjectiveState, string> = {
  not_started: "not started",
  practicing: "practicing",
  demonstrated: "demonstrated",
  escaped: "escaped",
}

/**
 * No field anywhere (public content or the sealed bundle) carries a
 * per-ticket senior retrospective paragraph — `SealedRubric.notes` is
 * scoring-methodology authoring notes, a different concept, and is never
 * returned to the client by any of the three attempts endpoints regardless.
 * Flagged in the Task 13 report; rendered as the same honest "not available"
 * shape UX-SPEC.md §10 already specifies for the reference-diff gap, rather
 * than fabricated prose.
 */
const SENIOR_NOTE_NOT_AVAILABLE = "The senior's note for this ticket is not available yet."

export function RetroView({ workbookId, ticketKey, state }: RetroViewProps) {
  const boardHref = `/sprint-labs/${workbookId}/run/board`
  const submitHref = `/sprint-labs/${workbookId}/run/ticket/${ticketKey}/submit`

  if (state.phase === "loading") {
    return <SparraLoader label="Loading the retro…" />
  }

  if (state.phase === "error") {
    return <SprintLabErrorPanel message="Couldn't load this ticket." onRetry={state.retry} />
  }

  if (state.phase === "not-available") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-6">
        <p className="text-sm text-[var(--wb-text)]">
          {ticketKey} hasn&apos;t been submitted yet, or the result isn&apos;t available in this
          browser session.
        </p>
        <Button asChild>
          <Link href={submitHref}>Submit this ticket</Link>
        </Button>
      </div>
    )
  }

  // Invariant from useTicketRetro: phase is only "ready" once `cached` is set. Guarded rather than
  // asserted so a future change to that invariant fails safely here instead of throwing on `!`.
  if (!state.cached) return null

  const attempt = state.cached.outcome.attempt
  const referenceDiff = state.cached.outcome.referenceDiff ?? null
  const ticket = state.ticket
  const escapedCount = attempt.escapedDefects.length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-[var(--wb-text)]">
          {ticketKey} shipped.{" "}
          {escapedCount === 0
            ? "Nothing escaped."
            : escapedCount === 1
              ? "1 escaped defect."
              : `${escapedCount} escaped defects.`}
          {ticket && ` ${ticket.ticket.points} ${ticket.ticket.points === 1 ? "point" : "points"}.`}
        </p>
        {attempt.aiPolicy === "assisted" && (
          <p className="text-xs text-[var(--wb-text-secondary)]">
            Assisted attempt. Feedback only.
          </p>
        )}
      </div>

      {ticket?.ticket.aiPolicy === "unassisted" && (
        <AiPolicyBanner policy="unassisted" reason={ticket.ticket.aiPolicyReason} />
      )}

      <section aria-labelledby="retro-diff-heading" className="flex flex-col gap-3">
        <h2
          id="retro-diff-heading"
          className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
        >
          Diff
        </h2>
        <DiffCompare
          mode="two-pane"
          primaryDiff={null}
          primaryLabel="Your diff"
          primaryNotAvailableMessage="Your diff has no source yet — see the Task 13 report."
          secondaryDiff={referenceDiff}
          secondaryLabel="The reference"
          secondaryNotAvailableMessage="The reference diff for this ticket is not published yet."
        />
      </section>

      <section aria-labelledby="retro-escaped-heading" className="flex flex-col gap-3">
        <h2
          id="retro-escaped-heading"
          className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
        >
          What escaped
        </h2>
        <EscapedDefectList escaped={attempt.escapedDefects} />
      </section>

      <section aria-labelledby="retro-senior-heading" className="flex flex-col gap-3">
        <h2
          id="retro-senior-heading"
          className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
        >
          What a senior would have done
        </h2>
        <p className="text-sm text-[var(--wb-text-secondary)] italic">
          {SENIOR_NOTE_NOT_AVAILABLE}
        </p>
      </section>

      {state.objectiveDeltas.length > 0 && (
        <section aria-labelledby="retro-moved-heading" className="flex flex-col gap-3">
          <h2
            id="retro-moved-heading"
            className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
          >
            What this moved
          </h2>
          <ul className="flex flex-col gap-2">
            {state.objectiveDeltas.map((delta) => (
              <li
                key={delta.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-card)] px-3 py-2"
              >
                <span className="text-sm text-[var(--wb-text)]">{delta.label}</span>
                <span className="text-xs text-[var(--wb-text-secondary)]">
                  {STATE_WORD[delta.before]} -&gt; {STATE_WORD[delta.after]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-3 border-t border-[var(--wb-border)] pt-5">
        {state.nextTicketKey ? (
          <Button asChild>
            <Link href={`/sprint-labs/${workbookId}/run/ticket/${state.nextTicketKey}`}>
              Next: {state.nextTicketKey}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={boardHref}>Back to the board</Link>
        </Button>
      </div>
    </div>
  )
}
