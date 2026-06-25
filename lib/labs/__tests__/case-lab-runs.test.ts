/**
 * Validation tests for the Case Lab run input schema (trust boundary).
 */

import { describe, it, expect } from "vitest"
import { caseLabRunInputSchema } from "../case-lab-runs"

const validInput = {
  caseLabId: "palantir-911-dispatch",
  mode: "practice",
  status: "in_progress",
  currentMilestone: "clarify",
}

describe("caseLabRunInputSchema", () => {
  it("accepts a minimal valid input", () => {
    const result = caseLabRunInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("accepts optional id, answers, milestoneStatus, completedAt", () => {
    const result = caseLabRunInputSchema.safeParse({
      ...validInput,
      id: "run_123",
      status: "completed",
      completedAt: "2026-06-25T12:00:00.000Z",
      answers: { clarify: [{ dimension: "scale", question: "q", assumption: "a" }] },
      milestoneStatus: { clarify: "done", design: "active" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects a missing caseLabId", () => {
    const { caseLabId, ...rest } = validInput
    void caseLabId
    expect(caseLabRunInputSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects an unknown mode", () => {
    const result = caseLabRunInputSchema.safeParse({ ...validInput, mode: "exam" })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown milestone kind", () => {
    const result = caseLabRunInputSchema.safeParse({
      ...validInput,
      currentMilestone: "implement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid milestoneStatus value", () => {
    const result = caseLabRunInputSchema.safeParse({
      ...validInput,
      milestoneStatus: { clarify: "skipped" },
    })
    expect(result.success).toBe(false)
  })
})
