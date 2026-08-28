/**
 * @vitest-environment jsdom
 *
 * SprintBoard — the four fixed columns, grouped from a flat `TicketCardView[]` (UX-SPEC.md §5). This
 * is the "board renders columns from a board fixture" case named in the task's own verification bar.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SprintBoard } from "../SprintBoard"
import type { TicketCardView } from "../types"
import type { TicketBoardStatus } from "@/lib/sprint-labs/types"

afterEach(cleanup)

function ticket(key: string, status: TicketBoardStatus): TicketCardView {
  return {
    key,
    title: `Title for ${key}`,
    points: 5,
    labels: [],
    aiPolicy: "assisted",
    status,
    objectives: [],
  }
}

// A representative board fixture spanning all four columns, matching UX-SPEC.md §5's mockup shape.
const BOARD_FIXTURE: TicketCardView[] = [
  ticket("MER-304", "todo"),
  ticket("MER-305", "todo"),
  ticket("MER-303", "doing"),
  ticket("MER-302", "review"),
  ticket("MER-301", "done"),
]

describe("SprintBoard", () => {
  it("renders exactly four columns, in TODO/DOING/REVIEW/DONE order", () => {
    render(<SprintBoard workbookId="fixture-demo" tickets={BOARD_FIXTURE} />)
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(["TODO", "DOING", "REVIEW", "DONE"])
  })

  it("places each ticket in the column matching its status", () => {
    render(<SprintBoard workbookId="fixture-demo" tickets={BOARD_FIXTURE} />)
    const todoColumn = screen.getByRole("heading", { name: "TODO" }).closest("section")
    const doingColumn = screen.getByRole("heading", { name: "DOING" }).closest("section")
    const doneColumn = screen.getByRole("heading", { name: "DONE" }).closest("section")

    expect(todoColumn?.textContent).toContain("MER-304")
    expect(todoColumn?.textContent).toContain("MER-305")
    expect(todoColumn?.textContent).not.toContain("MER-303")

    expect(doingColumn?.textContent).toContain("MER-303")
    expect(doingColumn?.textContent).not.toContain("MER-304")

    expect(doneColumn?.textContent).toContain("MER-301")
  })

  it("renders an empty column's authored line when a status has no tickets", () => {
    render(<SprintBoard workbookId="fixture-demo" tickets={[ticket("MER-101", "todo")]} />)
    expect(screen.getByText("Nothing in progress.")).not.toBeNull()
    expect(screen.getByText("Nothing in review.")).not.toBeNull()
    expect(screen.getByText("Nothing shipped yet.")).not.toBeNull()
  })

  it("renders nothing left to pick up when TODO is empty", () => {
    render(<SprintBoard workbookId="fixture-demo" tickets={[ticket("MER-301", "done")]} />)
    expect(screen.getByText("Nothing left to pick up.")).not.toBeNull()
  })

  // A stub-only sprint (e.g. sprints 3-10 before their content lands): every ticket on the board is
  // playable: false. Nothing about grouping-by-status or the card itself assumes at least one
  // playable ticket exists, but this pins that as a real render rather than an inference.
  it("renders a stub-only board (every ticket playable: false) without crashing, tagging every card", () => {
    const allStubs: TicketCardView[] = [
      { ...ticket("MER-801", "todo"), playable: false },
      { ...ticket("MER-802", "todo"), playable: false },
      { ...ticket("MER-803", "doing"), playable: false },
    ]
    render(<SprintBoard workbookId="fixture-demo" tickets={allStubs} />)
    expect(screen.getAllByText("Coming soon")).toHaveLength(3)
  })
})
