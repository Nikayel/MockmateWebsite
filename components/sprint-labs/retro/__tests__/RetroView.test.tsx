/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/editor", () => ({
  CodeMirrorEditor: ({ value }: { value: string }) => <pre data-testid="codemirror">{value}</pre>,
}))

import { RetroView } from "../RetroView"
import type { TicketRetroState } from "../useTicketRetro"

afterEach(cleanup)

function baseState(overrides: Partial<TicketRetroState> = {}): TicketRetroState {
  return {
    phase: "ready",
    ticket: {
      ticket: {
        key: "MER-305",
        title: "t",
        points: 5,
        labels: [],
        aiPolicy: "assisted",
        objectives: [],
        bodyMd: "body",
        acceptanceCriteria: [],
        adversaryPresent: true,
      },
      setupDiff: null,
      visibleTestFiles: [],
      hiddenTests: [],
    },
    cached: {
      attemptId: "a1",
      outcome: {
        attempt: {
          ticketKey: "MER-305",
          aiPolicy: "assisted",
          variantId: "v1",
          finalized: true,
          gateResults: [],
          escapedDefects: [],
          scores: {
            understanding: 80,
            problemSolving: 80,
            codeQuality: 80,
            communication: null,
            verification: 80,
            overall: 80,
          },
          submittedAt: "2026-01-01T00:00:00.000Z",
        },
        submissionsRemaining: 4,
      },
    },
    objectiveDeltas: [],
    nextTicketKey: null,
    retry: vi.fn(),
    ...overrides,
  }
}

describe("RetroView", () => {
  it("shows the 'submit first' empty state instead of a 404 when nothing is available", () => {
    render(
      <RetroView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({ phase: "not-available" })}
      />
    )
    expect(
      screen.getByText(/hasn't been submitted yet, or the result isn't available/)
    ).not.toBeNull()
    expect(screen.getByRole("link", { name: "Submit this ticket" })).not.toBeNull()
  })

  it("reads 'Nothing escaped' in both the headline and the escaped-defects section", () => {
    render(<RetroView workbookId="meridian" ticketKey="MER-305" state={baseState()} />)
    // Once in the "MER-305 shipped. Nothing escaped. 5 points." headline, once in the
    // EscapedDefectList section below it — both are correct, independent renders.
    expect(screen.getAllByText(/Nothing escaped\./)).toHaveLength(2)
  })

  it("names escaped defects rather than only counting them", () => {
    const state = baseState({
      cached: {
        attemptId: "a1",
        outcome: {
          ...baseState().cached!.outcome,
          attempt: {
            ...baseState().cached!.outcome.attempt,
            escapedDefects: ["a retry inside the window bills twice"],
          },
        },
      },
    })
    render(<RetroView workbookId="meridian" ticketKey="MER-305" state={state} />)
    expect(screen.getByText(/1 escaped defect\./)).not.toBeNull()
    expect(screen.getByText("Escaped: a retry inside the window bills twice")).not.toBeNull()
  })

  it("renders the reference diff once released, and an honest not-available line for the learner's own diff", () => {
    const state = baseState({
      cached: {
        attemptId: "a1",
        outcome: {
          ...baseState().cached!.outcome,
          referenceDiff: "diff --git a/x b/x\n--- a/x\n+++ b/x\n",
        },
      },
    })
    render(<RetroView workbookId="meridian" ticketKey="MER-305" state={state} />)
    expect(screen.getAllByTestId("codemirror")).toHaveLength(1)
    expect(screen.getByText(/Your diff has no source yet/)).not.toBeNull()
  })

  it("shows an unassisted banner with the ticket's ai_policy_reason", () => {
    const state = baseState()
    state.ticket!.ticket = {
      ...state.ticket!.ticket,
      aiPolicy: "unassisted",
      aiPolicyReason: "we are not shipping a race fix nobody can defend",
    }
    render(<RetroView workbookId="meridian" ticketKey="MER-305" state={state} />)
    expect(screen.getByRole("note").textContent).toContain("we are not shipping a race fix")
  })

  it("routes the CTA to the next ticket when one is findable, else back to the board only", () => {
    const { rerender } = render(
      <RetroView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({ nextTicketKey: "MER-306" })}
      />
    )
    expect(screen.getByRole("link", { name: "Next: MER-306" }).getAttribute("href")).toBe(
      "/sprint-labs/meridian/run/ticket/MER-306"
    )

    rerender(
      <RetroView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({ nextTicketKey: null })}
      />
    )
    expect(screen.queryByText(/^Next:/)).toBeNull()
    expect(screen.getByRole("link", { name: "Back to the board" })).not.toBeNull()
  })

  it("never fabricates a senior paragraph — renders the honest not-available line", () => {
    render(<RetroView workbookId="meridian" ticketKey="MER-305" state={baseState()} />)
    expect(
      screen.getByText("The senior's note for this ticket is not available yet.")
    ).not.toBeNull()
  })
})
