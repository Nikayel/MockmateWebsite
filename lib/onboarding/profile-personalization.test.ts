import { describe, expect, it } from "vitest"

import {
  needsProfilePersonalization,
  shouldShowProfilePersonalization,
} from "./profile-personalization"

describe("needsProfilePersonalization", () => {
  it("keeps legacy and incomplete profiles eligible", () => {
    expect(needsProfilePersonalization(null)).toBe(true)
    expect(needsProfilePersonalization({})).toBe(true)
    expect(needsProfilePersonalization({ profile_calibration_completed: false })).toBe(true)
  })

  it("stops prompting only after the profile was completed", () => {
    expect(needsProfilePersonalization({ profile_calibration_completed: true })).toBe(false)
  })

  it("waits until the user has completed a session", () => {
    expect(shouldShowProfilePersonalization({}, 0)).toBe(false)
    expect(shouldShowProfilePersonalization({}, 1)).toBe(true)
    expect(shouldShowProfilePersonalization({ profile_calibration_completed: true }, 1)).toBe(false)
  })
})
