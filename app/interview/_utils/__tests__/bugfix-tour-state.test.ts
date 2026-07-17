import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Profile } from "@/lib/types"
import {
  BUGFIX_TOUR_STORAGE_KEY,
  BUGFIX_TOUR_VERSION,
  TOUR_STEPS,
  profileHasCurrentTourState,
  readStoredTourState,
  writeStoredTourState,
} from "../bugfix-tour-state"

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
}

const originalWindow = (globalThis as { window?: unknown }).window
const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage

beforeEach(() => {
  const localStorageMock = createLocalStorageMock()
  ;(globalThis as { localStorage?: unknown }).localStorage = localStorageMock
  ;(globalThis as { window?: unknown }).window = { localStorage: localStorageMock }
})

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window
  } else {
    ;(globalThis as { window?: unknown }).window = originalWindow
  }
  if (originalLocalStorage === undefined) {
    delete (globalThis as { localStorage?: unknown }).localStorage
  } else {
    ;(globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage
  }
})

describe("TOUR_STEPS", () => {
  it("has four steps in the expected order", () => {
    expect(TOUR_STEPS).toHaveLength(4)
    expect(TOUR_STEPS.map((step) => step.id)).toEqual([
      "incident-report",
      "workspace-files",
      "run-tests",
      "ai-partner",
    ])
  })

  it("gives every step a non-empty shape", () => {
    for (const step of TOUR_STEPS) {
      expect(typeof step.id).toBe("string")
      expect(step.target.length).toBeGreaterThan(0)
      expect(["problem", "editor", "chat"]).toContain(step.panel)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.body.length).toBeGreaterThan(0)
      expect(step.action.length).toBeGreaterThan(0)
    }
  })

  it("only spotlights targets that exist in the DOM", () => {
    // The tour finds each step by [data-bugfix-tour="<target>"] and cannot advance past
    // a step whose target never mounts. The "hypothesis" step pointed at the removed
    // Investigation Notes panel and gated Next on typing into it, so keeping it would
    // have deadlocked the tour on a spotlight over nothing.
    const RENDERED_TOUR_TARGETS = ["incident-report", "workspace-files", "run-tests", "ai-partner"]
    for (const step of TOUR_STEPS) {
      expect(RENDERED_TOUR_TARGETS).toContain(step.target)
    }
  })
})

describe("profileHasCurrentTourState", () => {
  it("returns falsy for null/undefined profiles", () => {
    expect(profileHasCurrentTourState(null)).toBeFalsy()
    expect(profileHasCurrentTourState(undefined)).toBeFalsy()
  })

  it("returns truthy when the current version is completed", () => {
    const profile = {
      bugfix_tour_version: BUGFIX_TOUR_VERSION,
      bugfix_tour_completed: true,
    } as unknown as Profile
    expect(profileHasCurrentTourState(profile)).toBeTruthy()
  })

  it("returns truthy when the current version is skipped", () => {
    const profile = {
      bugfix_tour_version: BUGFIX_TOUR_VERSION,
      bugfix_tour_skipped: true,
    } as unknown as Profile
    expect(profileHasCurrentTourState(profile)).toBeTruthy()
  })

  it("returns falsy when the version does not match", () => {
    const profile = {
      bugfix_tour_version: "some-old-version",
      bugfix_tour_completed: true,
    } as unknown as Profile
    expect(profileHasCurrentTourState(profile)).toBeFalsy()
  })

  it("returns falsy when version matches but no decision flag is set", () => {
    const profile = {
      bugfix_tour_version: BUGFIX_TOUR_VERSION,
    } as unknown as Profile
    expect(profileHasCurrentTourState(profile)).toBeFalsy()
  })
})

describe("readStoredTourState / writeStoredTourState", () => {
  it("returns null when nothing is stored", () => {
    expect(readStoredTourState()).toBeNull()
  })

  it("round-trips a completed decision", () => {
    writeStoredTourState("completed")
    const stored = readStoredTourState()
    expect(stored).not.toBeNull()
    expect(stored?.status).toBe("completed")
    expect(stored?.version).toBe(BUGFIX_TOUR_VERSION)
    expect(typeof stored?.updatedAt).toBe("string")
  })

  it("round-trips a skipped decision", () => {
    writeStoredTourState("skipped")
    expect(readStoredTourState()?.status).toBe("skipped")
  })

  it("persists JSON shaped state under the storage key", () => {
    writeStoredTourState("completed")
    const raw = globalThis.localStorage.getItem(BUGFIX_TOUR_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toMatchObject({
      status: "completed",
      version: BUGFIX_TOUR_VERSION,
    })
  })

  it("returns null for a mismatched stored version", () => {
    globalThis.localStorage.setItem(
      BUGFIX_TOUR_STORAGE_KEY,
      JSON.stringify({ status: "completed", updatedAt: new Date().toISOString(), version: "old" })
    )
    expect(readStoredTourState()).toBeNull()
  })

  it("returns null for an invalid status", () => {
    globalThis.localStorage.setItem(
      BUGFIX_TOUR_STORAGE_KEY,
      JSON.stringify({
        status: "bogus",
        updatedAt: new Date().toISOString(),
        version: BUGFIX_TOUR_VERSION,
      })
    )
    expect(readStoredTourState()).toBeNull()
  })

  it("returns null for malformed JSON", () => {
    globalThis.localStorage.setItem(BUGFIX_TOUR_STORAGE_KEY, "{not json")
    expect(readStoredTourState()).toBeNull()
  })
})
