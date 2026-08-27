/**
 * @vitest-environment jsdom
 *
 * LinkedArtifacts — collapsible list of a ticket's attachments (UX-SPEC.md §1.8/§6): closed by
 * default except the first, which opens.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { LinkedArtifacts } from "../LinkedArtifacts"

afterEach(cleanup)

describe("LinkedArtifacts", () => {
  it("renders the authored empty line when there are no artifacts", () => {
    render(<LinkedArtifacts artifacts={[]} />)
    expect(screen.getByText("Nothing attached to this ticket.")).not.toBeNull()
  })

  it("opens the first artifact by default and keeps the rest closed", () => {
    render(
      <LinkedArtifacts
        artifacts={[
          { id: "a1", label: "#support-escalations thread", body: "First message." },
          { id: "a2", label: "CX-88431 audit log extract", body: "Second body." },
        ]}
      />
    )
    const firstTrigger = screen.getByRole("button", { name: /#support-escalations thread/ })
    const secondTrigger = screen.getByRole("button", { name: /CX-88431 audit log extract/ })
    expect(firstTrigger.getAttribute("data-state")).toBe("open")
    expect(secondTrigger.getAttribute("data-state")).toBe("closed")
    // SlackQuote wraps the body in curly quotes as separate text nodes, so this matches the
    // substring rather than the exact (quote-free) string.
    expect(screen.getByText(/First message\./)).not.toBeNull()
  })
})
