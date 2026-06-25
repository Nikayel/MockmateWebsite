import { describe, expect, it } from "vitest"
import { buildFeedbackSystemInstruction } from "../system-instructions"

describe("buildFeedbackSystemInstruction", () => {
  it("builds DSA instructions by default", () => {
    const instruction = buildFeedbackSystemInstruction("dsa")

    expect(instruction).toContain("senior interviewer")
    expect(instruction).toContain("HANDLING INCOMPLETE/STUB SOLUTIONS")
    expect(instruction).toContain("DSA FOCUS")
  })

  it("builds bugfix instructions", () => {
    const instruction = buildFeedbackSystemInstruction("bugfix")

    expect(instruction).toContain("senior debugging expert")
    expect(instruction).toContain("OUTPUT FORMAT FOR BUG FIX")
    expect(instruction).toContain("BUG FIX FOCUS")
  })

  it("builds system design instructions", () => {
    const instruction = buildFeedbackSystemInstruction("system-design")

    expect(instruction).toContain("senior system design interviewer")
    expect(instruction).toContain("OUTPUT FORMAT FOR SYSTEM DESIGN")
    expect(instruction).toContain("SYSTEM DESIGN FOCUS")
  })
})
