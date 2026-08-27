"use client"

/**
 * ReviewCommentCard — one bot review comment: author, body, the learner's
 * decision, and after finalization the verdict (UX-SPEC.md §1.8, §9).
 *
 * The `correct` flag never reaches this component before finalization: the
 * caller (`useTicketReview`) only ever passes a `verdict` once the server's
 * `/attempts/review` response says `released` is present — the trap is
 * genuinely unknown client-side until then, not merely hidden in the UI.
 */

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { CommentDecisionState, CommentVerdict } from "./review-decisions"
import { canSendPushBack, VERDICT_LABEL } from "./review-decisions"

export interface ReviewCommentCardProps {
  comment: { id: string; body: string }
  state: CommentDecisionState
  onAccept: () => void
  onStartPushBack: () => void
  onReasonChange: (value: string) => void
  onSendPushBack: () => void
  /** Only ever non-null once the round is finalized. */
  verdict?: CommentVerdict | null
  agentReply?: string | null
  agentReplyLoading?: boolean
  readOnly?: boolean
}

export function ReviewCommentCard({
  comment,
  state,
  onAccept,
  onStartPushBack,
  onReasonChange,
  onSendPushBack,
  verdict,
  agentReply,
  agentReplyLoading,
  readOnly = false,
}: ReviewCommentCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-card)] p-4">
      <p className="text-xs font-medium text-[var(--wb-text-secondary)]">reviewer-bot</p>
      <p className="text-sm leading-relaxed text-[var(--wb-text)]">&ldquo;{comment.body}&rdquo;</p>

      {verdict && (
        <p className="text-sm font-medium text-[var(--wb-accent-strong)]">
          {VERDICT_LABEL[verdict]}
        </p>
      )}

      {!verdict && state.kind === "undecided" && !readOnly && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onAccept}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={onStartPushBack}>
            Push back
          </Button>
        </div>
      )}

      {!verdict && state.kind === "accepted" && (
        <p className="text-xs font-medium text-[var(--wb-success)]">Accepted</p>
      )}

      {!verdict && state.kind === "pushing-back" && !readOnly && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`reason-${comment.id}`}
            className="text-xs text-[var(--wb-text-secondary)]"
          >
            Why is this wrong? Name the mechanism.
          </label>
          <Textarea
            id={`reason-${comment.id}`}
            value={state.reasonDraft}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            onClick={onSendPushBack}
            disabled={!canSendPushBack(state)}
            className="w-fit"
          >
            Send
          </Button>
        </div>
      )}

      {state.kind === "pushed-back" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--wb-accent-strong)]">Pushed back</p>
          <p className="text-sm text-[var(--wb-text-secondary)] italic">
            &ldquo;{state.reason}&rdquo;
          </p>
          {agentReplyLoading && (
            <p className="text-xs text-[var(--wb-faint)]">The PR author is replying…</p>
          )}
          {agentReply && (
            <p className="rounded-md bg-[var(--wb-panel)] p-2.5 text-sm text-[var(--wb-text)]">
              <span className="font-medium">PR author: </span>
              {agentReply}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
