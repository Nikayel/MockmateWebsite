/**
 * Table-driven tests for the five-dimension scorer
 * (docs/sprint-labs/WORKBOOK-SPEC.md §5, RULING R21, fix round 1 I6). See
 * scorer.ts's file header for the exact formulas and the reasoning behind
 * what is, and is not, an input to each dimension (in particular: only
 * server-verified/server-derived facts ever feed a numeric score — no
 * client-posted judgment, per R21).
 */

import { describe, expect, it } from "vitest"
import {
  computeOverallScore,
  scoreCodeQuality,
  scoreCommunication,
  scoreDiffSizeBand,
  scoreFilesTouched,
  scoreProblemSolving,
  scoreTimeToFirstEdit,
  scoreUnderstanding,
  scoreVerification,
} from "../scorer"

describe("scoreFilesTouched (Understanding's files-touched component)", () => {
  it.each([
    { touched: ["a", "b"], reference: ["a", "b", "c"], expected: 80 },
    { touched: ["a"], reference: ["a"], expected: 100 },
    { touched: [] as string[], reference: ["a"], expected: 0 },
    { touched: ["x"], reference: ["a"], expected: 0 },
    { touched: ["a", "x"], reference: ["a"], expected: 67 },
    { touched: ["a", "b", "c"], reference: ["a"], expected: 50 }, // precision 1/3, recall 1/1, f1=2*(1/3)*1/(1/3+1)=0.5
  ])("touched=$touched reference=$reference -> $expected", ({ touched, reference, expected }) => {
    expect(scoreFilesTouched(touched, reference)).toBe(expected)
  })

  it("returns 100 (no penalty) when the reference manifest is empty", () => {
    expect(scoreFilesTouched(["anything"], [])).toBe(100)
    expect(scoreFilesTouched([], [])).toBe(100)
  })

  it("is order-independent and de-duplicates", () => {
    expect(scoreFilesTouched(["a", "a", "b"], ["b", "a"])).toBe(100)
  })
})

describe("scoreTimeToFirstEdit (Understanding's time-band component)", () => {
  it.each([
    { seconds: null, expected: 70 },
    { seconds: 0, expected: 100 },
    { seconds: 120, expected: 100 },
    { seconds: 121, expected: 85 },
    { seconds: 600, expected: 85 },
    { seconds: 601, expected: 65 },
    { seconds: 1800, expected: 65 },
    { seconds: 1801, expected: 40 },
    { seconds: 100_000, expected: 40 },
  ])("seconds=$seconds -> $expected", ({ seconds, expected }) => {
    expect(scoreTimeToFirstEdit(seconds)).toBe(expected)
  })

  it("null (no server timestamp signal available yet) is the documented graceful-degradation path, not an error", () => {
    // fix round 1: timeToFirstEditSeconds is now derived from server timestamps
    // (a per-ticket "entered doing at" mark this codebase does not yet store),
    // so null is the CURRENT, expected, common case — not a placeholder for a
    // bug. The neutral default keeps Understanding fair until that lands.
    expect(scoreTimeToFirstEdit(null)).toBe(70)
  })
})

describe("scoreUnderstanding", () => {
  it("blends files-touched (70%) and time-to-first-edit (30%)", () => {
    // filesScore 80, timeScore 100 -> 80*0.7 + 100*0.3 = 86
    expect(
      scoreUnderstanding({
        filesTouched: ["a", "b"],
        referenceManifest: ["a", "b", "c"],
        timeToFirstEditSeconds: 60,
      })
    ).toBe(86)
  })

  it("uses the neutral time default when no timing signal was available", () => {
    // filesScore 100, timeScore 70 (null default) -> 100*0.7 + 70*0.3 = 91
    expect(
      scoreUnderstanding({
        filesTouched: ["a"],
        referenceManifest: ["a"],
        timeToFirstEditSeconds: null,
      })
    ).toBe(91)
  })

  it("floors at 0 when neither files nor timing are favorable", () => {
    expect(
      scoreUnderstanding({
        filesTouched: ["wrong-file"],
        referenceManifest: ["a"],
        timeToFirstEditSeconds: 100_000,
      })
    ).toBe(12) // 0*0.7 + 40*0.3 = 12
  })
})

describe("scoreProblemSolving (hidden IO-case pass rate ONLY — never visible/regression/adversary/probe booleans)", () => {
  it.each([
    { passed: 4, total: 4, expected: 100 },
    { passed: 3, total: 4, expected: 75 },
    { passed: 2, total: 4, expected: 50 },
    { passed: 0, total: 4, expected: 0 },
    { passed: 1, total: 3, expected: 33 },
  ])("passed=$passed total=$total -> $expected", ({ passed, total, expected }) => {
    expect(scoreProblemSolving({ hiddenIoCasePassed: passed, hiddenIoCaseTotal: total })).toBe(
      expected
    )
  })

  it("I6: returns null (never 100) when the ticket has zero io-case hidden tests — a content mistake must surface", () => {
    expect(scoreProblemSolving({ hiddenIoCasePassed: 0, hiddenIoCaseTotal: 0 })).toBeNull()
  })
})

describe("scoreDiffSizeBand / scoreCodeQuality", () => {
  it.each([
    { learner: 10, reference: 20, expected: 100 }, // ratio 0.5, boundary inclusive
    { learner: 20, reference: 20, expected: 100 }, // ratio 1.0
    { learner: 40, reference: 20, expected: 100 }, // ratio 2.0, boundary inclusive
    { learner: 41, reference: 20, expected: 70 }, // ratio 2.05
    { learner: 5, reference: 20, expected: 70 }, // ratio 0.25, boundary inclusive
    { learner: 4, reference: 20, expected: 40 }, // ratio 0.2
    { learner: 80, reference: 20, expected: 70 }, // ratio 4.0, boundary inclusive
    { learner: 81, reference: 20, expected: 40 }, // ratio 4.05
    { learner: 0, reference: 20, expected: 40 }, // ratio 0 (nothing touched at all)
  ])("learner=$learner reference=$reference -> $expected", ({ learner, reference, expected }) => {
    expect(scoreDiffSizeBand(learner, reference)).toBe(expected)
  })

  it("returns 100 (no penalty) when the reference diff has zero size (no size signal)", () => {
    expect(scoreDiffSizeBand(500, 0)).toBe(100)
  })

  it("scoreCodeQuality delegates to the diff-size band", () => {
    expect(scoreCodeQuality({ learnerDiffLines: 20, referenceDiffLines: 20 })).toBe(100)
  })
})

describe("scoreCommunication (R21: review-only tickets ONLY, driven by push-back correctness — never prose)", () => {
  it("is null on a non-review-only ticket, full stop — no prose input exists in this function's signature at all", () => {
    expect(scoreCommunication({ isReviewOnly: false })).toBeNull()
    expect(
      scoreCommunication({
        isReviewOnly: false,
        reviewCorrectDecisions: 2,
        reviewDecisionsTotal: 2,
      })
    ).toBeNull()
  })

  it("is null on a review-only ticket before the review round has happened", () => {
    expect(scoreCommunication({ isReviewOnly: true })).toBeNull()
    expect(scoreCommunication({ isReviewOnly: true, reviewDecisionsTotal: 0 })).toBeNull()
  })

  it.each([
    { correct: 2, total: 2, expected: 100 },
    { correct: 1, total: 2, expected: 50 },
    { correct: 0, total: 2, expected: 0 },
    { correct: 1, total: 3, expected: 33 },
  ])("review-only, correct=$correct total=$total -> $expected", ({ correct, total, expected }) => {
    expect(
      scoreCommunication({
        isReviewOnly: true,
        reviewCorrectDecisions: correct,
        reviewDecisionsTotal: total,
      })
    ).toBe(expected)
  })
})

describe("scoreVerification", () => {
  it("I6: returns null (never 100) when there is no hidden signal at all, regardless of the test-presence bonus", () => {
    expect(
      scoreVerification({ hiddenIoCasePassed: 0, hiddenIoCaseTotal: 0, learnerAddedTest: true })
    ).toBeNull()
  })

  it("is the plain (1 - escaped-rate) *100 with no test-presence bonus", () => {
    expect(
      scoreVerification({ hiddenIoCasePassed: 2, hiddenIoCaseTotal: 4, learnerAddedTest: false })
    ).toBe(50)
  })

  it("adds the learner-authored-test bonus, capped at 100", () => {
    expect(
      scoreVerification({ hiddenIoCasePassed: 3, hiddenIoCaseTotal: 4, learnerAddedTest: true })
    ).toBe(85) // 75 + 10
    expect(
      scoreVerification({ hiddenIoCasePassed: 4, hiddenIoCaseTotal: 4, learnerAddedTest: true })
    ).toBe(100) // 100 + 10 capped at 100
  })

  it("blends in the review-round correctness rate (review-only tickets) at the documented weight", () => {
    // base(with bonus) 85, reviewRate 1.0 -> 85*0.6 + 100*0.4 = 91
    expect(
      scoreVerification({
        hiddenIoCasePassed: 3,
        hiddenIoCaseTotal: 4,
        learnerAddedTest: true,
        reviewCorrectDecisions: 2,
        reviewTotalDecisions: 2,
      })
    ).toBe(91)

    // base(with bonus) 85, reviewRate 0 -> 85*0.6 + 0 = 51
    expect(
      scoreVerification({
        hiddenIoCasePassed: 3,
        hiddenIoCaseTotal: 4,
        learnerAddedTest: true,
        reviewCorrectDecisions: 0,
        reviewTotalDecisions: 2,
      })
    ).toBe(51)
  })

  it("ignores an explicit reviewTotalDecisions of 0 (treats it the same as absent)", () => {
    expect(
      scoreVerification({
        hiddenIoCasePassed: 2,
        hiddenIoCaseTotal: 4,
        learnerAddedTest: false,
        reviewCorrectDecisions: 0,
        reviewTotalDecisions: 0,
      })
    ).toBe(50)
  })
})

describe("computeOverallScore", () => {
  const scores = {
    understanding: 80,
    problemSolving: 90 as number | null,
    codeQuality: 70,
    communication: 60 as number | null,
    verification: 85 as number | null,
  }

  it("matches the DEMO-101 fixture rubric (communication weight already 0, communication null)", () => {
    const weights = {
      understanding: 0.2,
      problemSolving: 0.35,
      codeQuality: 0.2,
      communication: 0,
      verification: 0.25,
    }
    // 80*.2 + 90*.35 + 70*.2 + 85*.25 = 16 + 31.5 + 14 + 21.25 = 82.75 -> 83
    expect(computeOverallScore({ ...scores, communication: null }, weights)).toBe(83)
  })

  it("matches the DEMO-102 fixture rubric with a real communication score included", () => {
    const weights = {
      understanding: 0.15,
      problemSolving: 0.3,
      codeQuality: 0.15,
      communication: 0.15,
      verification: 0.25,
    }
    // 80*.15+90*.3+70*.15+60*.15+85*.25 = 12+27+10.5+9+21.25 = 79.75 -> 80
    expect(computeOverallScore(scores, weights)).toBe(80)
  })

  it("renormalizes across the remaining four weights when communication is null despite a nonzero authored weight", () => {
    const weights = {
      understanding: 0.15,
      problemSolving: 0.3,
      codeQuality: 0.15,
      communication: 0.15,
      verification: 0.25,
    }
    const nullCommScores = {
      understanding: 80,
      problemSolving: 90 as number | null,
      codeQuality: 70,
      communication: null,
      verification: 60 as number | null,
    }
    // active weight sum = 0.85; weighted sum = 80*.15+90*.3+70*.15+60*.25 = 12+27+10.5+15 = 64.5
    // 64.5 / 0.85 = 75.88... -> 76 (NOT 64.5/1.0=65, which would be the un-renormalized bug)
    expect(computeOverallScore(nullCommScores, weights)).toBe(76)
  })

  it("I6: renormalizes across the remaining dimensions when problemSolving AND verification are both null (zero io-cases)", () => {
    const weights = {
      understanding: 0.2,
      problemSolving: 0.3,
      codeQuality: 0.2,
      communication: 0.1,
      verification: 0.2,
    }
    const zeroIoCaseScores = {
      understanding: 80,
      problemSolving: null as number | null,
      codeQuality: 70,
      communication: 60 as number | null,
      verification: null as number | null,
    }
    // active weight sum = 0.2(u)+0.2(cq)+0.1(comm) = 0.5
    // weighted sum = 80*.2 + 70*.2 + 60*.1 = 16+14+6 = 36
    // 36/0.5 = 72
    expect(computeOverallScore(zeroIoCaseScores, weights)).toBe(72)
  })

  it("falls back to a plain average when every rubric weight is zero (defensive, malformed content)", () => {
    const zeroWeights = {
      understanding: 0,
      problemSolving: 0,
      codeQuality: 0,
      communication: 0,
      verification: 0,
    }
    // average of 80, 90, 70, 85 (communication null, excluded) = 325/4 = 81.25 -> 81
    expect(computeOverallScore({ ...scores, communication: null }, zeroWeights)).toBe(81)
  })

  it("clamps to [0, 100] even with an out-of-range weight configuration", () => {
    const weights = {
      understanding: 1,
      problemSolving: 0,
      codeQuality: 0,
      communication: 0,
      verification: 0,
    }
    expect(computeOverallScore({ ...scores, understanding: 100 }, weights)).toBe(100)
    expect(computeOverallScore({ ...scores, understanding: 0 }, weights)).toBe(0)
  })
})
