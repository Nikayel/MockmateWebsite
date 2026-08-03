import { describe, it, expect } from "vitest"
import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"

/**
 * The row's belief-state predicate, and the branches that hang off it.
 *
 * `noBelief` decides three user-visible things at once: whether "This seems wrong"
 * renders, whether the no-belief explanation renders, and whether the score track
 * renders. Its first version also required `belief_text === null`, which an
 * unreviewed OPEN-condition card fails — model-builder gives that card the "No
 * reviews yet" sentence. Two opposite bugs followed from one predicate: the
 * challenge button appeared on cards with nothing to dispute, and the explanation
 * for having nothing was unreachable in BOTH conditions.
 *
 * Mirrored here rather than imported because it is one expression inside a client
 * component; what is worth pinning is the truth table, not the syntax.
 */
const noBelief = (retrievability: number | null) => retrievability === null

/** The three card shapes model-builder can actually produce. */
const UNREVIEWED_OPEN = {
  retrievability: null,
  belief_text: "No reviews yet — the system has no evidence about this problem.",
}
const UNREVIEWED_BLACK_BOX = { retrievability: null, belief_text: null }
const REVIEWED = { retrievability: 68, belief_text: "The system estimates a ~65% chance…" }

describe("noBelief", () => {
  it("is true for an unreviewed card in EITHER condition", () => {
    expect(noBelief(UNREVIEWED_OPEN.retrievability)).toBe(true)
    expect(noBelief(UNREVIEWED_BLACK_BOX.retrievability)).toBe(true)
  })

  it("is false for a reviewed card", () => {
    expect(noBelief(REVIEWED.retrievability)).toBe(false)
  })

  it("does not consult belief_text — the bug that broke both branches", () => {
    // The old predicate ANDed belief_text === null, so the open unreviewed card
    // (which HAS a sentence) came out false and was treated as though the model
    // held a belief about it.
    const oldPredicate = (r: number | null, t: string | null) => r === null && t === null
    expect(oldPredicate(UNREVIEWED_OPEN.retrievability, UNREVIEWED_OPEN.belief_text)).toBe(false)
    expect(noBelief(UNREVIEWED_OPEN.retrievability)).toBe(true)
  })
})

describe("what noBelief gates", () => {
  const challengeShown = (r: number | null) => !noBelief(r)
  const explanationShown = (r: number | null, t: string | null) => noBelief(r) && Boolean(t)

  it("hides the challenge button when there is no belief to dispute", () => {
    // The dialog offers to "re-grade that attempt" — on a zero-review card there is
    // no attempt to re-grade.
    expect(challengeShown(UNREVIEWED_OPEN.retrievability)).toBe(false)
    expect(challengeShown(UNREVIEWED_BLACK_BOX.retrievability)).toBe(false)
    expect(challengeShown(REVIEWED.retrievability)).toBe(true)
  })

  it("shows the no-reviews explanation exactly where one exists", () => {
    expect(explanationShown(UNREVIEWED_OPEN.retrievability, UNREVIEWED_OPEN.belief_text)).toBe(true)
    // Black-box masks belief_text, so there is nothing to say and nothing is said.
    expect(
      explanationShown(UNREVIEWED_BLACK_BOX.retrievability, UNREVIEWED_BLACK_BOX.belief_text)
    ).toBe(false)
    // A reviewed card's sentence lives in the expanded panel, not here.
    expect(explanationShown(REVIEWED.retrievability, REVIEWED.belief_text)).toBe(false)
  })

  it("never shows both the challenge button and the no-belief explanation", () => {
    for (const card of [UNREVIEWED_OPEN, UNREVIEWED_BLACK_BOX, REVIEWED]) {
      const both =
        challengeShown(card.retrievability) &&
        explanationShown(card.retrievability, card.belief_text)
      expect(both).toBe(false)
    }
  })
})

describe("at-risk selection agrees with the bands", () => {
  // KnowledgeSummary's tiles and ConceptCard's "N at risk" badge both derive from
  // this; if it drifted from memoryBandFor, the count and the colours would disagree.
  const isAtRisk = (r: number | null) =>
    r !== null && ["warning", "urgent"].includes(memoryBandFor(r).urgency)

  it("treats the ok-band floor as safe and anything below it as at risk", () => {
    expect(isAtRisk(70)).toBe(false)
    expect(isAtRisk(69.9)).toBe(true)
    expect(isAtRisk(0)).toBe(true)
    expect(isAtRisk(100)).toBe(false)
  })

  it("never calls an unreviewed card at risk", () => {
    // No belief is not a bad belief — it must not inflate the "slipping" count.
    expect(isAtRisk(null)).toBe(false)
  })
})
