import { describe, it, expect } from "vitest"
import { preprocessAsciiArt } from "../markdown/ascii-preprocessor"

/**
 * The preprocessor auto-wraps genuine ASCII diagrams in ``` fences. It must NOT do that
 * to ordinary lesson prose that merely contains an arrow — that regression turned bullet
 * lists like "- **ROW_NUMBER** -> `1,2,3`" into raw monospace blocks in /learn.
 */
describe("preprocessAsciiArt", () => {
  it("leaves a bullet list with ASCII arrows as prose (no code fence)", () => {
    const input = [
      "- **ROW_NUMBER** -> `1, 2, 3, 4`. Always unique.",
      "- **RANK** -> `1, 1, 3, 4`. Ties share a rank, then it skips.",
      "- **DENSE_RANK** -> `1, 1, 2, 3`. Ties share a rank, no skip.",
    ].join("\n")

    const out = preprocessAsciiArt(input)

    expect(out).not.toContain("```")
    expect(out).toBe(input)
  })

  it("leaves a prose line with a unicode arrow alone", () => {
    const input = "A window function maps each input row → one output row, keeping every row."
    expect(preprocessAsciiArt(input)).toBe(input)
  })

  it("still wraps a genuine box-drawing diagram in a fence", () => {
    const input = ["┌────────┐", "│  node  │", "└────────┘"].join("\n")
    const out = preprocessAsciiArt(input)
    expect(out.startsWith("```")).toBe(true)
    expect(out).toContain("│  node  │")
  })

  it("does not double-wrap content already inside a fenced block", () => {
    const input = ["```", "ROW_NUMBER() OVER ( PARTITION BY category )", "```"].join("\n")
    const out = preprocessAsciiArt(input)
    // Exactly the one opening + one closing fence the author wrote.
    expect(out.match(/```/g)?.length).toBe(2)
  })
})
