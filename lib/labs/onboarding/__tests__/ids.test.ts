import { describe, expect, it } from "vitest"

import { getSprintLabOnboardingId, isLabOnboardingId, LAB_ONBOARDING_IDS } from "../ids"

describe("Lab onboarding identifiers", () => {
  it("accepts the known Meridian and Case Lab identifiers", () => {
    expect(isLabOnboardingId(LAB_ONBOARDING_IDS.MERIDIAN)).toBe(true)
    expect(isLabOnboardingId("case-lab:palantir-fdse")).toBe(true)
  })

  it("rejects arbitrary identifiers before they become Firestore document paths", () => {
    expect(isLabOnboardingId("../profiles/other-user")).toBe(false)
    expect(isLabOnboardingId("case-lab:MERIDIAN")).toBe(false)
    expect(isLabOnboardingId("unknown-workbook")).toBe(false)
  })

  it("maps only supported Sprint Lab workbooks to onboarding", () => {
    expect(getSprintLabOnboardingId("meridian")).toBe("meridian")
    expect(getSprintLabOnboardingId("fixture-demo")).toBeNull()
  })
})
