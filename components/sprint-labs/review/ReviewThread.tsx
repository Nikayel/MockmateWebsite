"use client"

/**
 * ReviewThread — the bot's review comments with accept/push-back controls
 * (UX-SPEC.md §1.8, §9). "Submit review is enabled when all three comments
 * have a decision."
 */

import { Button } from "@/components/ui/button"
import { ReviewCommentCard } from "./ReviewCommentCard"
import { isDecided, type CommentDecisionState, type CommentVerdict } from "./review-decisions"

export interface ReviewThreadProps {
  comments: Array<{ id: string; body: string }>
  decisions: Record<string, CommentDecisionState>
  verdicts: Record<string, CommentVerdict> | null
  agentReplies: Record<string, string | null>
  agentReplyLoading: Record<string, boolean>
  onAccept: (id: string) => void
  onStartPushBack: (id: string) => void
  onReasonChange: (id: string, value: string) => void
  onSendPushBack: (id: string) => void
  onSubmitReview: () => void
  submitting: boolean
  alreadySubmitted: boolean
}

export function ReviewThread({
  comments,
  decisions,
  verdicts,
  agentReplies,
  agentReplyLoading,
  onAccept,
  onStartPushBack,
  onReasonChange,
  onSendPushBack,
  onSubmitReview,
  submitting,
  alreadySubmitted,
}: ReviewThreadProps) {
  const decidedCount = comments.filter((c) =>
    isDecided(decisions[c.id] ?? { kind: "undecided" })
  ).length
  const allDecided = decidedCount === comments.length

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
        Review ({comments.length} comment{comments.length === 1 ? "" : "s"})
      </h2>

      <div className="flex flex-col gap-3">
        {comments.map((comment) => (
          <ReviewCommentCard
            key={comment.id}
            comment={comment}
            state={decisions[comment.id] ?? { kind: "undecided" }}
            onAccept={() => onAccept(comment.id)}
            onStartPushBack={() => onStartPushBack(comment.id)}
            onReasonChange={(value) => onReasonChange(comment.id, value)}
            onSendPushBack={() => onSendPushBack(comment.id)}
            verdict={verdicts?.[comment.id] ?? null}
            agentReply={agentReplies[comment.id] ?? null}
            agentReplyLoading={!!agentReplyLoading[comment.id]}
            readOnly={alreadySubmitted}
          />
        ))}
      </div>

      {!alreadySubmitted && (
        <div className="flex items-center gap-3">
          <Button onClick={onSubmitReview} disabled={!allDecided || submitting}>
            Submit review
          </Button>
          <span className="text-xs text-[var(--wb-text-secondary)]">
            {decidedCount} of {comments.length} decided
          </span>
        </div>
      )}
    </div>
  )
}
