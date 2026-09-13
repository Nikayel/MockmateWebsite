import { describe, expect, it } from "vitest"
import { createEmptyTracker } from "../tracker"
import { updateTrackerFromMessage } from "../tracker"

describe("candidate edge-case tracking", () => {
  it("does not count a broad request as an identified edge case", () => {
    const tracker = updateTrackerFromMessage(
      createEmptyTracker(),
      "Any edge cases that I have to worry about?",
      "user"
    )

    expect(tracker.edgeCasesMentioned).toEqual([])
  })

  it("still counts a concrete case the candidate identifies", () => {
    const tracker = updateTrackerFromMessage(
      createEmptyTracker(),
      "I would test an empty input first.",
      "user"
    )

    expect(tracker.edgeCasesMentioned).toContain("empty")
  })
})

describe("candidate complexity tracking", () => {
  it("leaves free-form complexity claims to semantic transcript evaluation", () => {
    const tracker = updateTrackerFromMessage(
      createEmptyTracker(),
      "Sorting is O(n log n), and for the space we may store every interval, so O(n).",
      "user"
    )

    expect(tracker.timeComplexityMentioned).toBe(false)
    expect(tracker.spaceComplexityMentioned).toBe(false)
    expect(tracker.complexityExplanationGiven).toBe(false)
  })
})
