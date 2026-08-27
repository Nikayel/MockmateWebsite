/**
 * @vitest-environment jsdom
 *
 * BoardColumn — one column: heading, count pill, card list, empty line (UX-SPEC.md §1.8/§5).
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { BoardColumn } from "../BoardColumn"
import type { TicketCardView } from "../types"

afterEach(cleanup)

function ticket(key: string): TicketCardView {
  return {
    key,
    title: `Title for ${key}`,
    points: 3,
    labels: [],
    aiPolicy: "assisted",
    status: "todo",
    objectives: [],
  }
}

describe("BoardColumn", () => {
  it("renders the heading with a count pill matching the ticket count", () => {
    render(
      <BoardColumn
        workbookId="fixture-demo"
        title="TODO"
        headingId="col-todo"
        emptyLabel="Nothing left to pick up."
        tickets={[ticket("MER-304"), ticket("MER-305")]}
      />
    )
    expect(screen.getByRole("heading", { level: 3, name: "TODO" })).not.toBeNull()
    expect(screen.getByText("2")).not.toBeNull()
    expect(screen.getByText("Title for MER-304")).not.toBeNull()
    expect(screen.getByText("Title for MER-305")).not.toBeNull()
  })

  it("renders the authored empty line when there are no tickets", () => {
    render(
      <BoardColumn
        workbookId="fixture-demo"
        title="DONE"
        headingId="col-done"
        emptyLabel="Nothing shipped yet."
        tickets={[]}
      />
    )
    expect(screen.getByText("Nothing shipped yet.")).not.toBeNull()
    expect(screen.getByText("0")).not.toBeNull()
  })

  it("renders cards as a ul/li list, not a bare div stack", () => {
    render(
      <BoardColumn
        workbookId="fixture-demo"
        title="TODO"
        headingId="col-todo-2"
        emptyLabel="empty"
        tickets={[ticket("MER-304")]}
      />
    )
    const list = screen.getByRole("list")
    expect(list.tagName).toBe("UL")
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
  })
})
