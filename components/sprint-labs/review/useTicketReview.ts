"use client"

/**
 * useTicketReview — screen 8's data/orchestration (UX-SPEC.md §9).
 *
 * A review-only ticket has no workspace step (T11's `TicketView` routes it
 * straight to `.../review`), so this hook bootstraps the attempt itself
 * (open + complete, same documented empty-execution seam as
 * `useSubmitScreenController` — see that file's header) behind the screen's
 * own `"Loading the PR…"` state (UX-SPEC.md §9 States) rather than a second
 * pre-run confirmation: the round is scored on the DECISIONS made here, not
 * on the CI gates, so there is nothing for the learner to confirm before
 * this step the way there is on submit.
 *
 * A same-tab re-visit after already submitting reconstructs verdicts from
 * the CACHED decisions (`CachedReview.decisions`), not from server state —
 * `ReviewAttemptOutcome` never hands the learner's own choices back, only
 * scores and (once finalized) correctness per comment id.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AiPolicy, TicketBoardStatus } from "@/lib/sprint-labs/types"
import {
  cacheCompletedOutcome,
  cacheReviewOutcome,
  completeAttempt,
  ensureBoardAtLeast,
  getCachedCompletedOutcome,
  getCachedReviewOutcome,
  openAttempt,
  reviewAttempt,
  type CachedAttempt,
  type CachedReview,
} from "@/components/sprint-labs/submit/attempt-client"
import { sendPushbackToAuthorAgent } from "./pr-author-chat-client"
import { resolveVerdict, type CommentDecisionState, type CommentVerdict } from "./review-decisions"

export type ReviewPhase = "loading" | "no-round" | "deciding" | "error"

export interface TicketReviewState {
  phase: ReviewPhase
  aiPolicy: AiPolicy | null
  comments: Array<{ id: string; body: string }>
  decisions: Record<string, CommentDecisionState>
  verdicts: Record<string, CommentVerdict> | null
  agentReplies: Record<string, string | null>
  agentReplyLoading: Record<string, boolean>
  submitting: boolean
  alreadySubmitted: boolean
  errorMessage: string | null
  accept: (commentId: string) => void
  startPushBack: (commentId: string) => void
  setReasonDraft: (commentId: string, value: string) => void
  sendPushBack: (commentId: string) => void
  submitReview: () => void
  retry: () => void
}

export interface UseTicketReviewInput {
  runId: string | null
  ticketKey: string
  boardStatus: TicketBoardStatus | null
}

function initialDecisions(comments: Array<{ id: string }>): Record<string, CommentDecisionState> {
  return Object.fromEntries(comments.map((c) => [c.id, { kind: "undecided" } as const]))
}

/** Reconstructs each comment's decision state from a cached submission's raw decisions. */
function decisionsFromCachedReview(
  cachedReview: CachedReview
): Record<string, CommentDecisionState> {
  const out: Record<string, CommentDecisionState> = {}
  for (const d of cachedReview.decisions) {
    out[d.commentId] =
      d.decision === "accept"
        ? { kind: "accepted" }
        : { kind: "pushed-back", reason: d.reason ?? "" }
  }
  return out
}

function verdictsFromCachedReview(
  cachedReview: CachedReview,
  decisions: Record<string, CommentDecisionState>
): Record<string, CommentVerdict> | null {
  if (!cachedReview.outcome.released) return null
  const correctById = new Map(cachedReview.outcome.released.review.map((r) => [r.id, r.correct]))
  const out: Record<string, CommentVerdict> = {}
  for (const [commentId, decision] of Object.entries(decisions)) {
    const correct = correctById.get(commentId)
    if (correct === undefined) continue
    const verdict = resolveVerdict(decision, correct)
    if (verdict) out[commentId] = verdict
  }
  return out
}

export function useTicketReview({
  runId,
  ticketKey,
  boardStatus,
}: UseTicketReviewInput): TicketReviewState {
  const [phase, setPhase] = useState<ReviewPhase>("loading")
  const [cached, setCached] = useState<CachedAttempt | null>(null)
  const [decisions, setDecisions] = useState<Record<string, CommentDecisionState>>({})
  const [verdicts, setVerdicts] = useState<Record<string, CommentVerdict> | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [agentReplies, setAgentReplies] = useState<Record<string, string | null>>({})
  const [agentReplyLoading, setAgentReplyLoading] = useState<Record<string, boolean>>({})
  const bootstrappedForRef = useRef<string | null>(null)
  const turnIndexRef = useRef(0)

  const comments = useMemo(() => cached?.outcome.reviewComments ?? [], [cached])

  const bootstrap = useCallback(async () => {
    if (runId === null) return
    bootstrappedForRef.current = `${runId}:${ticketKey}`
    setPhase("loading")
    setErrorMessage(null)

    let attempt = getCachedCompletedOutcome(runId, ticketKey)
    if (!attempt) {
      const opened = await openAttempt({ runId, ticketKey })
      if (!opened.ok) {
        setErrorMessage(
          opened.error === "BUDGET_EXCEEDED" || opened.error === "COOLDOWN_ACTIVE"
            ? "This ticket's attempts are exhausted for now."
            : "Couldn't load the PR."
        )
        setPhase("error")
        return
      }
      const completed = await completeAttempt({
        runId,
        ticketKey,
        attemptId: opened.data.attemptId,
        ioCaseOutputs: {},
        probeResults: {},
      })
      if (!completed.ok) {
        setErrorMessage("Couldn't load the PR.")
        setPhase("error")
        return
      }
      attempt = { attemptId: opened.data.attemptId, outcome: completed.data }
      cacheCompletedOutcome(runId, ticketKey, attempt)
      void ensureBoardAtLeast(runId, boardStatus ?? "todo", ticketKey, "review")
    }
    setCached(attempt)

    const reviewComments = attempt.outcome.reviewComments ?? []
    if (reviewComments.length === 0) {
      setPhase("no-round")
      return
    }

    const cachedReview = getCachedReviewOutcome(runId, ticketKey)
    if (cachedReview) {
      const reconstructed = decisionsFromCachedReview(cachedReview)
      setDecisions(reconstructed)
      setVerdicts(verdictsFromCachedReview(cachedReview, reconstructed))
      setAlreadySubmitted(true)
    } else {
      setDecisions(initialDecisions(reviewComments))
    }
    setPhase("deciding")
  }, [runId, ticketKey, boardStatus])

  useEffect(() => {
    if (runId === null || boardStatus === null) return
    if (bootstrappedForRef.current === `${runId}:${ticketKey}`) return
    void bootstrap()
  }, [runId, boardStatus, ticketKey, bootstrap])

  const accept = useCallback((commentId: string) => {
    setDecisions((prev) => ({ ...prev, [commentId]: { kind: "accepted" } }))
  }, [])

  const startPushBack = useCallback((commentId: string) => {
    setDecisions((prev) => ({ ...prev, [commentId]: { kind: "pushing-back", reasonDraft: "" } }))
  }, [])

  const setReasonDraft = useCallback((commentId: string, value: string) => {
    setDecisions((prev) => {
      const current = prev[commentId]
      if (!current || current.kind !== "pushing-back") return prev
      return { ...prev, [commentId]: { kind: "pushing-back", reasonDraft: value } }
    })
  }, [])

  const sendPushBack = useCallback(
    (commentId: string) => {
      setDecisions((prev) => {
        const current = prev[commentId]
        if (
          !current ||
          current.kind !== "pushing-back" ||
          current.reasonDraft.trim().length === 0
        ) {
          return prev
        }
        const reason = current.reasonDraft.trim()

        if (runId !== null) {
          setAgentReplyLoading((r) => ({ ...r, [commentId]: true }))
          const turnIndex = turnIndexRef.current++
          void sendPushbackToAuthorAgent({ runId, ticketKey, message: reason, turnIndex }).then(
            (reply) => {
              setAgentReplyLoading((r) => ({ ...r, [commentId]: false }))
              setAgentReplies((r) => ({ ...r, [commentId]: reply }))
            }
          )
        }

        return { ...prev, [commentId]: { kind: "pushed-back", reason } }
      })
    },
    [runId, ticketKey]
  )

  const submitReview = useCallback(async () => {
    if (runId === null || !cached) return
    setSubmitting(true)
    setErrorMessage(null)

    const submittedDecisions: CachedReview["decisions"] = comments.map((c) => {
      const decision = decisions[c.id]
      return decision?.kind === "pushed-back"
        ? { commentId: c.id, decision: "push-back" as const, reason: decision.reason }
        : { commentId: c.id, decision: "accept" as const }
    })

    const result = await reviewAttempt({
      runId,
      ticketKey,
      attemptId: cached.attemptId,
      decisions: submittedDecisions,
    })

    setSubmitting(false)
    if (!result.ok) {
      setErrorMessage(
        result.error === "ALREADY_REVIEWED"
          ? "This review was already submitted."
          : "Couldn't submit your review."
      )
      return
    }

    const cachedReview: CachedReview = { decisions: submittedDecisions, outcome: result.data }
    cacheReviewOutcome(runId, ticketKey, cachedReview)
    setAlreadySubmitted(true)
    setVerdicts(verdictsFromCachedReview(cachedReview, decisions))
    if (result.data.finalized) {
      void ensureBoardAtLeast(runId, "review", ticketKey, "done")
    }
  }, [runId, ticketKey, cached, comments, decisions])

  const retry = useCallback(() => {
    bootstrappedForRef.current = null
    void bootstrap()
  }, [bootstrap])

  return {
    phase,
    aiPolicy: cached?.outcome.attempt.aiPolicy ?? null,
    comments,
    decisions,
    verdicts,
    agentReplies,
    agentReplyLoading,
    submitting,
    alreadySubmitted,
    errorMessage,
    accept,
    startPushBack,
    setReasonDraft,
    sendPushBack,
    submitReview: () => void submitReview(),
    retry,
  }
}
