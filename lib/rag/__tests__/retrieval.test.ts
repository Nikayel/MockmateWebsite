/**
 * Tests for RAG retrieval functions
 */

import { calculateSimilarity, findSimilarVectors } from "../retrieval/similarity"
import { matchesFilter, optionsToFilterCriteria, type FilterCriteria } from "../retrieval/filters"

describe("calculateSimilarity", () => {
  it("should calculate cosine similarity correctly", () => {
    const vec1 = [1, 0, 0]
    const vec2 = [1, 0, 0]
    expect(calculateSimilarity(vec1, vec2)).toBeCloseTo(1, 5)
  })

  it("should return 0 for orthogonal vectors", () => {
    const vec1 = [1, 0]
    const vec2 = [0, 1]
    expect(calculateSimilarity(vec1, vec2)).toBeCloseTo(0, 5)
  })
})

describe("findSimilarVectors", () => {
  const mockCandidates = [
    {
      id: "1",
      vector: [1, 0, 0],
      text: "Problem 1: Two Sum",
      type: "problem",
      metadata: { difficulty: "easy", tags: ["arrays", "hash-map"] },
    },
    {
      id: "2",
      vector: [0.9, 0.1, 0],
      text: "Problem 2: Three Sum",
      type: "problem",
      metadata: { difficulty: "medium", tags: ["arrays", "two-pointers"] },
    },
    {
      id: "3",
      vector: [0, 1, 0],
      text: "Solution 1",
      type: "solution",
      metadata: { userId: "user123", tags: ["arrays"] },
    },
    {
      id: "4",
      vector: [0.5, 0.5, 0],
      text: "Hint 1",
      type: "hint",
      metadata: { hintLevel: 1 },
    },
  ]

  it("should find similar vectors based on cosine similarity", () => {
    const queryVector = [1, 0, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, { limit: 2 })

    expect(results.length).toBeLessThanOrEqual(2)
    expect(results[0].id).toBe("1") // Most similar
  })

  it("should respect limit parameter", () => {
    const queryVector = [1, 0, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, { limit: 1 })

    expect(results.length).toBe(1)
  })

  it("should filter by minimum similarity", () => {
    const queryVector = [1, 0, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, {
      minSimilarity: 0.8,
    })

    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.8)
    })
  })

  it("should filter by type", () => {
    const queryVector = [0.5, 0.5, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, {
      type: "problem",
    })

    results.forEach((result) => {
      expect(result.type).toBe("problem")
    })
  })

  it("should exclude specific IDs", () => {
    const queryVector = [1, 0, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, {
      excludeIds: ["1"],
    })

    expect(results.find((r) => r.id === "1")).toBeUndefined()
  })

  it("should filter by userId", () => {
    const queryVector = [0, 1, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, {
      userId: "user123",
    })

    results.forEach((result) => {
      expect(result.metadata?.userId || result.metadata?.user_id).toBe("user123")
    })
  })

  it("should sort results by similarity descending", () => {
    const queryVector = [0.8, 0.2, 0]
    const results = findSimilarVectors(queryVector, mockCandidates, { limit: 3 })

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity)
    }
  })

  it("should handle empty candidates", () => {
    const queryVector = [1, 0, 0]
    const results = findSimilarVectors(queryVector, [])

    expect(results).toEqual([])
  })
})

describe("matchesFilter", () => {
  const createDoc = (overrides = {}) => ({
    id: "doc-1",
    type: "problem",
    metadata: {
      userId: "user123",
      problemId: "prob-1",
      difficulty: "medium",
      tags: ["arrays", "hash-map"],
    },
    ...overrides,
  })

  it("should match document with no filter criteria", () => {
    const doc = createDoc()
    const criteria: FilterCriteria = {}
    expect(matchesFilter(doc, criteria)).toBe(true)
  })

  it("should filter by type", () => {
    const doc = createDoc({ type: "problem" })

    expect(matchesFilter(doc, { type: "problem" })).toBe(true)
    expect(matchesFilter(doc, { type: "solution" })).toBe(false)
  })

  it("should exclude specific IDs", () => {
    const doc = createDoc({ id: "exclude-me" })

    expect(matchesFilter(doc, { excludeIds: ["exclude-me"] })).toBe(false)
    expect(matchesFilter(doc, { excludeIds: ["other-id"] })).toBe(true)
  })

  it("should filter by userId", () => {
    const doc = createDoc()

    expect(matchesFilter(doc, { userId: "user123" })).toBe(true)
    expect(matchesFilter(doc, { userId: "other-user" })).toBe(false)
  })

  it("should filter by user_id (backwards compatibility)", () => {
    const doc = createDoc({
      metadata: { user_id: "user456" },
    })

    expect(matchesFilter(doc, { userId: "user456" })).toBe(true)
  })

  it("should filter by problemId", () => {
    const doc = createDoc()

    expect(matchesFilter(doc, { problemId: "prob-1" })).toBe(true)
    expect(matchesFilter(doc, { problemId: "prob-2" })).toBe(false)
  })

  it("should filter by difficulty", () => {
    const doc = createDoc()

    expect(matchesFilter(doc, { difficulty: "medium" })).toBe(true)
    expect(matchesFilter(doc, { difficulty: "easy" })).toBe(false)
  })

  it("should filter by problemType (checking tags)", () => {
    const doc = createDoc()

    expect(matchesFilter(doc, { problemType: "arrays" })).toBe(true)
    expect(matchesFilter(doc, { problemType: "trees" })).toBe(false)
  })

  it("should filter by tags (all must be present)", () => {
    const doc = createDoc()

    expect(matchesFilter(doc, { tags: ["arrays"] })).toBe(true)
    expect(matchesFilter(doc, { tags: ["arrays", "hash-map"] })).toBe(true)
    expect(matchesFilter(doc, { tags: ["arrays", "trees"] })).toBe(false)
  })

  it("should combine multiple filters", () => {
    const doc = createDoc()

    expect(
      matchesFilter(doc, {
        type: "problem",
        userId: "user123",
        difficulty: "medium",
      })
    ).toBe(true)

    expect(
      matchesFilter(doc, {
        type: "problem",
        userId: "user123",
        difficulty: "hard", // Wrong difficulty
      })
    ).toBe(false)
  })
})

describe("optionsToFilterCriteria", () => {
  it("should convert SimilaritySearchOptions to FilterCriteria", () => {
    const options = {
      type: "problem" as const,
      userId: "user123",
      problemType: "arrays",
      excludeIds: ["id1", "id2"],
    }

    const criteria = optionsToFilterCriteria(options)

    expect(criteria.type).toBe("problem")
    expect(criteria.userId).toBe("user123")
    expect(criteria.problemType).toBe("arrays")
    expect(criteria.excludeIds).toEqual(["id1", "id2"])
  })

  it("should handle empty options", () => {
    const criteria = optionsToFilterCriteria({})

    expect(criteria.type).toBeUndefined()
    expect(criteria.userId).toBeUndefined()
  })
})
