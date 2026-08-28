/**
 * @vitest-environment jsdom
 *
 * TicketCard — one ticket on the board (UX-SPEC.md §5). Pins the stretched-link mechanism (I1 in
 * WorkbookCard's own fix round): the whole card is a click target, and the objective chip row stays
 * independently clickable without triggering navigation.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TicketCard } from "../TicketCard"
import type { TicketCardView } from "../types"

afterEach(cleanup)

function ticket(overrides: Partial<TicketCardView> = {}): TicketCardView {
  return {
    key: "MER-304",
    title: "Claims list is 4.2s for Continental",
    points: 5,
    labels: ["bug", "P2"],
    aiPolicy: "assisted",
    status: "todo",
    objectives: [],
    ...overrides,
  }
}

describe("TicketCard", () => {
  it("renders key, title, points and labels", () => {
    render(<TicketCard workbookId="fixture-demo" ticket={ticket()} />)
    expect(screen.getByText("MER-304")).not.toBeNull()
    expect(screen.getByText("Claims list is 4.2s for Continental")).not.toBeNull()
    expect(screen.getByText("5 pt")).not.toBeNull()
    expect(screen.getByText("bug")).not.toBeNull()
    expect(screen.getByText("P2")).not.toBeNull()
  })

  it("links the whole card to the ticket route", () => {
    render(<TicketCard workbookId="fixture-demo" ticket={ticket()} />)
    const link = screen.getByRole("link", {
      name: "Open MER-304: Claims list is 4.2s for Continental",
    })
    expect(link.getAttribute("href")).toBe("/sprint-labs/fixture-demo/run/ticket/MER-304")
  })

  it("shows the ai_policy_reason in fiction, quoted, only when unassisted", () => {
    const { rerender } = render(
      <TicketCard
        workbookId="fixture-demo"
        ticket={ticket({
          aiPolicy: "unassisted",
          aiPolicyReason: "we are not shipping a race fix nobody can defend",
        })}
      />
    )
    expect(screen.getByText("No agent")).not.toBeNull()
    expect(screen.getByText(/we are not shipping a race fix/)).not.toBeNull()

    rerender(<TicketCard workbookId="fixture-demo" ticket={ticket({ aiPolicy: "assisted" })} />)
    expect(screen.queryByText(/we are not shipping a race fix/)).toBeNull()
  })

  it("caps objective chips at two and shows a +N indicator for the rest", () => {
    render(
      <TicketCard
        workbookId="fixture-demo"
        ticket={ticket({
          objectives: [
            { id: "a", label: "Objective A", sentence: "Can do A.", state: "not_started" },
            { id: "b", label: "Objective B", sentence: "Can do B.", state: "not_started" },
            { id: "c", label: "Objective C", sentence: "Can do C.", state: "not_started" },
          ],
        })}
      />
    )
    expect(screen.getByText("Objective A")).not.toBeNull()
    expect(screen.getByText("Objective B")).not.toBeNull()
    expect(screen.queryByText("Objective C")).toBeNull()
    expect(screen.getByText("+1 more")).not.toBeNull()
  })

  it("never nests the objective chip toggle inside the stretched link", () => {
    render(
      <TicketCard
        workbookId="fixture-demo"
        ticket={ticket({
          objectives: [
            { id: "a", label: "Objective A", sentence: "Can do A.", state: "not_started" },
          ],
        })}
      />
    )
    const chipButton = screen.getByRole("button", { name: /Objective A/ })
    expect(chipButton.closest("a")).toBeNull()
    // Clicking the chip must not throw (it is not an <a> descendant, and jsdom would refuse to
    // render invalid nested-interactive markup the way a real browser silently mis-parses it).
    fireEvent.click(chipButton)
    expect(chipButton.getAttribute("aria-expanded")).toBe("true")
  })

  it("omits the escaped-count line on a DONE card when no count is known", () => {
    render(<TicketCard workbookId="fixture-demo" ticket={ticket({ status: "done" })} />)
    expect(screen.queryByText(/escaped/)).toBeNull()
  })

  it("shows 0 escaped in the success color and N escaped otherwise, once known", () => {
    const { rerender } = render(
      <TicketCard workbookId="fixture-demo" ticket={ticket({ status: "done", escapedCount: 0 })} />
    )
    expect(screen.getByText("0 escaped")).not.toBeNull()

    rerender(
      <TicketCard workbookId="fixture-demo" ticket={ticket({ status: "done", escapedCount: 2 })} />
    )
    expect(screen.getByText("2 escaped")).not.toBeNull()
  })

  it("shows a muted Coming soon tag for a content stub, and keeps the card a link to the ticket screen", () => {
    render(<TicketCard workbookId="fixture-demo" ticket={ticket({ playable: false })} />)
    expect(screen.getByText("Coming soon")).not.toBeNull()
    const link = screen.getByRole("link", {
      name: "Open MER-304: Claims list is 4.2s for Continental",
    })
    expect(link.getAttribute("href")).toBe("/sprint-labs/fixture-demo/run/ticket/MER-304")
  })

  it("omits the Coming soon tag once a ticket is playable, whether explicitly true or unset", () => {
    const { rerender } = render(
      <TicketCard workbookId="fixture-demo" ticket={ticket({ playable: true })} />
    )
    expect(screen.queryByText("Coming soon")).toBeNull()

    rerender(<TicketCard workbookId="fixture-demo" ticket={ticket()} />)
    expect(screen.queryByText("Coming soon")).toBeNull()
  })
})
