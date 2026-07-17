/**
 * The rule under test: a value must be distinguishable from its own name.
 *
 * SqlResultGrid used to render a real SQL NULL and the string 'NULL' to byte-identical
 * markup, on a course that teaches NULL semantics. These pin the distinction that fixed it.
 */
import { describe, expect, it } from "vitest"
import { cellToneClass, classifyCell, formatCellText } from "../table-cell"

describe("classifyCell", () => {
  it("separates the values that look alike but are not", () => {
    expect(classifyCell(null)).toBe("null")
    expect(classifyCell(undefined)).toBe("null")
    expect(classifyCell("NULL")).toBe("text")
    expect(classifyCell("")).toBe("empty")
    expect(classifyCell(0)).toBe("number")
    expect(classifyCell("0")).toBe("text")
    expect(classifyCell(false)).toBe("boolean")
  })
})

describe("formatCellText", () => {
  it("names the values that would otherwise be invisible", () => {
    expect(formatCellText(null)).toBe("NULL")
    expect(formatCellText("")).toBe("''")
  })

  it("renders booleans as SQL-ish words, not 1/0", () => {
    expect(formatCellText(true)).toBe("true")
    expect(formatCellText(false)).toBe("false")
  })

  it("leaves real data alone", () => {
    expect(formatCellText("alice")).toBe("alice")
    expect(formatCellText(1200)).toBe("1200")
    expect(formatCellText(0)).toBe("0")
  })
})

describe("cellToneClass", () => {
  /**
   * The text alone cannot carry the distinction — a NULL and the string 'NULL' produce the
   * same characters on purpose, because "NULL" IS what a null should say. The tone is what
   * makes them tellable apart, so this is the assertion that matters.
   */
  it("marks a real NULL italic and leaves the string 'NULL' upright", () => {
    expect(cellToneClass(null)).toContain("italic")
    expect(cellToneClass("NULL")).not.toContain("italic")
    expect(formatCellText(null)).toBe(formatCellText("NULL"))
  })

  it("right-aligns numbers with tabular-nums so columns compare", () => {
    expect(cellToneClass(1200)).toContain("text-right")
    expect(cellToneClass(1200)).toContain("tabular-nums")
  })

  it("does not right-align a numeric-looking string", () => {
    // A CHAR column of digits is text; aligning it would imply arithmetic that isn't there.
    expect(cellToneClass("1200")).not.toContain("text-right")
  })

  it("leaves ordinary text unstyled", () => {
    expect(cellToneClass("alice")).toBe("")
  })
})
