/**
 * @vitest-environment jsdom
 *
 * SprintLabsSection is what `/labs` mounts when the flag is on. It must render whatever the
 * registry returns generically (never a hardcoded workbook id) plus exactly the one static `sbx`
 * placeholder card, and the section must expose the `#sprint-labs` anchor the jump strip targets.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SprintLabsSection } from "../SprintLabsSection"
import type { WorkbookSummary } from "@/lib/sprint-labs/types"

afterEach(cleanup)

const RUNNABLE: WorkbookSummary = {
  id: "fixture-demo",
  title: "Fixture Demo: Contracts Sprint",
  pitch: "A tiny two-ticket workbook.",
  track: "Systems / Backend",
  language: "typescript",
  level: "Junior / Mid",
  topics: ["typescript"],
  sprintCount: 1,
  ticketCount: 2,
  estimatedHours: 2,
  requiresServerExecution: false,
  objectives: [{ id: "a", label: "Typed boundaries", canDo: "I can narrow an any-typed input." }],
}

const NOT_RUNNABLE: WorkbookSummary = {
  ...RUNNABLE,
  id: "future-workbook",
  title: "Future Workbook",
  requiresServerExecution: true,
}

describe("SprintLabsSection", () => {
  it("exposes the #sprint-labs anchor target the /labs jump strip points at", () => {
    const { container } = render(<SprintLabsSection workbooks={[RUNNABLE]} />)
    expect(container.querySelector("#sprint-labs")).not.toBeNull()
  })

  it("counts the sbx placeholder alongside every compiled workbook in the pill", () => {
    render(<SprintLabsSection workbooks={[RUNNABLE]} />)
    // 1 compiled workbook + the sbx placeholder = 2.
    expect(screen.getByText("2 workbooks")).not.toBeNull()
  })

  it("renders a compiled workbook as playable and the sbx placeholder as locked, without hardcoding compiled ids", () => {
    render(<SprintLabsSection workbooks={[RUNNABLE]} />)
    const links = screen.getAllByRole("link")
    expect(links.some((link) => link.getAttribute("href") === "/sprint-labs/fixture-demo")).toBe(
      true
    )
    expect(screen.getByText("Prove It")).not.toBeNull()
    expect(links.some((link) => link.getAttribute("href") === "/sprint-labs/sbx")).toBe(false)
  })

  it("locks a compiled workbook whose capability check fails, even though it has real content", () => {
    render(<SprintLabsSection workbooks={[NOT_RUNNABLE]} />)
    // Both cards are locked here (the compiled one and the sbx placeholder), so there is no link at
    // all; `queryAllByRole` (not `getAllByRole`, which throws on an empty result) proves it.
    const links = screen.queryAllByRole("link")
    expect(links.some((link) => link.getAttribute("href") === "/sprint-labs/future-workbook")).toBe(
      false
    )
  })
})
