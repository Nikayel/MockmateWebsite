/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchFinalizedAttempt: vi.fn(),
  cacheCompletedOutcome: vi.fn(),
  getCachedReviewOutcome: vi.fn(),
  cacheReviewOutcome: vi.fn(),
  openAttempt: vi.fn(),
  completeAttempt: vi.fn(),
  reviewAttempt: vi.fn(),
  ensureBoardAtLeast: vi.fn(),
}))
vi.mock("@/components/sprint-labs/submit/attempt-client", () => mocks)

const mockSendPushback = vi.hoisted(() => vi.fn())
vi.mock("../pr-author-chat-client", () => ({ sendPushbackToAuthorAgent: mockSendPushback }))

import { useTicketReview } from "../useTicketReview"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.fetchFinalizedAttempt.mockResolvedValue(null)
  mocks.getCachedReviewOutcome.mockReturnValue(null)
  mocks.ensureBoardAtLeast.mockResolvedValue("review")
  mockSendPushback.mockResolvedValue(null)
})

const OUTCOME_WITH_COMMENTS = {
  attempt: {
    ticketKey: "MER-303",
    aiPolicy: "review-only",
    variantId: "v1",
    finalized: true,
    gateResults: [],
    escapedDefects: [],
    scores: {
      understanding: 80,
      problemSolving: 80,
      codeQuality: 80,
      communication: 80,
      verification: 80,
      overall: 80,
    },
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
  submissionsRemaining: 4,
  reviewComments: [
    { id: "c1", body: "comment one" },
    { id: "c2", body: "comment two" },
  ],
}

describe("useTicketReview", () => {
  it("bootstraps via open+complete when nothing is cached, then lands on 'deciding'", async () => {
    mocks.openAttempt.mockResolvedValue({ ok: true, data: { attemptId: "a1" } })
    mocks.completeAttempt.mockResolvedValue({ ok: true, data: OUTCOME_WITH_COMMENTS })

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "todo" })
    )

    await waitFor(() => expect(result.current.phase).toBe("deciding"))
    expect(result.current.comments).toHaveLength(2)
    expect(mocks.openAttempt).toHaveBeenCalledWith({ runId: "run1", ticketKey: "MER-303" })
    expect(mocks.cacheCompletedOutcome).toHaveBeenCalledTimes(1)
  })

  it("skips the network entirely on a cache hit", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: OUTCOME_WITH_COMMENTS,
    })

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "review" })
    )

    await waitFor(() => expect(result.current.phase).toBe("deciding"))
    expect(mocks.openAttempt).not.toHaveBeenCalled()
  })

  it("review round fix: a fresh tab with no decisions cache but a server-confirmed reviewCorrectness locks read-only instead of inviting a re-decide (which would 409)", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: OUTCOME_WITH_COMMENTS,
      reviewCorrectness: [
        { id: "c1", correct: true },
        { id: "c2", correct: false },
      ],
    })
    // No getCachedReviewOutcome hit -- mocks default (afterEach) already sets this to null,
    // simulating a genuinely fresh tab that never saw this browser submit the round.

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "review" })
    )

    await waitFor(() => expect(result.current.phase).toBe("deciding"))
    expect(result.current.alreadySubmitted).toBe(true)
    // The raw, server-gated correctness IS available cold now...
    expect(result.current.reviewCorrectness).toEqual({ c1: true, c2: false })
    // ...but full verdicts (which need the learner's OWN decision, never returned by any
    // endpoint) genuinely cannot be reconstructed from correctness alone -- not fabricated.
    expect(result.current.verdicts).toBeNull()
  })

  it("reviewCorrectness is null when nothing has released it yet", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: OUTCOME_WITH_COMMENTS,
    })

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "review" })
    )

    await waitFor(() => expect(result.current.phase).toBe("deciding"))
    expect(result.current.reviewCorrectness).toBeNull()
    expect(result.current.alreadySubmitted).toBe(false)
  })

  it("lands on 'no-round' when the ticket has no review comments", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: { ...OUTCOME_WITH_COMMENTS, reviewComments: undefined },
    })

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "review" })
    )

    await waitFor(() => expect(result.current.phase).toBe("no-round"))
  })

  it("keeps verdicts null until the server reports the attempt finalized, even after Submit review", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: OUTCOME_WITH_COMMENTS,
    })
    mocks.reviewAttempt.mockResolvedValue({
      ok: true,
      data: { scores: OUTCOME_WITH_COMMENTS.attempt.scores, finalized: false }, // no `released`
    })

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "review" })
    )
    await waitFor(() => expect(result.current.phase).toBe("deciding"))

    act(() => result.current.accept("c1"))
    act(() => result.current.accept("c2"))
    act(() => result.current.submitReview())

    await waitFor(() => expect(result.current.alreadySubmitted).toBe(true))
    expect(result.current.verdicts).toBeNull()
    expect(mocks.ensureBoardAtLeast).not.toHaveBeenCalledWith("run1", "review", "MER-303", "done")
  })

  it("reveals verdicts and advances the board to done once the server reports finalized+released", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: OUTCOME_WITH_COMMENTS,
    })
    mocks.reviewAttempt.mockResolvedValue({
      ok: true,
      data: {
        scores: OUTCOME_WITH_COMMENTS.attempt.scores,
        finalized: true,
        released: {
          review: [
            { id: "c1", correct: true },
            { id: "c2", correct: false },
          ],
          referenceDiff: "diff --git ...",
        },
      },
    })

    const { result } = renderHook(() =>
      useTicketReview({ runId: "run1", ticketKey: "MER-303", boardStatus: "review" })
    )
    await waitFor(() => expect(result.current.phase).toBe("deciding"))

    act(() => result.current.accept("c1"))
    act(() => result.current.startPushBack("c2"))
    act(() => result.current.setReasonDraft("c2", "the mechanism is X"))
    act(() => result.current.sendPushBack("c2"))
    act(() => result.current.submitReview())

    await waitFor(() => expect(result.current.verdicts).not.toBeNull())
    expect(result.current.verdicts).toEqual({ c1: "correct", c2: "right-pushback" })
    expect(mocks.ensureBoardAtLeast).toHaveBeenCalledWith("run1", "review", "MER-303", "done")
  })
})
