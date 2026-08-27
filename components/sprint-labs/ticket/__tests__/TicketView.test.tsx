/**
 * @vitest-environment jsdom
 *
 * TicketView — screen 5, the ticket hand-off (UX-SPEC.md §6). Covers the task's own verification
 * bar: "ticket renders body/criteria/banner + never leaks file paths."
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TicketView } from "../TicketView"
import type { TicketPublic } from "@/lib/sprint-labs/types"

afterEach(cleanup)

function ticket(overrides: Partial<TicketPublic> = {}): TicketPublic {
  return {
    key: "MER-305",
    title: "CX-88431 was extracted and billed twice",
    points: 5,
    labels: ["bug", "P1", "billing"],
    aiPolicy: "assisted",
    objectives: [],
    bodyMd:
      "Support reopened CX-88431 this morning. The claim was extracted twice and billed twice.",
    acceptanceCriteria: [
      "A repeat submission of the same claim reference within a tenant cannot create a second extraction.",
    ],
    adversaryPresent: true,
    ...overrides,
  }
}

describe("TicketView", () => {
  it("renders the ticket body through MarkdownRenderer, the criteria, and the CTA qualifier", () => {
    render(<TicketView workbookId="fixture-demo" ticket={ticket()} status="todo" />)
    expect(screen.getByText(/Support reopened CX-88431 this morning/)).not.toBeNull()
    expect(screen.getByText(/A repeat submission of the same claim reference/)).not.toBeNull()
    expect(screen.getByText(/Visible tests run in your browser/)).not.toBeNull()
  })

  it("shows no banner for an assisted ticket and Assisted in the rail", () => {
    render(
      <TicketView
        workbookId="fixture-demo"
        ticket={ticket({ aiPolicy: "assisted" })}
        status="todo"
      />
    )
    expect(screen.queryByRole("note")).toBeNull()
    expect(screen.getByText("Assisted")).not.toBeNull()
  })

  it("shows the non-dismissible unassisted banner with the ai_policy_reason in fiction", () => {
    render(
      <TicketView
        workbookId="fixture-demo"
        ticket={ticket({
          aiPolicy: "unassisted",
          aiPolicyReason: "we are not shipping a race fix nobody on the team can defend",
        })}
        status="todo"
      />
    )
    const banner = screen.getByRole("note")
    expect(banner.textContent).toContain("No agent on this ticket.")
    expect(banner.textContent).toContain("we are not shipping a race fix")
    expect(banner.querySelector("button")).toBeNull()
  })

  it("routes review-only tickets to the review round instead of the workspace", () => {
    render(
      <TicketView
        workbookId="fixture-demo"
        ticket={ticket({ aiPolicy: "review-only" })}
        status="todo"
      />
    )
    const cta = screen.getByRole("link", { name: "Open the PR" })
    expect(cta.getAttribute("href")).toBe("/sprint-labs/fixture-demo/run/ticket/MER-305/review")
  })

  it("resolves the CTA per board status: todo, doing, review, done", () => {
    const cases: Array<
      [TicketPublic["aiPolicy"], "todo" | "doing" | "review" | "done", string, string]
    > = [
      ["assisted", "todo", "Open workspace", "workspace"],
      ["assisted", "doing", "Back to workspace", "workspace"],
      ["assisted", "review", "See CI", "submit"],
      ["assisted", "done", "See retro", "retro"],
    ]
    for (const [aiPolicy, status, label, segment] of cases) {
      const { unmount } = render(
        <TicketView workbookId="fixture-demo" ticket={ticket({ aiPolicy })} status={status} />
      )
      const cta = screen.getByRole("link", { name: label })
      expect(cta.getAttribute("href")).toBe(
        `/sprint-labs/fixture-demo/run/ticket/MER-305/${segment}`
      )
      unmount()
    }
  })

  it("shows the shipped strip with the escaped count once done and finalized", () => {
    render(
      <TicketView workbookId="fixture-demo" ticket={ticket()} status="done" escapedCount={0} />
    )
    expect(screen.getByText(/Shipped\./)).not.toBeNull()
    expect(screen.getByText(/Nothing escaped\./)).not.toBeNull()
  })

  it("never lists which files to touch: no source-path pattern appears anywhere in the render", () => {
    render(<TicketView workbookId="fixture-demo" ticket={ticket()} status="todo" />)
    const html = document.body.innerHTML
    expect(html).not.toMatch(/src\//)
    expect(html).not.toMatch(/\.tsx?['")\s<]/)
    expect(html).not.toContain("files you will probably want")
  })

  it("carries no em dash in its own copy", () => {
    render(
      <TicketView
        workbookId="fixture-demo"
        ticket={ticket({ aiPolicy: "unassisted", aiPolicyReason: "reason" })}
        status="done"
        escapedCount={2}
      />
    )
    expect(document.body.innerHTML).not.toContain("—")
  })
})
