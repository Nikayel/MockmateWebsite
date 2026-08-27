/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReviewCommentCard } from "../ReviewCommentCard"

afterEach(cleanup)

const COMMENT = { id: "c1", body: "Resetting on release is fine." }

describe("ReviewCommentCard", () => {
  it("offers Accept and Push back while undecided", () => {
    render(
      <ReviewCommentCard
        comment={COMMENT}
        state={{ kind: "undecided" }}
        onAccept={vi.fn()}
        onStartPushBack={vi.fn()}
        onReasonChange={vi.fn()}
        onSendPushBack={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Accept" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Push back" })).not.toBeNull()
  })

  it("calls onAccept when Accept is clicked", () => {
    const onAccept = vi.fn()
    render(
      <ReviewCommentCard
        comment={COMMENT}
        state={{ kind: "undecided" }}
        onAccept={onAccept}
        onStartPushBack={vi.fn()}
        onReasonChange={vi.fn()}
        onSendPushBack={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Accept" }))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it("disables Send while the push-back reason is empty, enables it once text is typed", () => {
    const { rerender } = render(
      <ReviewCommentCard
        comment={COMMENT}
        state={{ kind: "pushing-back", reasonDraft: "" }}
        onAccept={vi.fn()}
        onStartPushBack={vi.fn()}
        onReasonChange={vi.fn()}
        onSendPushBack={vi.fn()}
      />
    )
    let send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement
    expect(send.disabled).toBe(true)

    rerender(
      <ReviewCommentCard
        comment={COMMENT}
        state={{ kind: "pushing-back", reasonDraft: "the mechanism is X" }}
        onAccept={vi.fn()}
        onStartPushBack={vi.fn()}
        onReasonChange={vi.fn()}
        onSendPushBack={vi.fn()}
      />
    )
    send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement
    expect(send.disabled).toBe(false)
  })

  it("shows the pushed-back reason and the agent's reply once sent", () => {
    render(
      <ReviewCommentCard
        comment={COMMENT}
        state={{ kind: "pushed-back", reason: "a pooled client leaks state across a retry" }}
        onAccept={vi.fn()}
        onStartPushBack={vi.fn()}
        onReasonChange={vi.fn()}
        onSendPushBack={vi.fn()}
        agentReply="It does not leak across a retry — the pool resets state on release."
      />
    )
    expect(screen.getByText(/a pooled client leaks state across a retry/)).not.toBeNull()
    expect(screen.getByText(/does not leak across a retry/)).not.toBeNull()
  })

  it("never renders a verdict before one is passed", () => {
    render(
      <ReviewCommentCard
        comment={COMMENT}
        state={{ kind: "accepted" }}
        onAccept={vi.fn()}
        onStartPushBack={vi.fn()}
        onReasonChange={vi.fn()}
        onSendPushBack={vi.fn()}
        verdict={null}
      />
    )
    expect(document.body.innerHTML).not.toMatch(/correct|wrong/i)
  })
})
