/**
 * SprintLabProWall — the sprint >= 2 upsell state, shared by standup and board (UX-SPEC.md §12.6).
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SprintLabProWall } from "../SprintLabProWall"

describe("SprintLabProWall", () => {
  it("names the sprint number and links to pricing", () => {
    const html = renderToStaticMarkup(<SprintLabProWall sprintNumber={2} />)
    expect(html).toContain("Sprint 2")
    expect(html).toContain('href="/pricing"')
    expect(html).toContain("See Pro")
  })

  it("includes the sprint title and goal when supplied, without fabricating them", () => {
    const html = renderToStaticMarkup(
      <SprintLabProWall
        sprintNumber={2}
        sprintTitle="Money and Time"
        sprintGoal="Reconcile the ledger."
      />
    )
    expect(html).toContain("Money and Time")
    expect(html).toContain("Reconcile the ledger.")
  })

  it("degrades to a generic line when the locked sprint has not compiled yet", () => {
    const html = renderToStaticMarkup(<SprintLabProWall sprintNumber={2} />)
    expect(html).toContain("Sprints 2 to 10 need Pro")
  })

  it("reassures that earlier progress is saved", () => {
    const html = renderToStaticMarkup(<SprintLabProWall sprintNumber={2} />)
    expect(html).toContain("saved")
  })

  it("carries no em dash in its own copy", () => {
    const html = renderToStaticMarkup(
      <SprintLabProWall sprintNumber={2} sprintTitle="T" sprintGoal="G" />
    )
    expect(html).not.toContain("—")
  })
})
