/**
 * Firestore-backed flag resolution.
 *
 * The behaviour under test is the reason this layer exists: before it, a flag
 * toggled on /admin/feature-flags changed nothing, because getFlag() only ever
 * read process.env and a hardcoded const. These tests pin the precedence, the
 * cache TTL, and the cases where a Firestore document deliberately does NOT
 * apply.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/** Documents the mocked `feature_flags` collection returns on the next read. */
let flagDocs: Record<string, unknown>[] = []
/** How many times Firestore was actually read, so cache behaviour is observable. */
let readCount = 0

vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => ({
      get: async () => {
        if (name === "feature_flags") readCount++
        return { docs: flagDocs.map((data) => ({ data: () => data })) }
      },
    }),
  },
  adminAuth: {},
}))

import {
  FLAGS,
  FLAG_CACHE_TTL_MS,
  currentFlagEnvironment,
  explainFlag,
  getFlagAsync,
  invalidateFlagCache,
  isKnownFlagKey,
  normalizeFlagKey,
  parseFlagDocument,
  refreshFlagCache,
  resolveFlag,
  type FlagOverride,
} from "../feature-flags"

/** USE_MULTI_AGENT defaults to false, so any `true` in a test came from a layer. */
const FLAG = "USE_MULTI_AGENT" as const

function flagDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: "use_multi_agent",
    enabled: true,
    rolloutPercentage: 100,
    targetUserIds: [],
    environment: "all",
    expiresAt: null,
    ...overrides,
  }
}

function overrideMap(...overrides: FlagOverride[]): Map<string, FlagOverride> {
  return new Map(overrides.map((o) => [o.key, o]))
}

function override(partial: Partial<FlagOverride> = {}): FlagOverride {
  return {
    key: FLAG,
    enabled: true,
    rolloutPercentage: 100,
    targetUserIds: [],
    environment: "all",
    expiresAtMs: null,
    ...partial,
  }
}

beforeEach(() => {
  flagDocs = []
  readCount = 0
  invalidateFlagCache()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  invalidateFlagCache()
})

describe("key normalisation", () => {
  it("maps the UI's lowercase keys onto the uppercase names code asks for", () => {
    expect(normalizeFlagKey("use_multi_agent")).toBe("USE_MULTI_AGENT")
    expect(normalizeFlagKey("Disable-Voice-Mode")).toBe("DISABLE_VOICE_MODE")
    expect(normalizeFlagKey("  shadow mode  ")).toBe("SHADOW_MODE")
  })

  it("tells a wired key from one no code path reads", () => {
    expect(isKnownFlagKey("use_multi_agent")).toBe(true)
    expect(isKnownFlagKey("nobody_reads_this")).toBe(false)
  })

  it("drops a document with no usable key rather than caching a blank entry", () => {
    expect(parseFlagDocument({ key: "", enabled: true })).toBeNull()
    expect(parseFlagDocument({ enabled: true })).toBeNull()
  })

  it("defaults a malformed rollout percentage to fully on and clamps out-of-range values", () => {
    expect(parseFlagDocument(flagDoc({ rolloutPercentage: "half" }))?.rolloutPercentage).toBe(100)
    expect(parseFlagDocument(flagDoc({ rolloutPercentage: 480 }))?.rolloutPercentage).toBe(100)
    expect(parseFlagDocument(flagDoc({ rolloutPercentage: -20 }))?.rolloutPercentage).toBe(0)
  })
})

describe("resolution precedence: Firestore over env over default", () => {
  it("Firestore beats the env override", () => {
    vi.stubEnv(`FEATURE_FLAG_${FLAG}`, "false")
    const result = resolveFlag(overrideMap(override({ enabled: true })), FLAG)
    expect(result).toMatchObject({ value: true, source: "firestore" })
  })

  it("a Firestore kill switch wins even when env forces the flag on", () => {
    vi.stubEnv(`FEATURE_FLAG_${FLAG}`, "true")
    const result = resolveFlag(overrideMap(override({ enabled: false })), FLAG)
    expect(result).toMatchObject({ value: false, source: "firestore" })
  })

  it("a Firestore kill switch cannot be survived by being on the target list", () => {
    const killed = override({ enabled: false, targetUserIds: ["vip"] })
    expect(resolveFlag(overrideMap(killed), FLAG, "vip").value).toBe(false)
  })

  it("env answers when Firestore holds no document for the flag", () => {
    vi.stubEnv(`FEATURE_FLAG_${FLAG}`, "true")
    expect(resolveFlag(new Map(), FLAG)).toMatchObject({ value: true, source: "env" })
  })

  it("the static default answers when neither Firestore nor env has anything", () => {
    expect(resolveFlag(new Map(), FLAG)).toMatchObject({ value: FLAGS[FLAG], source: "default" })
    expect(resolveFlag(null, FLAG)).toMatchObject({ value: FLAGS[FLAG], source: "default" })
  })

  it("env per-user targeting still applies beneath an absent Firestore layer", () => {
    vi.stubEnv(`FEATURE_FLAG_${FLAG}_PCT`, "100")
    expect(resolveFlag(new Map(), FLAG, "user-1")).toMatchObject({
      value: true,
      source: "env-targeting",
    })
  })
})

describe("a Firestore document that does not apply falls through instead of deciding", () => {
  it("an expired override stops applying without anyone editing it", () => {
    vi.stubEnv(`FEATURE_FLAG_${FLAG}`, "false")
    const expired = override({ enabled: true, expiresAtMs: 1_000 })
    const result = resolveFlag(overrideMap(expired), FLAG, undefined, 2_000)
    expect(result).toMatchObject({ value: false, source: "env", ignoredOverrideReason: "expired" })
  })

  it("an override scoped to another environment does not fire here", () => {
    const otherEnv = currentFlagEnvironment() === "production" ? "development" : "production"
    const scoped = override({ enabled: true, environment: otherEnv })
    const result = resolveFlag(overrideMap(scoped), FLAG)
    expect(result).toMatchObject({
      value: FLAGS[FLAG],
      source: "default",
      ignoredOverrideReason: "environment",
    })
  })

  it("an override scoped to THIS environment does fire", () => {
    const scoped = override({ enabled: true, environment: currentFlagEnvironment() })
    expect(resolveFlag(overrideMap(scoped), FLAG).value).toBe(true)
  })
})

describe("Firestore targeting", () => {
  it("a targeted user gets an enabled flag regardless of the rollout slice", () => {
    const partial = override({ rolloutPercentage: 0, targetUserIds: ["vip"] })
    expect(resolveFlag(overrideMap(partial), FLAG, "vip").value).toBe(true)
    expect(resolveFlag(overrideMap(partial), FLAG, "someone-else").value).toBe(false)
  })

  it("a percentage rollout is stable per user and lands near the target share", () => {
    const partial = overrideMap(override({ rolloutPercentage: 30 }))
    const first = resolveFlag(partial, FLAG, "user-abc").value
    for (let i = 0; i < 5; i++) {
      expect(resolveFlag(partial, FLAG, "user-abc").value).toBe(first)
    }

    let on = 0
    for (let i = 0; i < 3000; i++) if (resolveFlag(partial, FLAG, `user-${i}`).value) on++
    const pct = (on / 3000) * 100
    expect(pct).toBeGreaterThan(25)
    expect(pct).toBeLessThan(35)
  })

  it("a partial rollout with no user to bucket counts as on, since nothing excludes the call", () => {
    expect(resolveFlag(overrideMap(override({ rolloutPercentage: 30 })), FLAG).value).toBe(true)
  })
})

describe("cache TTL", () => {
  it("serves repeated reads from one Firestore read inside the TTL", async () => {
    vi.useFakeTimers()
    flagDocs = [flagDoc({ enabled: true })]

    expect(await getFlagAsync(FLAG)).toBe(true)
    expect(readCount).toBe(1)

    vi.advanceTimersByTime(FLAG_CACHE_TTL_MS - 1_000)
    expect(await getFlagAsync(FLAG)).toBe(true)
    expect(readCount).toBe(1)
  })

  it("refetches once the TTL expires, so a change lands without a redeploy", async () => {
    vi.useFakeTimers()
    flagDocs = [flagDoc({ enabled: true })]
    expect(await getFlagAsync(FLAG)).toBe(true)

    // Operator flips the kill switch.
    flagDocs = [flagDoc({ enabled: false })]

    // Still inside the TTL: the stale value is deliberately still served.
    vi.advanceTimersByTime(FLAG_CACHE_TTL_MS - 1)
    expect(await getFlagAsync(FLAG)).toBe(true)
    expect(readCount).toBe(1)

    // Past the TTL: the new value takes effect.
    vi.advanceTimersByTime(2)
    expect(await getFlagAsync(FLAG)).toBe(false)
    expect(readCount).toBe(2)
  })

  it("invalidation makes the very next read see the new value", async () => {
    flagDocs = [flagDoc({ enabled: true })]
    expect(await getFlagAsync(FLAG)).toBe(true)

    flagDocs = [flagDoc({ enabled: false })]
    invalidateFlagCache()

    expect(await getFlagAsync(FLAG)).toBe(false)
    expect(readCount).toBe(2)
  })

  it("concurrent cold reads share a single Firestore read", async () => {
    flagDocs = [flagDoc({ enabled: true })]
    const results = await Promise.all([refreshFlagCache(), refreshFlagCache(), getFlagAsync(FLAG)])
    expect(results[2]).toBe(true)
    expect(readCount).toBe(1)
  })

  it("reports which layer answered, for diagnosing a switch that appears not to work", async () => {
    flagDocs = [flagDoc({ enabled: true })]
    expect(await explainFlag(FLAG)).toMatchObject({ value: true, source: "firestore" })

    flagDocs = []
    invalidateFlagCache()
    expect(await explainFlag(FLAG)).toMatchObject({ source: "default" })
  })
})
