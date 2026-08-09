import { describe, expect, it } from "vitest"

import {
  FIRST_CONTACT_THRESHOLD_SEC,
  RECENT_ACTIVITY_SEC,
  SILENCE_THRESHOLD_SEC,
  shouldTriggerSilenceNudge,
} from "../proactive-silence"

/**
 * The interviewer speaking without being spoken to is the most intrusive thing the product
 * does, and it used to be decided by three lines inside a poll's closure that nothing could
 * reach.
 *
 * What shipped: silence was measured on the chat transcript alone. A candidate two minutes
 * into a debugging problem, reading the brief or already editing files, was told they had
 * not communicated at all and that silence hurts their collaboration score.
 */

describe("shouldTriggerSilenceNudge", () => {
  describe("a candidate who has not spoken yet", () => {
    const quiet = { hasEverMessaged: false, secondsSinceActivity: 600 }

    it("is left alone two minutes in, when they are still reading", () => {
      expect(shouldTriggerSilenceNudge({ ...quiet, timeSilentSec: 120 })).toBe(false)
    })

    it("is given longer than a candidate who spoke and then stopped", () => {
      expect(FIRST_CONTACT_THRESHOLD_SEC).toBeGreaterThan(SILENCE_THRESHOLD_SEC)
    })

    it("is eventually checked on", () => {
      expect(
        shouldTriggerSilenceNudge({ ...quiet, timeSilentSec: FIRST_CONTACT_THRESHOLD_SEC })
      ).toBe(true)
    })
  })

  describe("a candidate who spoke and then went quiet", () => {
    const stopped = { hasEverMessaged: true, secondsSinceActivity: 600 }

    it("is checked on after the shorter threshold", () => {
      expect(shouldTriggerSilenceNudge({ ...stopped, timeSilentSec: SILENCE_THRESHOLD_SEC })).toBe(
        true
      )
    })

    it("is not interrupted before it", () => {
      expect(
        shouldTriggerSilenceNudge({ ...stopped, timeSilentSec: SILENCE_THRESHOLD_SEC - 1 })
      ).toBe(false)
    })
  })

  describe("a candidate who is working", () => {
    // Interrupting someone mid-thought to ask what they are thinking is worse than saying
    // nothing. Editing code and running tests are how a debugging interview is meant to look.
    it("is left alone however long the chat has been quiet", () => {
      expect(
        shouldTriggerSilenceNudge({
          hasEverMessaged: false,
          timeSilentSec: 3600,
          secondsSinceActivity: 5,
        })
      ).toBe(false)
    })

    it("is left alone even after having spoken earlier", () => {
      expect(
        shouldTriggerSilenceNudge({
          hasEverMessaged: true,
          timeSilentSec: 3600,
          secondsSinceActivity: RECENT_ACTIVITY_SEC - 1,
        })
      ).toBe(false)
    })

    it("is checked on once they have stopped working too", () => {
      expect(
        shouldTriggerSilenceNudge({
          hasEverMessaged: true,
          timeSilentSec: 3600,
          secondsSinceActivity: RECENT_ACTIVITY_SEC,
        })
      ).toBe(true)
    })
  })
})
