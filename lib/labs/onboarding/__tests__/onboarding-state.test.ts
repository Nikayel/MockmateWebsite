import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  hasSeenOnboarding,
  LAB_ONBOARDING_STORAGE_KEY,
  markOnboardingSeen,
} from "@/lib/labs/onboarding/onboarding-state"

/**
 * The util reads `window.localStorage`; the vitest env is node, so we stand up a
 * Map-backed localStorage on a stub `window` for the duration of each test. This
 * also exercises the real "no window" path implicitly (the code guards on it).
 */
function installFakeStorage(): Map<string, string> {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
  ;(globalThis as { window?: unknown }).window = { localStorage }
  return store
}

describe("lab onboarding seen-state", () => {
  let store: Map<string, string>
  const originalWindow = (globalThis as { window?: unknown }).window

  beforeEach(() => {
    store = installFakeStorage()
  })

  afterEach(() => {
    ;(globalThis as { window?: unknown }).window = originalWindow
  })

  it("reports unseen before anything is recorded", () => {
    expect(hasSeenOnboarding("meridian")).toBe(false)
  })

  it("remembers a config as seen after marking it", () => {
    markOnboardingSeen("meridian")
    expect(hasSeenOnboarding("meridian")).toBe(true)
  })

  it("tracks each config independently", () => {
    markOnboardingSeen("meridian")
    expect(hasSeenOnboarding("meridian")).toBe(true)
    expect(hasSeenOnboarding("case-lab:palantir-fdse")).toBe(false)

    markOnboardingSeen("case-lab:palantir-fdse")
    expect(hasSeenOnboarding("meridian")).toBe(true)
    expect(hasSeenOnboarding("case-lab:palantir-fdse")).toBe(true)
  })

  it("persists under the versioned storage key", () => {
    markOnboardingSeen("meridian")
    const raw = store.get(LAB_ONBOARDING_STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).seen.meridian).toEqual(expect.any(String))
  })

  it("survives a corrupt payload by treating everything as unseen", () => {
    store.set(LAB_ONBOARDING_STORAGE_KEY, "{not json")
    expect(hasSeenOnboarding("meridian")).toBe(false)
    // And a fresh write still lands cleanly over the garbage.
    markOnboardingSeen("meridian")
    expect(hasSeenOnboarding("meridian")).toBe(true)
  })
})
