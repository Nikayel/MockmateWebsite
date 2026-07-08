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

  // Regression: the `|---|---|` delimiter row is all `|`/`-`, so BOX_PATTERN
  // fenced it as a code block. That broke the GFM parse — the header fell back
  // to prose, the delimiter became monospace, and the body collapsed into one
  // soft-wrapped line. This was the "unreadable tables" bug in /learn/sql.
  it("leaves a GFM table completely untouched (no fence)", () => {
    const input = [
      "| product | revenue | rn | rnk | dense |",
      "|---|---|---|---|---|",
      "| Earbuds | 500 | 1 | 1 | 1 |",
      "| Headphones | 500 | 2 | 1 | 1 |",
      "| Speaker | 300 | 3 | **3** | **2** |",
    ].join("\n")
    const out = preprocessAsciiArt(input)
    expect(out).not.toContain("```")
    expect(out).toBe(input)
  })

  it("leaves a GFM table with alignment colons untouched", () => {
    const input = ["| a | b |", "| :--- | ---: |", "| 1 | 2 |"].join("\n")
    const out = preprocessAsciiArt(input)
    expect(out).not.toContain("```")
    expect(out).toBe(input)
  })

  it("still fences a box diagram that sits next to prose (not a table)", () => {
    const input = ["A diagram:", "+------+", "| node |", "+------+"].join("\n")
    const out = preprocessAsciiArt(input)
    // `+------+` has no pipe-delimited header above it, so it stays ASCII art.
    expect(out).toContain("```")
    expect(out).toContain("| node |")
  })

  // A dash ruler inside an ASCII diagram (no pipes) must still be fenced — the
  // table passthrough only triggers on a `|`-bearing header + `|---|` delimiter,
  // so it never captures diagram rulers.
  it("still fences a dashed diagram ruler that has no pipes", () => {
    const input = ["Box:", "┌──────┐", "----------", "└──────┘"].join("\n")
    const out = preprocessAsciiArt(input)
    expect(out).toContain("```")
  })
})
