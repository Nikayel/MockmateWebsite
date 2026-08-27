/**
 * @vitest-environment jsdom
 *
 * SprintLabTopBar — the 48px compact run-surface top bar (UX-SPEC.md §1.3).
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => <button>Theme</button> }))

import { SprintLabTopBar } from "../SprintLabTopBar"

afterEach(cleanup)

describe("SprintLabTopBar", () => {
  it("renders the back link labelled with the workbook title by default", () => {
    render(
      <SprintLabTopBar
        workbookTitle="Meridian"
        sprintNumber={3}
        sprintCount={10}
        backHref="/sprint-labs/meridian"
      />
    )
    const back = screen.getByRole("link", { name: "Meridian" })
    expect(back.getAttribute("href")).toBe("/sprint-labs/meridian")
    expect(screen.getByText("Sprint 3 of 10")).not.toBeNull()
  })

  it("overrides the back label when backLabel is supplied (the ticket screen's Board case)", () => {
    render(
      <SprintLabTopBar
        workbookTitle="Meridian"
        backLabel="Board"
        sprintNumber={3}
        sprintCount={10}
        ticketKey="MER-305"
        backHref="/sprint-labs/meridian/run/board"
      />
    )
    expect(screen.getByRole("link", { name: "Board" })).not.toBeNull()
    expect(screen.queryByRole("link", { name: "Meridian" })).toBeNull()
    expect(screen.getByText("MER-305")).not.toBeNull()
  })

  it("omits the ticket key badge when none is supplied", () => {
    render(
      <SprintLabTopBar
        workbookTitle="Meridian"
        sprintNumber={1}
        sprintCount={10}
        backHref="/sprint-labs/meridian"
      />
    )
    expect(screen.queryByText(/MER-/)).toBeNull()
  })

  it("renders rightSlot content before the theme toggle", () => {
    render(
      <SprintLabTopBar
        workbookTitle="Meridian"
        sprintNumber={3}
        sprintCount={10}
        backHref="/sprint-labs/meridian"
        rightSlot={<span>Standup</span>}
      />
    )
    expect(screen.getByText("Standup")).not.toBeNull()
    expect(screen.getByText("Theme")).not.toBeNull()
  })
})
