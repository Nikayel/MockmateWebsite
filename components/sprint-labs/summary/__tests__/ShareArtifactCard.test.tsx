/**
 * @vitest-environment jsdom
 *
 * ShareArtifactCard — the task's own verification bar: "summary labels model-id + policy split."
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ShareArtifactCard } from "../ShareArtifactCard"

afterEach(cleanup)

describe("ShareArtifactCard", () => {
  it("labels the model id and the graded/assisted policy split", () => {
    render(
      <ShareArtifactCard
        workbookTitle="Meridian"
        ticketsShipped={12}
        pointsShipped={63}
        gradedCount={5}
        assistedCount={7}
        unassistedGradedCount={2}
        reviewOnlyGradedCount={3}
        gradedEscapedRatePercent={9}
        scoredAt="2026-08-26T00:00:00.000Z"
        modelId="claude-x-y"
      />
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("model claude-x-y")
    expect(text).toContain("2 unassisted")
    expect(text).toContain("3 review only")
    expect(text).toContain("7 assisted (not graded)")
    expect(text).toContain("Scored 2026-08-26")
  })

  it("is honest when the model id was never recorded, never fabricates one", () => {
    render(
      <ShareArtifactCard
        workbookTitle="Meridian"
        ticketsShipped={1}
        pointsShipped={5}
        gradedCount={1}
        assistedCount={0}
        unassistedGradedCount={1}
        reviewOnlyGradedCount={0}
        gradedEscapedRatePercent={0}
        scoredAt="2026-08-26T00:00:00.000Z"
        modelId={null}
      />
    )
    expect(document.body.textContent).toContain("model not recorded")
  })

  it("renders no Copy-link action (R7: no public share route exists in v1)", () => {
    render(
      <ShareArtifactCard
        workbookTitle="Meridian"
        ticketsShipped={1}
        pointsShipped={5}
        gradedCount={1}
        assistedCount={0}
        unassistedGradedCount={1}
        reviewOnlyGradedCount={0}
        gradedEscapedRatePercent={0}
        scoredAt="2026-08-26T00:00:00.000Z"
        modelId="claude-x-y"
      />
    )
    expect(screen.queryByRole("button", { name: /copy link/i })).toBeNull()
    expect(screen.queryByRole("link", { name: /copy link/i })).toBeNull()
  })

  it("says 'not yet scored' rather than a fabricated date when nothing has been graded", () => {
    render(
      <ShareArtifactCard
        workbookTitle="Meridian"
        ticketsShipped={0}
        pointsShipped={0}
        gradedCount={0}
        assistedCount={0}
        unassistedGradedCount={0}
        reviewOnlyGradedCount={0}
        gradedEscapedRatePercent={null}
        scoredAt={null}
        modelId={null}
      />
    )
    expect(document.body.textContent).toContain("Not yet scored")
  })
})
