import { describe, expect, it } from "vitest"
import { projectFinalizedAttemptRelease } from "../finalized-attempt-projection"

const REVIEW = [
  {
    id: "missing-sunset-date",
    body: "This adds a Deprecation header but no Sunset date.",
    correct: true,
  },
  { id: "just-remove-page-param", body: "Since v1 is deprecated, just remove it.", correct: false },
]

describe("projectFinalizedAttemptRelease", () => {
  it("never releases referenceDiff before finalization, for any ai_policy", () => {
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "assisted",
      finalized: false,
      reviewRoundSubmitted: false,
      sealedReview: null,
      sealedReferenceDiff: "diff --git a/x b/x",
    })
    expect(release.referenceDiff).toBeUndefined()
  })

  it("releases referenceDiff once finalized, matching complete's own M7 rule", () => {
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "unassisted",
      finalized: true,
      reviewRoundSubmitted: false,
      sealedReview: null,
      sealedReferenceDiff: "diff --git a/x b/x",
    })
    expect(release.referenceDiff).toBe("diff --git a/x b/x")
  })

  it("releases review comment BODIES (no correct flag) for a review-only ticket even before finalization or a submitted round", () => {
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "review-only",
      finalized: false,
      reviewRoundSubmitted: false,
      sealedReview: REVIEW,
      sealedReferenceDiff: "diff",
    })
    expect(release.reviewComments).toEqual([
      { id: "missing-sunset-date", body: "This adds a Deprecation header but no Sunset date." },
      { id: "just-remove-page-param", body: "Since v1 is deprecated, just remove it." },
    ])
    // No `correct` field anywhere in what's released pre-decision.
    for (const comment of release.reviewComments ?? []) {
      expect(comment).not.toHaveProperty("correct")
    }
  })

  it("never releases review CORRECTNESS pre-finalization even if the round was somehow submitted", () => {
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "review-only",
      finalized: false,
      reviewRoundSubmitted: true,
      sealedReview: REVIEW,
      sealedReferenceDiff: "diff",
    })
    expect(release.reviewCorrectness).toBeUndefined()
  })

  it("never releases review CORRECTNESS once finalized if the review round has not actually been submitted yet (the spoiler gate)", () => {
    // This is the case that matters most: for a review-only ticket, `finalized` becomes true at
    // COMPLETE time, which happens BEFORE the learner has made any accept/push-back decision.
    // Gating only on `finalized` here would leak the trap's answer to a fresh tab that visits
    // retro before ever visiting review.
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "review-only",
      finalized: true,
      reviewRoundSubmitted: false,
      sealedReview: REVIEW,
      sealedReferenceDiff: "diff",
    })
    expect(release.reviewCorrectness).toBeUndefined()
  })

  it("releases review CORRECTNESS once BOTH finalized and the round has been submitted", () => {
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "review-only",
      finalized: true,
      reviewRoundSubmitted: true,
      sealedReview: REVIEW,
      sealedReferenceDiff: "diff",
    })
    expect(release.reviewCorrectness).toEqual([
      { id: "missing-sunset-date", correct: true },
      { id: "just-remove-page-param", correct: false },
    ])
  })

  it("never releases reviewComments or reviewCorrectness for a non-review-only ticket even with sealed review data present", () => {
    const release = projectFinalizedAttemptRelease({
      aiPolicy: "assisted",
      finalized: true,
      reviewRoundSubmitted: true,
      sealedReview: REVIEW,
      sealedReferenceDiff: "diff",
    })
    expect(release.reviewComments).toBeUndefined()
    expect(release.reviewCorrectness).toBeUndefined()
  })
})
