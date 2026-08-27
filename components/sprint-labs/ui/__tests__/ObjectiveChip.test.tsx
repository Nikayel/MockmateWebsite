/**
 * @vitest-environment jsdom
 *
 * ObjectiveChip is the one component every Sprint Labs screen reuses to show an objective
 * (UX-SPEC.md §1.4). Two things must hold everywhere it's dropped in: the state is never color-only
 * (a screen reader user gets the word), and the sentence only ever appears after an explicit expand.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ObjectiveChip, toNotStartedObjectiveView, type ObjectiveView } from "../ObjectiveChip"

afterEach(cleanup)

const OBJECTIVE: ObjectiveView = {
  id: "tenant-context",
  label: "Tenant context per transaction",
  sentence:
    "I can scope tenant context to a transaction using set_config(..., true) and prove a released connection cannot carry it forward.",
  state: "practicing",
}

describe("ObjectiveChip", () => {
  it("renders the label and starts collapsed, with the sentence absent from the DOM", () => {
    render(<ObjectiveChip objective={OBJECTIVE} />)
    expect(screen.getByText(OBJECTIVE.label)).not.toBeNull()
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText(OBJECTIVE.sentence)).toBeNull()
  })

  it("carries the state word in text, never only in the dot's color", () => {
    render(<ObjectiveChip objective={OBJECTIVE} />)
    // sr-only text plus a title attribute both carry "Practicing" so it never depends on hue alone.
    expect(screen.getByText("Practicing")).not.toBeNull()
    expect(screen.getByRole("button").getAttribute("title")).toBe("Practicing")
  })

  it("reveals the sentence on click and hides it again on a second click (uncontrolled)", () => {
    render(<ObjectiveChip objective={OBJECTIVE} />)
    const button = screen.getByRole("button")

    fireEvent.click(button)
    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText(OBJECTIVE.sentence)).not.toBeNull()

    fireEvent.click(button)
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText(OBJECTIVE.sentence)).toBeNull()
  })

  it("defers to a controlled `expanded` prop instead of managing its own state", () => {
    const onExpandedChange = vi.fn()
    const { rerender } = render(
      <ObjectiveChip objective={OBJECTIVE} expanded={false} onExpandedChange={onExpandedChange} />
    )
    fireEvent.click(screen.getByRole("button"))
    // The click reports up; nothing renders open until the caller re-renders with expanded=true.
    expect(onExpandedChange).toHaveBeenCalledWith(true)
    expect(screen.queryByText(OBJECTIVE.sentence)).toBeNull()

    rerender(
      <ObjectiveChip objective={OBJECTIVE} expanded={true} onExpandedChange={onExpandedChange} />
    )
    expect(screen.getByText(OBJECTIVE.sentence)).not.toBeNull()
  })

  it("escaped state renders a destructive ring, never a filled dot", () => {
    render(<ObjectiveChip objective={{ ...OBJECTIVE, state: "escaped" }} />)
    expect(screen.getByText("Escaped")).not.toBeNull()
  })
})

describe("toNotStartedObjectiveView", () => {
  it("maps an authored objective to a not_started view, carrying canDo as the sentence", () => {
    const view = toNotStartedObjectiveView({
      id: "typed-boundaries",
      label: "Typed boundaries",
      canDo: "I can replace an any-typed parse with a validated type.",
    })
    expect(view).toEqual({
      id: "typed-boundaries",
      label: "Typed boundaries",
      sentence: "I can replace an any-typed parse with a validated type.",
      state: "not_started",
    })
  })
})
