import { describe, expect, it } from "vitest"
import { buildBM25DocumentText, rankBM25, tokenizeForBM25 } from "../retrieval/bm25"

describe("BM25 retrieval", () => {
  it("tokenizes text with case, punctuation, and hyphen variants", () => {
    expect(tokenizeForBM25("Sliding-Window O(log n) with HashMap")).toEqual(
      expect.arrayContaining(["sliding-window", "sliding", "window", "o", "log", "n", "hashmap"])
    )
  })

  it("weights metadata text so exact titles and patterns are retrievable", () => {
    const text = buildBM25DocumentText({
      id: "problem-dsa-longest-substring",
      text: "Find the longest substring without repeated characters.",
      metadata: {
        title: "Longest Substring Without Repeating Characters",
        pattern: "sliding-window",
        tags: ["strings", "hash-map"],
      },
    })

    expect(text.toLowerCase()).toContain("longest substring")
    expect(text.toLowerCase()).toContain("sliding-window")
    expect(text.toLowerCase()).toContain("hash-map")
  })

  it("ranks exact lexical matches above unrelated documents", () => {
    const results = rankBM25("binary search rotated sorted array", [
      {
        id: "two-sum",
        text: "Find two numbers in an array that add to target.",
        metadata: { title: "Two Sum", pattern: "arrays-hashing" },
      },
      {
        id: "rotated-search",
        text: "Search a rotated sorted array in logarithmic time.",
        metadata: { title: "Search Rotated Sorted Array", pattern: "binary-search" },
      },
    ])

    expect(results[0].document.id).toBe("rotated-search")
    expect(results[0].normalizedScore).toBe(1)
    expect(results[0].matchedTerms).toEqual(expect.arrayContaining(["binary", "search"]))
  })

  it("returns an empty result for empty queries or corpora", () => {
    expect(rankBM25("", [{ id: "x", text: "hello" }])).toEqual([])
    expect(rankBM25("hello", [])).toEqual([])
  })
})
