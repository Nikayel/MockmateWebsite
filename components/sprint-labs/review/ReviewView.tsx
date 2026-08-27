"use client"

/**
 * ReviewView — screen 8's content (UX-SPEC.md §9). Diff left, review thread
 * right on desktop; stacked below `lg` (§14: reading screens are single
 * column, and this one has no editor to keep unlocked).
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SprintLabErrorPanel } from "@/components/sprint-labs/ui/SprintLabErrorPanel"
import { SparraLoader } from "@/components/brand/SparraLoader"
import { DiffCompare } from "./DiffCompare"
import { ReviewThread } from "./ReviewThread"
import type { TicketReviewState } from "./useTicketReview"

export interface ReviewViewProps {
  workbookId: string
  ticketKey: string
  state: TicketReviewState
}

/**
 * No sealed or public field anywhere carries a review-only ticket's "PR
 * diff" — `SealedTicketContent` has `referenceDiff` (the correct SOLUTION,
 * released only post-finalization) and nothing else diff-shaped (checked
 * against `lib/scenarios/sealed/sprint-labs/types.ts` before writing this;
 * flagged in the Task 13 report). Rendered as the same honest "not
 * available" state `DiffCompare` already has for a missing diff, rather than
 * mislabeling the reference diff as the thing under review.
 */
const PR_DIFF_NOT_AVAILABLE =
  "This ticket's diff has no source in the compiled or sealed content yet — see the Task 13 report."

export function ReviewView({ workbookId, ticketKey, state }: ReviewViewProps) {
  const ticketHref = `/sprint-labs/${workbookId}/run/ticket/${ticketKey}`
  const retroHref = `${ticketHref}/retro`

  if (state.phase === "loading") {
    return <SparraLoader label="Loading the PR…" />
  }

  if (state.phase === "error") {
    return (
      <SprintLabErrorPanel
        message={state.errorMessage ?? "Couldn't load the PR."}
        onRetry={state.retry}
      />
    )
  }

  if (state.phase === "no-round") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-6">
        <p className="text-sm text-[var(--wb-text)]">No review round on this ticket.</p>
        <Button asChild variant="outline">
          <Link href={ticketHref}>Back to the ticket</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[var(--wb-text)]">
          PR for {ticketKey}
          {state.alreadySubmitted && !state.verdicts && (
            <span className="ml-2 text-xs font-normal text-[var(--wb-text-secondary)]">
              (already submitted)
            </span>
          )}
        </p>
        <p className="text-xs text-[var(--wb-text-secondary)]">
          {state.aiPolicy === "review-only"
            ? "Scored under review only. A reproducing failing test outscores prose."
            : "Practice round. Not scored."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <DiffCompare
          mode="single"
          primaryDiff={null}
          primaryLabel="PR diff"
          primaryNotAvailableMessage={PR_DIFF_NOT_AVAILABLE}
        />

        <ReviewThread
          comments={state.comments}
          decisions={state.decisions}
          verdicts={state.verdicts}
          agentReplies={state.agentReplies}
          agentReplyLoading={state.agentReplyLoading}
          onAccept={state.accept}
          onStartPushBack={state.startPushBack}
          onReasonChange={state.setReasonDraft}
          onSendPushBack={state.sendPushBack}
          onSubmitReview={state.submitReview}
          submitting={state.submitting}
          alreadySubmitted={state.alreadySubmitted}
        />
      </div>

      {state.errorMessage && state.alreadySubmitted === false && (
        <p className="text-destructive text-sm">{state.errorMessage}</p>
      )}

      {state.verdicts && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href={retroHref}>See the retro</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
