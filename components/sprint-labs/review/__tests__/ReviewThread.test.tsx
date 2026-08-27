/**
 * @vitest-environment jsdom
 *
 * ReviewThread — the task's own verification bar: "review round hides the trap pre-resolution."
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReviewThread } from "../ReviewThread"
import type { CommentDecisionState } from "../review-decisions"

afterEach(cleanup)

const COMMENTS = [
  { id: "c1", body: "Resetting on release is fine, a pooled client is exclusive to one request." },
  { id: "c2", body: "This index is redundant with the primary key." },
  { id: "c3", body: "Consider adding a comment here." },
]

function noop() {}

describe("ReviewThread — trap resolution is never shipped pre-finalization", () => {
  it("shows no verdict, no 'correct' word, no accept/reject marker while decisions are still open", () => {
    const decisions: Record<string, CommentDecisionState> = {
      c1: { kind: "accepted" },
      c2: { kind: "pushed-back", reason: "the mechanism is X" },
      c3: { kind: "undecided" },
    }
    render(
      <ReviewThread
        comments={COMMENTS}
        decisions={decisions}
        verdicts={null}
        agentReplies={{}}
        agentReplyLoading={{}}
        onAccept={noop}
        onStartPushBack={noop}
        onReasonChange={noop}
        onSendPushBack={noop}
        onSubmitReview={noop}
        submitting={false}
        alreadySubmitted={false}
      />
    )
    const html = document.body.innerHTML
    expect(html).not.toMatch(
      /right to push back|was correct|Accepted a wrong|Pushed back on a correct/
    )
  })

  it("still hides the trap even after Submit review has been clicked but before the server responds", () => {
    // "submitting" models exactly this in-flight window — the client never learns which comment
    // is `correct: false` until the server's response carries `released`, so nothing here can leak
    // it early even while a submit request is outstanding.
    render(
      <ReviewThread
        comments={COMMENTS}
        decisions={{
          c1: { kind: "accepted" },
          c2: { kind: "accepted" },
          c3: { kind: "accepted" },
        }}
        verdicts={null}
        agentReplies={{}}
        agentReplyLoading={{}}
        onAccept={noop}
        onStartPushBack={noop}
        onReasonChange={noop}
        onSendPushBack={noop}
        onSubmitReview={noop}
        submitting
        alreadySubmitted={false}
      />
    )
    expect(document.body.innerHTML).not.toMatch(/correct|trap/i)
  })

  it("reveals verdicts only once the caller passes them (i.e. only after the server says finalized)", () => {
    render(
      <ReviewThread
        comments={COMMENTS}
        decisions={{
          c1: { kind: "accepted" },
          c2: { kind: "pushed-back", reason: "the mechanism is X" },
          c3: { kind: "accepted" },
        }}
        verdicts={{ c1: "correct", c2: "right-pushback", c3: "correct" }}
        agentReplies={{}}
        agentReplyLoading={{}}
        onAccept={noop}
        onStartPushBack={noop}
        onReasonChange={noop}
        onSendPushBack={noop}
        onSubmitReview={noop}
        submitting={false}
        alreadySubmitted
      />
    )
    expect(screen.getAllByText("This one was correct")).toHaveLength(2)
    expect(screen.getByText("You were right to push back")).not.toBeNull()
    // Post-finalization, decided comments no longer show Accept/Push back controls.
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
  })

  it("enables Submit review only once every comment has a decision", () => {
    const { rerender } = render(
      <ReviewThread
        comments={COMMENTS}
        decisions={{
          c1: { kind: "accepted" },
          c2: { kind: "undecided" },
          c3: { kind: "undecided" },
        }}
        verdicts={null}
        agentReplies={{}}
        agentReplyLoading={{}}
        onAccept={noop}
        onStartPushBack={noop}
        onReasonChange={noop}
        onSendPushBack={noop}
        onSubmitReview={noop}
        submitting={false}
        alreadySubmitted={false}
      />
    )
    let button = screen.getByRole("button", { name: "Submit review" }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText("1 of 3 decided")).not.toBeNull()

    rerender(
      <ReviewThread
        comments={COMMENTS}
        decisions={{
          c1: { kind: "accepted" },
          c2: { kind: "pushed-back", reason: "x" },
          c3: { kind: "accepted" },
        }}
        verdicts={null}
        agentReplies={{}}
        agentReplyLoading={{}}
        onAccept={noop}
        onStartPushBack={noop}
        onReasonChange={noop}
        onSendPushBack={noop}
        onSubmitReview={vi.fn()}
        submitting={false}
        alreadySubmitted={false}
      />
    )
    button = screen.getByRole("button", { name: "Submit review" }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})
