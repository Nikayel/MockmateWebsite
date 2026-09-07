import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const completionRef = {
    get: vi.fn(),
    set: vi.fn(),
  }
  const onboardingCollection = {
    doc: vi.fn(() => completionRef),
  }
  const profileRef = {
    collection: vi.fn(() => onboardingCollection),
  }

  return {
    completionRef,
    onboardingCollection,
    profileRef,
    collection: vi.fn(() => ({ doc: vi.fn(() => profileRef) })),
  }
})

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: { collection: mocks.collection },
}))

import { completeLabOnboarding, hasCompletedLabOnboarding } from "../service"

describe("Lab onboarding persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns false when the user has no completion document", async () => {
    mocks.completionRef.get.mockResolvedValue({ data: () => undefined })

    await expect(hasCompletedLabOnboarding("user-1", "meridian")).resolves.toBe(false)
    expect(mocks.collection).toHaveBeenCalledWith("profiles")
    expect(mocks.profileRef.collection).toHaveBeenCalledWith("lab_onboarding")
    expect(mocks.onboardingCollection.doc).toHaveBeenCalledWith("meridian")
  })

  it("only accepts a completion for the current onboarding version", async () => {
    mocks.completionRef.get.mockResolvedValue({
      data: () => ({ version: "lab-onboarding-v1" }),
    })
    await expect(hasCompletedLabOnboarding("user-1", "meridian")).resolves.toBe(true)

    mocks.completionRef.get.mockResolvedValue({
      data: () => ({ version: "older-version" }),
    })
    await expect(hasCompletedLabOnboarding("user-1", "meridian")).resolves.toBe(false)
  })

  it("writes one completion document under the authenticated user's profile", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-07T12:00:00.000Z"))
    mocks.completionRef.set.mockResolvedValue(undefined)

    await expect(completeLabOnboarding("user-1", "meridian")).resolves.toEqual({
      onboardingId: "meridian",
      version: "lab-onboarding-v1",
      completedAt: "2026-09-07T12:00:00.000Z",
    })
    expect(mocks.completionRef.set).toHaveBeenCalledWith({
      onboardingId: "meridian",
      version: "lab-onboarding-v1",
      completedAt: "2026-09-07T12:00:00.000Z",
    })
    vi.useRealTimers()
  })
})
