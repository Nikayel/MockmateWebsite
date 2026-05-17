import { describe, expect, it } from "vitest"
import { VECTOR_CONTENT_TYPES } from "../types"

describe("RAG vector content types", () => {
  it("includes all namespaces written by the vectorization and personalization pipelines", () => {
    expect(VECTOR_CONTENT_TYPES).toEqual(
      expect.arrayContaining([
        "problem",
        "solution",
        "hint",
        "feedback",
        "onboarding",
        "knowledge",
        "company",
        "company-question",
        "system-design",
        "bugfix",
        "pattern-knowledge",
        "user-performance",
      ])
    )
  })
})
