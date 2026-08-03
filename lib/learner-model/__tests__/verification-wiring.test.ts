import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * A structural guard for the bug that made the study's key measurement unobtainable.
 *
 * Every challenge pulls a verification review and the dialog promises "a quick
 * verification review is scheduled — if you're right, the correction sticks". Only
 * `resolveVerificationForReview` can keep that promise, and for a long time its sole
 * caller was /api/spaced-repetition/complete, which only the SYSTEM DESIGN feedback
 * path invokes. DSA and Case Labs — i.e. nearly everything /knowledge renders —
 * completed reviews through `completeSessionWithMastery` instead, so their
 * challenges sat in "pending_verification" forever and the dependent variable was
 * never collected.
 *
 * Asserted over source rather than behaviour on purpose: the failure was not a wrong
 * value, it was a MISSING CALL on one of several parallel paths, and a unit test on
 * the path that already worked would never have caught it.
 */
const REVIEW_COMPLETION_PATHS = [
  // System Design reviews.
  "app/api/spaced-repetition/complete/route.ts",
  // DSA (via app/api/generate-feedback) and Case Labs (via lib/labs/case-lab-mastery).
  "lib/learning-state.ts",
]

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8")

describe("every review-completion path resolves pending challenges", () => {
  it("scans the paths it claims to", () => {
    // Guards the guard: a renamed file would make the assertions vacuous.
    for (const path of REVIEW_COMPLETION_PATHS) {
      expect(() => read(path), path).not.toThrow()
    }
  })

  for (const path of REVIEW_COMPLETION_PATHS) {
    it(`${path} calls resolveVerificationForReview`, () => {
      expect(read(path)).toContain("resolveVerificationForReview(")
    })

    it(`${path} treats the resolution as non-fatal`, () => {
      // A verification failure must never cost the user their completed session.
      const source = read(path)
      const at = source.indexOf("resolveVerificationForReview(")
      const before = source.slice(Math.max(0, at - 400), at)
      expect(before, `${path}: call is not inside a try block`).toContain("try {")
    })
  }

  it("keeps resolveVerificationForReview reachable from more than one path", () => {
    // The regression in one line: a single caller meant a single card family.
    const callers = REVIEW_COMPLETION_PATHS.filter((p) =>
      read(p).includes("resolveVerificationForReview(")
    )
    expect(callers.length).toBeGreaterThan(1)
  })
})
