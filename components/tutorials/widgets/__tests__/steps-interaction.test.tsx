// @vitest-environment jsdom
/**
 * Interaction tests for the steps frame stager (Iteration 11 exit criteria):
 * Prev/Next walk the authored frames, a predict-gated frame demands a committed
 * guess before revealing, and the reveal shows the gated frame's content.
 */
import { describe, it, expect, afterEach } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import { WidgetBody } from "../WidgetBody"

afterEach(cleanup)

const spec = {
  type: "steps",
  title: "Log compaction",
  frames: [
    {
      note: "Segment holds three writes; k1 appears twice.",
      rows: [
        {
          label: "segment",
          cells: [{ text: "k1=1" }, { text: "k2=5" }, { text: "k1=9", state: "new" }],
        },
      ],
    },
    {
      note: "Compaction keeps only the LATEST value per key.",
      predict: { question: "Which entry survives for k1?", options: ["k1=1", "k1=9"] },
      rows: [
        {
          label: "compacted",
          cells: [
            { text: "k1=1", state: "dropped" },
            { text: "k2=5" },
            { text: "k1=9", state: "active" },
          ],
        },
      ],
    },
    {
      note: "The old entry is gone; the segment shrank.",
      rows: [{ label: "compacted", cells: [{ text: "k2=5" }, { text: "k1=9" }] }],
    },
  ],
}

function renderSteps() {
  const parsed = parseWidgetSpec(JSON.stringify(spec))
  if (!parsed.ok) throw new Error(parsed.error)
  render(<WidgetBody spec={parsed.spec} />)
}

describe("steps stager interaction", () => {
  it("renders frame 1 with its note and cells", () => {
    renderSteps()
    expect(screen.getByText("Segment holds three writes; k1 appears twice.")).toBeDefined()
    expect(screen.getByText("k1=1")).toBeDefined()
    expect(screen.getByText("1 / 3")).toBeDefined()
  })

  it("gates a predict frame behind a committed guess, then reveals it", () => {
    renderSteps()
    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    // The gate replaces the frame: question visible, frame-2 note NOT yet.
    expect(screen.getByText("Which entry survives for k1?")).toBeDefined()
    expect(screen.queryByText("Compaction keeps only the LATEST value per key.")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "k1=9" }))
    expect(screen.getByText("Compaction keeps only the LATEST value per key.")).toBeDefined()
    expect(screen.getByText("2 / 3")).toBeDefined()
  })

  it("walks forward and back without re-gating an answered predict", () => {
    renderSteps()
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "k1=9" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("The old entry is gone; the segment shrank.")).toBeDefined()
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true)

    fireEvent.click(screen.getByRole("button", { name: "Prev" }))
    // Answered gate does not re-arm on the way back (or forward again).
    expect(screen.getByText("Compaction keeps only the LATEST value per key.")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Prev" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("2 / 3")).toBeDefined()
  })
})
