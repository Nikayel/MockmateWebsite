import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authedFetch: vi.fn(),
  authedJsonFetch: vi.fn(),
}))

vi.mock("@/lib/api/authed-fetch", () => ({
  authedFetch: mocks.authedFetch,
  authedJsonFetch: mocks.authedJsonFetch,
}))

import {
  __resetLabOnboardingCompletionCache,
  completeLabOnboardingForUser,
  getLabOnboardingCompletion,
} from "../client"

const tokenProvider = async () => "token"

describe("account-scoped Lab onboarding client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetLabOnboardingCompletionCache()
  })

  it("shares one same-tab state read for the same user and onboarding", async () => {
    mocks.authedFetch.mockResolvedValue({ ok: true, data: { completed: false } })

    const [first, second] = await Promise.all([
      getLabOnboardingCompletion("user-1", "meridian", tokenProvider),
      getLabOnboardingCompletion("user-1", "meridian", tokenProvider),
    ])

    expect(first).toBe(false)
    expect(second).toBe(false)
    expect(mocks.authedFetch).toHaveBeenCalledTimes(1)
  })

  it("keeps different user accounts isolated even in the same browser tab", async () => {
    mocks.authedFetch
      .mockResolvedValueOnce({ ok: true, data: { completed: true } })
      .mockResolvedValueOnce({ ok: true, data: { completed: false } })

    await expect(getLabOnboardingCompletion("user-1", "meridian", tokenProvider)).resolves.toBe(
      true
    )
    await expect(getLabOnboardingCompletion("user-2", "meridian", tokenProvider)).resolves.toBe(
      false
    )
    expect(mocks.authedFetch).toHaveBeenCalledTimes(2)
  })

  it("marks the cache complete after the persistence request succeeds", async () => {
    mocks.authedJsonFetch.mockResolvedValue({ ok: true, data: { completion: {} } })

    await completeLabOnboardingForUser("user-1", "meridian", tokenProvider)
    await expect(getLabOnboardingCompletion("user-1", "meridian", tokenProvider)).resolves.toBe(
      true
    )
    expect(mocks.authedFetch).not.toHaveBeenCalled()
  })
})
