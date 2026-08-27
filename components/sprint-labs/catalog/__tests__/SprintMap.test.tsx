/**
 * @vitest-environment jsdom
 *
 * SprintMap is the overview's ten-sprint list. The one hard content rule under owner decision 2
 * (docs/sprint-labs/EXECUTION-STATE.md): sprint 1 is free, sprints 2-10 need Pro, and that must show
 * up as a real badge distinction, not just in prose.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SprintMap } from "../SprintMap"
import type { SprintPublic } from "@/lib/sprint-labs/types"

afterEach(cleanup)

function sprint(number: number, title: string): SprintPublic {
  return {
    number,
    title,
    goal: `Goal for sprint ${number}.`,
    standupQuote: "A quote.",
    archMapDelta: { added: [], changed: [], broke: [], invariants: [] },
    objectives: [
      { id: `obj-${number}`, label: `Objective ${number}`, canDo: `I can do thing ${number}.` },
    ],
  }
}

const SPRINTS: SprintPublic[] = [sprint(1, "Foundations"), sprint(2, "Money and Time")]

describe("SprintMap", () => {
  it("marks sprint 1 Free and every later sprint Pro, with the Pro pill linking to pricing", () => {
    render(<SprintMap sprints={SPRINTS} />)
    expect(screen.getByText("Free")).not.toBeNull()
    expect(screen.getByRole("link", { name: "Pro" }).getAttribute("href")).toBe("/pricing")
  })

  it("expands a row's goal and objectives on click, and collapses it again", () => {
    render(<SprintMap sprints={SPRINTS} />)
    const row = screen.getByRole("button", { name: /Foundations/ })

    expect(screen.queryByText("Goal for sprint 1.")).toBeNull()
    fireEvent.click(row)
    expect(screen.getByText("Goal for sprint 1.")).not.toBeNull()
    expect(screen.getByText("Objective 1")).not.toBeNull()

    fireEvent.click(row)
    expect(screen.queryByText("Goal for sprint 1.")).toBeNull()
  })

  it("treats sprints before currentSprint as done and the current one as current, without navigating", () => {
    render(<SprintMap sprints={SPRINTS} currentSprint={2} />)
    expect(screen.getByText("Done")).not.toBeNull()
    expect(screen.getByText("Current sprint")).not.toBeNull()
    // Only the Pro pill is ever a link; no row itself navigates anywhere.
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
