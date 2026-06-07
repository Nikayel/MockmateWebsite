import { describe, expect, it } from "vitest"
import {
  buildRetrievalEvalResult,
  calculateRetrievalMetrics,
  summarizeRetrievalEval,
} from "../evaluation/metrics"

describe("retrieval evaluation metrics", () => {
  it("calculates precision, recall, hit rate, and MRR from labeled ids", () => {
    const metrics = calculateRetrievalMetrics(
      ["problem-two-sum", "problem-binary-search", "problem-koko"],
      ["problem-binary-search", "problem-koko", "problem-rotated-search"],
      [1, 2, 3]
    )

    expect(metrics.precisionAtK[1]).toBe(0)
    expect(metrics.precisionAtK[2]).toBe(0.5)
    expect(metrics.recallAtK[3]).toBeCloseTo(2 / 3)
    expect(metrics.hitAtK[2]).toBe(true)
    expect(metrics.firstRelevantRank).toBe(2)
    expect(metrics.mrr).toBe(0.5)
  })

  it("builds and summarizes eval results", () => {
    const passing = buildRetrievalEvalResult(
      {
        query: "binary search",
        relevantIds: ["problem-binary-search"],
        category: "dsa",
      },
      [{ id: "problem-binary-search", score: 0.9 }],
      [1, 5]
    )
    const failing = buildRetrievalEvalResult(
      {
        query: "google interview",
        relevantIds: ["company-google"],
        category: "company",
      },
      [{ id: "company-amazon", score: 0.8 }],
      [1, 5]
    )

    const summary = summarizeRetrievalEval([passing, failing], [1, 5])

    expect(passing.passed).toBe(true)
    expect(failing.passed).toBe(false)
    expect(summary.total).toBe(2)
    expect(summary.passRate).toBe(50)
    expect(summary.meanMrr).toBe(0.5)
    expect(summary.byCategory.dsa.passRate).toBe(100)
    expect(summary.byCategory.company.passRate).toBe(0)
  })
})
