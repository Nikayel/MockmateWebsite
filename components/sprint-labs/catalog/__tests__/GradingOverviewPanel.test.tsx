/**
 * GradingOverviewPanel is fully static (no props, no state), so a plain server-string render is
 * enough to pin its content. UX-SPEC.md §8's four gate definitions are fixed platform copy — this
 * catches a dropped gate or a paraphrased definition drifting from the submit screen's own copy.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { GradingOverviewPanel } from "../GradingOverviewPanel"

describe("GradingOverviewPanel", () => {
  const html = renderToStaticMarkup(<GradingOverviewPanel />)

  it("names all four gates in order", () => {
    const visibleIndex = html.indexOf("Visible")
    const hiddenIndex = html.indexOf("Hidden")
    const regressionIndex = html.indexOf("Regression")
    const adversaryIndex = html.indexOf("Adversary")
    expect(visibleIndex).toBeGreaterThan(-1)
    expect(hiddenIndex).toBeGreaterThan(visibleIndex)
    expect(regressionIndex).toBeGreaterThan(hiddenIndex)
    expect(adversaryIndex).toBeGreaterThan(regressionIndex)
  })

  it("carries no em dash in its learner-facing copy", () => {
    expect(html).not.toContain("—")
  })
})
