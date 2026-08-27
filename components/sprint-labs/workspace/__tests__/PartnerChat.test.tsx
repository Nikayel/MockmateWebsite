/**
 * @vitest-environment jsdom
 *
 * PartnerChat's two headline states: an unassisted ticket starts LOCKED
 * (matching the route's real 403, AGENT-CONTEXT.md §6's "no session at
 * all") with a real, reachable "Talk to a tutor instead" affordance into the
 * repo-blind chat; an assisted/review-only ticket starts active. Transcript
 * rehydration and the sign-in gate are also covered.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  fetchPartnerTranscript: vi.fn(),
  sendPartnerChatMessage: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth: mocks.useAuth }))
vi.mock("@/lib/sprint-labs/partner/chat-client", () => ({
  fetchPartnerTranscript: mocks.fetchPartnerTranscript,
  sendPartnerChatMessage: mocks.sendPartnerChatMessage,
}))

import { PartnerChat } from "../PartnerChat"

afterEach(cleanup)

beforeEach(() => {
  // jsdom does not implement Element.scrollTo; PartnerChat calls it (forked
  // unguarded from CaseLabChat.tsx, which does the same) to keep the newest
  // message in view. Not a component bug -- a test-environment gap.
  Element.prototype.scrollTo = vi.fn()
  vi.clearAllMocks()
  mocks.useAuth.mockReturnValue({ user: { uid: "u1" }, initialized: true })
  mocks.fetchPartnerTranscript.mockResolvedValue({
    transcript: { messages: [], truncated: false, originalCount: 0 },
    mutedDirectiveIds: [],
  })
})

describe("PartnerChat — unassisted ticket", () => {
  it("starts locked with the in-fiction reason, no chat composer", async () => {
    render(
      <PartnerChat
        runId="run-1"
        ticketKey="MER-201"
        aiPolicy="unassisted"
        aiPolicyReason="You write this one yourself."
      />
    )
    expect(screen.getByText("No agent on this ticket")).not.toBeNull()
    expect(screen.getByText(/You write this one yourself\./)).not.toBeNull()
    expect(screen.queryByLabelText("Message Sable")).toBeNull()
    // Locked is a deterministic outcome of aiPolicy alone; no wasted network call.
    expect(mocks.sendPartnerChatMessage).not.toHaveBeenCalled()
    // The mount-time transcript fetch still runs (harmless in locked state,
    // and needed once "Talk to a tutor instead" is clicked) -- await it so
    // its state update settles before the test ends.
    await waitFor(() => expect(mocks.fetchPartnerTranscript).toHaveBeenCalled())
  })

  it("switches to a working repo-blind chat via 'Talk to a tutor instead'", async () => {
    render(
      <PartnerChat
        runId="run-1"
        ticketKey="MER-201"
        aiPolicy="unassisted"
        aiPolicyReason="reason"
      />
    )
    fireEvent.click(screen.getByText("Talk to a tutor instead"))
    await waitFor(() => expect(screen.getByText("SABLE — REPO BLIND")).not.toBeNull())
    expect(
      screen.getByText("I can't see your code on this ticket, and that's deliberate.")
    ).not.toBeNull()
    expect(screen.getByLabelText("Message Sable")).not.toBeNull()
  })

  it("C1 (review round 1, Critical): the repo-blind tutor never posts Layer B or the per-turn note, even when the parent supplies them", async () => {
    mocks.sendPartnerChatMessage.mockResolvedValue({ ok: true, reply: "reply" })
    render(
      <PartnerChat
        runId="run-1"
        ticketKey="MER-201"
        aiPolicy="unassisted"
        aiPolicyReason="reason"
        getLayerBInput={() => ({
          sha: "abc",
          generatedAt: "2026-08-27T00:00:00.000Z",
          files: [],
          routes: [],
          migrations: [],
          tests: [],
          diffStat: "",
        })}
        getWorkspaceFiles={() => [{ path: "src/secret.ts", content: "SHOULD NOT LEAK" }]}
        getPerTurnState={() => ({ redVisibleTests: [], diffStat: "" })}
      />
    )
    fireEvent.click(screen.getByText("Talk to a tutor instead"))
    await waitFor(() => expect(screen.getByLabelText("Message Sable")).not.toBeNull())

    fireEvent.change(screen.getByLabelText("Message Sable"), { target: { value: "hi" } })
    fireEvent.click(screen.getByLabelText("Send"))

    await waitFor(() => expect(mocks.sendPartnerChatMessage).toHaveBeenCalledTimes(1))
    const sent = mocks.sendPartnerChatMessage.mock.calls[0][0]
    expect(sent.mode).toBe("tutor")
    expect(sent.layerB).toBeUndefined()
    expect(sent.files).toBeUndefined()
    expect(sent.message).toBe("hi") // no [TURN STATE ...] note appended
  })
})

describe("PartnerChat — assisted ticket", () => {
  it("renders the active chat panel with the assisted capability line", async () => {
    render(<PartnerChat runId="run-1" ticketKey="DEMO-101" aiPolicy="assisted" />)
    await waitFor(() => expect(screen.getByText("SABLE")).not.toBeNull())
    expect(
      screen.getByText(
        "I can read this repo and talk it through. I cannot edit files or run tests."
      )
    ).not.toBeNull()
  })

  it("rehydrates a saved transcript on mount", async () => {
    mocks.fetchPartnerTranscript.mockResolvedValue({
      transcript: {
        messages: [
          { role: "user", content: "what does this do" },
          { role: "assistant", content: "it lists claims" },
        ],
        truncated: false,
        originalCount: 2,
      },
      mutedDirectiveIds: [],
    })
    render(<PartnerChat runId="run-1" ticketKey="DEMO-101" aiPolicy="assisted" />)
    await waitFor(() => expect(screen.getByText("what does this do")).not.toBeNull())
    expect(screen.getByText("it lists claims")).not.toBeNull()
  })

  it("sends a message, shows the reply, and clears the composer", async () => {
    mocks.sendPartnerChatMessage.mockResolvedValue({ ok: true, reply: "Sable's reply" })
    render(<PartnerChat runId="run-1" ticketKey="DEMO-101" aiPolicy="assisted" />)
    await waitFor(() => expect(screen.getByLabelText("Message Sable")).not.toBeNull())

    fireEvent.change(screen.getByLabelText("Message Sable"), { target: { value: "hello" } })
    fireEvent.click(screen.getByLabelText("Send"))

    await waitFor(() => expect(screen.getByText("Sable's reply")).not.toBeNull())
    expect(screen.getByText("hello")).not.toBeNull()
    expect(screen.getByLabelText("Message Sable")).toHaveProperty("value", "")
  })

  it("transitions to the locked card when a send comes back 403 (e.g. a review-only ticket with no author brief yet)", async () => {
    mocks.sendPartnerChatMessage.mockResolvedValue({
      ok: false,
      locked: true,
      reason: "This ticket's author briefing isn't ready yet.",
    })
    render(<PartnerChat runId="run-1" ticketKey="DEMO-101" aiPolicy="assisted" />)
    await waitFor(() => expect(screen.getByLabelText("Message Sable")).not.toBeNull())

    fireEvent.change(screen.getByLabelText("Message Sable"), { target: { value: "hi" } })
    fireEvent.click(screen.getByLabelText("Send"))

    await waitFor(() => expect(screen.getByText("No agent on this ticket")).not.toBeNull())
    expect(screen.getByText(/isn't ready yet/)).not.toBeNull()
  })

  it("shows a soft error and keeps the panel usable on a network failure", async () => {
    mocks.sendPartnerChatMessage.mockResolvedValue({
      ok: false,
      locked: false,
      error: "Couldn't reach Sable. Try again.",
    })
    render(<PartnerChat runId="run-1" ticketKey="DEMO-101" aiPolicy="assisted" />)
    await waitFor(() => expect(screen.getByLabelText("Message Sable")).not.toBeNull())

    fireEvent.change(screen.getByLabelText("Message Sable"), { target: { value: "hi" } })
    fireEvent.click(screen.getByLabelText("Send"))

    await waitFor(() => expect(screen.getByRole("alert")).not.toBeNull())
    expect(screen.getByLabelText("Message Sable")).not.toBeNull()
  })
})

describe("PartnerChat — signed out", () => {
  it("shows the sign-in gate instead of a composer", async () => {
    mocks.useAuth.mockReturnValue({ user: null, initialized: true })
    render(<PartnerChat runId="run-1" ticketKey="DEMO-101" aiPolicy="assisted" />)
    await waitFor(() => expect(screen.getByText("Sign in to chat with Sable.")).not.toBeNull())
    expect(screen.queryByLabelText("Message Sable")).toBeNull()
  })
})
