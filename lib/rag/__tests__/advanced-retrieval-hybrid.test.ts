import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  generateEmbedding: vi.fn(),
  vectorQuery: vi.fn(),
  fetchLexicalCorpus: vi.fn(),
  recordRetrieval: vi.fn(),
}))

vi.mock("../embeddings/hybrid-provider", () => ({
  getHybridProvider: () => ({
    generateEmbedding: mocks.generateEmbedding,
  }),
}))

vi.mock("../vectordb", () => ({
  vectorDB: {
    query: mocks.vectorQuery,
  },
}))

vi.mock("../retrieval/lexical-corpus", () => ({
  fetchLexicalCorpus: mocks.fetchLexicalCorpus,
}))

vi.mock("../monitoring", () => ({
  getRAGMonitor: () => ({
    recordRetrieval: mocks.recordRetrieval,
  }),
}))

describe("AdvancedRetriever hybrid retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateEmbedding.mockResolvedValue([1, 0, 0])
    mocks.vectorQuery.mockResolvedValue([
      {
        id: "semantic-only",
        score: 0.9,
        metadata: { type: "problem", text: "Semantic match for window invariant" },
      },
      {
        id: "overlap",
        score: 0.5,
        metadata: { type: "problem", text: "Binary search over sorted array" },
      },
    ])
    mocks.fetchLexicalCorpus.mockResolvedValue([
      {
        id: "overlap",
        text: "Binary search over sorted array",
        type: "problem",
        metadata: { type: "problem", title: "Binary Search" },
      },
      {
        id: "bm25-only",
        text: "Search rotated sorted array using binary search.",
        type: "problem",
        metadata: { type: "problem", title: "Search Rotated Sorted Array" },
      },
    ])
  })

  it("merges semantic and BM25 candidates with source debug metadata", async () => {
    const { AdvancedRetriever } = await import("../retrieval/advanced-retrieval")
    const retriever = new AdvancedRetriever()

    const { results, analytics } = await retriever.retrieve({
      query: "binary search sorted array",
      types: ["problem"],
      limit: 3,
      strategy: "hybrid",
    })

    expect(results.map((result) => result.id)).toEqual(
      expect.arrayContaining(["semantic-only", "overlap", "bm25-only"])
    )

    const overlap = results.find((result) => result.id === "overlap")
    expect(overlap?.matchedSources).toEqual(expect.arrayContaining(["semantic", "bm25"]))
    expect(overlap?.semanticScore).toBeGreaterThan(0)
    expect(overlap?.bm25Score).toBeGreaterThan(0)

    expect(analytics).toEqual(
      expect.objectContaining({
        strategy: "hybrid",
        semanticCandidateCount: 2,
        bm25CandidateCount: 2,
        overlapCount: 1,
        emptyResult: false,
      })
    )
    expect(mocks.recordRetrieval).toHaveBeenCalledWith(
      3,
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({
        strategy: "hybrid",
        semanticCandidateCount: 2,
        bm25CandidateCount: 2,
        overlapCount: 1,
      })
    )
  })

  it("preserves semantic-only strategy without fetching lexical corpus", async () => {
    const { AdvancedRetriever } = await import("../retrieval/advanced-retrieval")
    const retriever = new AdvancedRetriever()

    const { results, analytics } = await retriever.retrieve({
      query: "window invariant",
      types: ["problem"],
      limit: 2,
      strategy: "semantic",
    })

    expect(results.map((result) => result.id)).toEqual(["semantic-only", "overlap"])
    expect(mocks.fetchLexicalCorpus).not.toHaveBeenCalled()
    expect(analytics.strategy).toBe("semantic")
    expect(analytics.bm25CandidateCount).toBe(0)
  })

  it("queries each requested semantic type instead of only the first type", async () => {
    mocks.vectorQuery.mockImplementation(async (_embedding, options) => {
      if (options.filter.type === "problem") {
        return [
          {
            id: "problem-match",
            score: 0.8,
            metadata: { type: "problem", text: "Problem match" },
          },
        ]
      }

      if (options.filter.type === "hint") {
        return [
          {
            id: "hint-match",
            score: 0.7,
            metadata: { type: "hint", text: "Hint match" },
          },
        ]
      }

      return []
    })

    const { AdvancedRetriever } = await import("../retrieval/advanced-retrieval")
    const retriever = new AdvancedRetriever()

    const { results, analytics } = await retriever.retrieve({
      query: "hash map hint",
      types: ["problem", "hint"],
      limit: 5,
      strategy: "semantic",
    })

    expect(mocks.vectorQuery).toHaveBeenCalledTimes(2)
    expect(mocks.vectorQuery).toHaveBeenNthCalledWith(
      1,
      [1, 0, 0],
      expect.objectContaining({
        filter: expect.objectContaining({ type: "problem" }),
      })
    )
    expect(mocks.vectorQuery).toHaveBeenNthCalledWith(
      2,
      [1, 0, 0],
      expect.objectContaining({
        filter: expect.objectContaining({ type: "hint" }),
      })
    )
    expect(results.map((result) => result.id)).toEqual(["problem-match", "hint-match"])
    expect(analytics.semanticCandidateCount).toBe(2)
  })
})
