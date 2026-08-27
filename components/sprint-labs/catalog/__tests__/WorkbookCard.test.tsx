/**
 * @vitest-environment jsdom
 *
 * WorkbookCard's two variants (UX-SPEC.md §2) must never blur into each other: a playable card is
 * the single click target with no dead affordance, and a locked card is never a link at all, always
 * carries the sandbox message, and never shows a live "Open" control.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { WorkbookCard } from "../WorkbookCard"
import { SERVER_EXECUTION_MESSAGE } from "@/lib/sprint-labs/platform-capabilities"
import type { WorkbookSummary } from "@/lib/sprint-labs/types"

afterEach(cleanup)

const SUMMARY: WorkbookSummary = {
  id: "fixture-demo",
  title: "Fixture Demo: Contracts Sprint",
  pitch: "A tiny two-ticket workbook that exercises the compiler end to end.",
  track: "Systems / Backend",
  language: "typescript",
  level: "Junior / Mid",
  topics: ["typescript", "api-contracts"],
  sprintCount: 1,
  ticketCount: 2,
  estimatedHours: 2,
  requiresServerExecution: false,
  objectives: [
    {
      id: "typed-boundaries",
      label: "Typed boundaries",
      canDo: "I can narrow an any-typed input.",
    },
    {
      id: "contract-versioning",
      label: "Contract versioning",
      canDo: "I can decide when to version an API.",
    },
  ],
}

describe("WorkbookCard playable variant", () => {
  it("makes the whole card a single link to the workbook's overview page", () => {
    render(<WorkbookCard summary={SUMMARY} variant="playable" />)
    const links = screen.getAllByRole("link")
    expect(links.some((link) => link.getAttribute("href") === "/sprint-labs/fixture-demo")).toBe(
      true
    )
    expect(screen.getByText(SUMMARY.title)).not.toBeNull()
    expect(screen.getByText(SUMMARY.pitch)).not.toBeNull()
  })

  it("renders the meter row and the middot-joined topic list", () => {
    render(<WorkbookCard summary={SUMMARY} variant="playable" />)
    expect(screen.getByText("1 sprint - 2 tickets - ~2 h - Junior / Mid")).not.toBeNull()
    expect(screen.getByText("typescript · api-contracts")).not.toBeNull()
  })

  it("renders every objective as a chip and never shows the sandbox message", () => {
    render(<WorkbookCard summary={SUMMARY} variant="playable" />)
    expect(screen.getByText("Typed boundaries")).not.toBeNull()
    expect(screen.getByText("Contract versioning")).not.toBeNull()
    expect(screen.queryByText(SERVER_EXECUTION_MESSAGE)).toBeNull()
  })

  it("titles the card h3 (SprintLabsSection's h2 is the level above) and keeps 'What you'll learn' off the heading outline", () => {
    render(<WorkbookCard summary={SUMMARY} variant="playable" />)
    expect(screen.getByRole("heading", { level: 3, name: SUMMARY.title })).not.toBeNull()
    // "What you'll learn" is real, visible text, just not a heading (ObjectiveList's headingLevel="none").
    expect(screen.getByText("What you'll learn").tagName).toBe("SPAN")
  })

  it("fix round 1, I1: the footer is not its own stacking layer, so the stretched link stays on top", () => {
    // jsdom has no real layout/paint engine, so a pixel-accurate hit-test can't run here; this pins
    // the mechanism the fix actually relies on (CSS2.1 stacking order, see WorkbookCard.tsx's
    // comment at the footer) rather than the visual symptom. Before the fix this div carried
    // `relative` unconditionally, which put it in the SAME step-6 stacking slot as the stretched
    // link and, being later in the DOM, painted (and hit-tested) on top of it everywhere in its
    // bounds — including over the decorative "Open" text, with nothing underneath to catch the
    // click.
    const { container } = render(<WorkbookCard summary={SUMMARY} variant="playable" />)
    const footer = screen.getByText("Open").closest("div")
    expect(footer).not.toBeNull()
    expect(footer?.className.split(" ")).not.toContain("relative")
    // The stretched link is still there, unobstructed, covering the whole card.
    const stretchedLink = container.querySelector('a[href="/sprint-labs/fixture-demo"]')
    expect(stretchedLink).not.toBeNull()
  })
})

describe("WorkbookCard locked variant", () => {
  it("is never a link to the workbook's route", () => {
    render(<WorkbookCard summary={SUMMARY} variant="locked" />)
    const links = screen.queryAllByRole("link")
    expect(links.some((link) => link.getAttribute("href") === "/sprint-labs/fixture-demo")).toBe(
      false
    )
  })

  it("carries the sandbox message and a 'What runs today' affordance instead of Open", () => {
    render(<WorkbookCard summary={SUMMARY} variant="locked" />)
    expect(screen.getByText(SERVER_EXECUTION_MESSAGE)).not.toBeNull()
    expect(screen.getByRole("button", { name: "What runs today" })).not.toBeNull()
    expect(screen.queryByText("Open")).toBeNull()
  })

  it("accepts a meterOverride for content a single numeric field can't carry", () => {
    render(
      <WorkbookCard
        summary={SUMMARY}
        variant="locked"
        meterOverride="7 sprints - 18 tickets - 12 to 16 h - Senior to staff"
      />
    )
    expect(screen.getByText("7 sprints - 18 tickets - 12 to 16 h - Senior to staff")).not.toBeNull()
  })
})
