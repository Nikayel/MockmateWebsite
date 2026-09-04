import { describe, expect, it } from "vitest"

import { guestDebriefResumePath } from "../guest-debrief-resume"

describe("guestDebriefResumePath", () => {
  it("returns the migrated guest to the live post-interview phase", () => {
    expect(
      guestDebriefResumePath({ sessionId: "session-1", scenarioId: "bugfix/webhook replay" })
    ).toBe(
      "/interview?session=session-1&scenario=bugfix%2Fwebhook+replay&postInterview=true&startDebrief=true"
    )
  })

  it("falls back to results for a legacy migration without a scenario", () => {
    expect(guestDebriefResumePath({ sessionId: "session/legacy", scenarioId: null })).toBe(
      "/sessions/session%2Flegacy"
    )
  })
})
