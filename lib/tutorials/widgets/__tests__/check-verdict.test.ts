/**
 * The widget renders its own verdict chip ("Correct." / "Not quite.") immediately before
 * the author's feedback, and the authoring convention across ~400 checks is to open that
 * feedback with a verdict too. On screen that reads "Correct. Right. Replication fans
 * out reads…". These pin the de-duplication, including the cases it must NOT touch.
 */
import { describe, it, expect } from "vitest"
import { stripLeadingVerdict } from "@/components/tutorials/widgets/CheckWidget"

describe("stripLeadingVerdict", () => {
  it("removes the duplicated opener the house style produces", () => {
    expect(stripLeadingVerdict("Right. The leader is still the ceiling.")).toBe(
      "The leader is still the ceiling."
    )
    expect(stripLeadingVerdict("Correct. Sets need hashable members.")).toBe(
      "Sets need hashable members."
    )
    expect(stripLeadingVerdict("Not quite. Slicing clamps, indexing raises.")).toBe(
      "Slicing clamps, indexing raises."
    )
  })

  it("is case insensitive and handles the other punctuation authors use", () => {
    expect(stripLeadingVerdict("RIGHT! Threads do not help here.")).toBe(
      "Threads do not help here."
    )
    expect(stripLeadingVerdict("Exactly: the GIL is the ceiling.")).toBe("the GIL is the ceiling.")
  })

  it("leaves feedback alone when the opener is a real word, not a verdict", () => {
    // The regex must not eat the start of a sentence that merely begins similarly.
    expect(stripLeadingVerdict("Correctness depends on the encoding.")).toBe(
      "Correctness depends on the encoding."
    )
    expect(stripLeadingVerdict("Rightward shifts divide by two.")).toBe(
      "Rightward shifts divide by two."
    )
    expect(stripLeadingVerdict("No-op functions still return None.")).toBe(
      "No-op functions still return None."
    )
  })

  it("only strips at the start, never mid-sentence", () => {
    expect(stripLeadingVerdict("This is correct. And it matters.")).toBe(
      "This is correct. And it matters."
    )
  })

  it("handles empty feedback without throwing", () => {
    expect(stripLeadingVerdict("")).toBe("")
  })
})
