import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  doc: vi.fn(() => "profile-ref"),
  setDoc: vi.fn(async () => undefined),
  fetch: vi.fn(async () => ({ ok: true })),
}))

vi.mock("firebase/firestore", () => ({ doc: mocks.doc, setDoc: mocks.setDoc }))
vi.mock("@/lib/firebase", () => ({ db: "client-db" }))

import { completeProfilePersonalization } from "./onboarding-service"

describe("completeProfilePersonalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
  })

  it("persists completion separately from the welcome cinematic", async () => {
    await completeProfilePersonalization("user-1", {
      role: "mid",
      goal: "faang",
      targetCompany: "Stripe",
      interviewTimeline: "within_quarter",
      weeklyGoal: 3,
    })

    expect(mocks.doc).toHaveBeenCalledWith("client-db", "profiles", "user-1")
    expect(mocks.setDoc).toHaveBeenCalledWith(
      "profile-ref",
      expect.objectContaining({
        role: "mid",
        goal: "faang",
        target_company: "Stripe",
        interview_timeline: "within_quarter",
        weekly_goal: 3,
        onboarding_completed: true,
        profile_calibration_completed: true,
      }),
      { merge: true }
    )
  })
})
