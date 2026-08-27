/**
 * @vitest-environment jsdom
 *
 * ObjectiveList is the shared wrapper every screen uses to show a group of objectives
 * (UX-SPEC.md §1.4): one "Expand all" control drives every chip, and `density` only changes layout,
 * never the interaction.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ObjectiveList } from "../ObjectiveList"
import type { ObjectiveView } from "../ObjectiveChip"

afterEach(cleanup)

const OBJECTIVES: ObjectiveView[] = [
  {
    id: "a",
    label: "Keyset pagination",
    sentence: "I can paginate a large table without an OFFSET scan.",
    state: "not_started",
  },
  {
    id: "b",
    label: "Error taxonomy",
    sentence: "I can map a domain failure to a stable error code.",
    state: "practicing",
  },
]

describe("ObjectiveList", () => {
  it("renders the heading and every objective's label", () => {
    render(<ObjectiveList heading="By Friday you can" density="full" objectives={OBJECTIVES} />)
    expect(screen.getByText("By Friday you can")).not.toBeNull()
    for (const objective of OBJECTIVES) {
      expect(screen.getByText(objective.label)).not.toBeNull()
    }
  })

  it("expands every chip on Expand all, and collapses every chip on a second click", () => {
    render(<ObjectiveList density="chip" objectives={OBJECTIVES} />)
    const toggle = screen.getByRole("button", { name: "Expand all" })

    fireEvent.click(toggle)
    for (const objective of OBJECTIVES) {
      expect(screen.getByText(objective.sentence)).not.toBeNull()
    }
    expect(screen.getByRole("button", { name: "Collapse all" })).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))
    for (const objective of OBJECTIVES) {
      expect(screen.queryByText(objective.sentence)).toBeNull()
    }
  })

  it("toggling one chip does not expand its siblings", () => {
    render(<ObjectiveList density="chip" objectives={OBJECTIVES} />)
    fireEvent.click(screen.getByRole("button", { name: /Keyset pagination/ }))
    expect(screen.getByText(OBJECTIVES[0].sentence)).not.toBeNull()
    expect(screen.queryByText(OBJECTIVES[1].sentence)).toBeNull()
  })

  it("renders an empty-state line and no Expand all control when there are no objectives", () => {
    render(<ObjectiveList density="chip" objectives={[]} />)
    expect(screen.queryByRole("button", { name: /Expand all/ })).toBeNull()
    expect(screen.getByText("No objectives yet.")).not.toBeNull()
  })

  it("chip density wraps inline; full density stacks", () => {
    const { container: chipContainer } = render(
      <ObjectiveList density="chip" objectives={OBJECTIVES} />
    )
    expect(chipContainer.querySelector(".flex-wrap")).not.toBeNull()
    cleanup()
    const { container: fullContainer } = render(
      <ObjectiveList density="full" objectives={OBJECTIVES} />
    )
    expect(fullContainer.querySelector(".flex-wrap")).toBeNull()
  })

  it("fix round 1, M1: defaults the heading to h3, and honors an explicit level", () => {
    const { unmount } = render(
      <ObjectiveList heading="By Friday you can" density="full" objectives={OBJECTIVES} />
    )
    expect(screen.getByRole("heading", { level: 3, name: "By Friday you can" })).not.toBeNull()
    unmount()

    render(
      <ObjectiveList
        heading="What you'll be able to do"
        headingLevel="h2"
        density="full"
        objectives={OBJECTIVES}
      />
    )
    expect(
      screen.getByRole("heading", { level: 2, name: "What you'll be able to do" })
    ).not.toBeNull()
  })

  it("fix round 1, M1: headingLevel='none' keeps the label's look without adding a heading to the outline", () => {
    render(
      <ObjectiveList
        heading="What you'll learn"
        headingLevel="none"
        density="chip"
        objectives={OBJECTIVES}
      />
    )
    expect(screen.queryByRole("heading")).toBeNull()
    const label = screen.getByText("What you'll learn")
    expect(label.tagName).toBe("SPAN")
  })

  it("fix round 1, M5: the objective group is a real list, labelled by the heading, exposing its count", () => {
    render(<ObjectiveList heading="By Friday you can" density="full" objectives={OBJECTIVES} />)
    const list = screen.getByRole("list", { name: "By Friday you can" })
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(OBJECTIVES.length)
    expect(items.every((item) => list.contains(item))).toBe(true)
  })
})
