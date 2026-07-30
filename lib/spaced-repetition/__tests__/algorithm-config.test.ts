/**
 * Tests for the global algorithm config (admin "end A/B" switch) and its
 * integration with getUserAlgorithm.
 *
 * Contract under test:
 * - Missing config doc / read error => fail-open { ab_ended: false } so the
 *   pre-switch 50/50 behavior is preserved exactly.
 * - Once ab_ended: profile-less users deterministically get the default
 *   algorithm (no more per-call coin flips), unassigned profiles are assigned
 *   the default, and non-overridden sm2 users lazily self-heal to fsrs.
 * - Users with algorithm_user_overridden keep their explicit choice.
 * - Config reads are cached (TTL) and clearAlgorithmConfigCache forces refetch.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => ({
  configGetSpy: vi.fn(),
  configSetSpy: vi.fn(() => Promise.resolve()),
  profileGetSpy: vi.fn(),
  profileUpdateSpy: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: () =>
        name === "research_config"
          ? { get: h.configGetSpy, set: h.configSetSpy }
          : { get: h.profileGetSpy, update: h.profileUpdateSpy },
    }),
  },
}))

import { getAlgorithmConfig, markAbTestEnded, clearAlgorithmConfigCache } from "../algorithm-config"
import { getUserAlgorithm } from "../algorithm-router"

const configDoc = (data: Record<string, unknown> | null) => ({
  exists: data !== null,
  data: () => data,
})

const profileDoc = (data: Record<string, unknown> | null) => ({
  exists: data !== null,
  data: () => data,
})

beforeEach(() => {
  clearAlgorithmConfigCache()
  h.configGetSpy.mockReset()
  h.configSetSpy.mockClear()
  h.profileGetSpy.mockReset()
  h.profileUpdateSpy.mockClear()
})

describe("getAlgorithmConfig", () => {
  it("fails open to ab_ended:false when the doc is missing", async () => {
    h.configGetSpy.mockResolvedValue(configDoc(null))
    const config = await getAlgorithmConfig()
    expect(config.ab_ended).toBe(false)
    expect(config.default_algorithm).toBe("fsrs")
  })

  it("fails open (uncached) on read errors and recovers on the next call", async () => {
    h.configGetSpy.mockRejectedValueOnce(new Error("firestore down"))
    const failed = await getAlgorithmConfig()
    expect(failed.ab_ended).toBe(false)

    h.configGetSpy.mockResolvedValue(configDoc({ ab_ended: true, default_algorithm: "fsrs" }))
    const recovered = await getAlgorithmConfig()
    expect(recovered.ab_ended).toBe(true)
  })

  it("returns the ended config with metadata", async () => {
    h.configGetSpy.mockResolvedValue(
      configDoc({
        ab_ended: true,
        default_algorithm: "fsrs",
        ended_at: "2026-07-29T00:00:00.000Z",
        ended_by: "admin-1",
      })
    )
    const config = await getAlgorithmConfig()
    expect(config).toEqual({
      ab_ended: true,
      default_algorithm: "fsrs",
      ended_at: "2026-07-29T00:00:00.000Z",
      ended_by: "admin-1",
    })
  })

  it("caches successful reads (second call does not hit Firestore)", async () => {
    h.configGetSpy.mockResolvedValue(configDoc({ ab_ended: true }))
    await getAlgorithmConfig()
    await getAlgorithmConfig()
    expect(h.configGetSpy).toHaveBeenCalledTimes(1)
  })

  it("clearAlgorithmConfigCache forces a refetch", async () => {
    h.configGetSpy.mockResolvedValue(configDoc({ ab_ended: false }))
    await getAlgorithmConfig()
    clearAlgorithmConfigCache()
    await getAlgorithmConfig()
    expect(h.configGetSpy).toHaveBeenCalledTimes(2)
  })
})

describe("markAbTestEnded", () => {
  it("merge-sets the ended config and invalidates the cache", async () => {
    h.configGetSpy.mockResolvedValue(configDoc({ ab_ended: false }))
    await getAlgorithmConfig() // prime cache

    await markAbTestEnded("admin-42")

    expect(h.configSetSpy).toHaveBeenCalledTimes(1)
    const [payload, options] = h.configSetSpy.mock.calls[0] as unknown as [
      Record<string, unknown>,
      { merge: boolean },
    ]
    expect(payload.ab_ended).toBe(true)
    expect(payload.default_algorithm).toBe("fsrs")
    expect(payload.ended_by).toBe("admin-42")
    expect(typeof payload.ended_at).toBe("string")
    expect(options).toEqual({ merge: true })

    // Cache invalidated: next read hits Firestore again.
    h.configGetSpy.mockResolvedValue(configDoc({ ab_ended: true }))
    const config = await getAlgorithmConfig()
    expect(config.ab_ended).toBe(true)
    expect(h.configGetSpy).toHaveBeenCalledTimes(2)
  })
})

describe("getUserAlgorithm with A/B ended", () => {
  const endedConfig = configDoc({ ab_ended: true, default_algorithm: "fsrs" })

  it("returns fsrs deterministically for profile-less users", async () => {
    h.configGetSpy.mockResolvedValue(endedConfig)
    h.profileGetSpy.mockResolvedValue(profileDoc(null))

    for (let i = 0; i < 5; i++) {
      expect(await getUserAlgorithm("ghost")).toBe("fsrs")
    }
    expect(h.profileUpdateSpy).not.toHaveBeenCalled()
  })

  it("assigns fsrs (not a coin flip) to unassigned profiles", async () => {
    h.configGetSpy.mockResolvedValue(endedConfig)
    h.profileGetSpy.mockResolvedValue(profileDoc({}))

    expect(await getUserAlgorithm("u1")).toBe("fsrs")
    expect(h.profileUpdateSpy).toHaveBeenCalledTimes(1)
    const update = h.profileUpdateSpy.mock.calls[0][0] as Record<string, unknown>
    expect(update.spaced_repetition_algorithm).toBe("fsrs")
    expect(update.algorithm_user_overridden).toBe(false)
  })

  it("self-heals a non-overridden sm2 user to fsrs with migration metadata", async () => {
    h.configGetSpy.mockResolvedValue(endedConfig)
    h.profileGetSpy.mockResolvedValue(
      profileDoc({ spaced_repetition_algorithm: "sm2", algorithm_user_overridden: false })
    )

    expect(await getUserAlgorithm("u2")).toBe("fsrs")
    expect(h.profileUpdateSpy).toHaveBeenCalledTimes(1)
    const update = h.profileUpdateSpy.mock.calls[0][0] as Record<string, unknown>
    expect(update.spaced_repetition_algorithm).toBe("fsrs")
    expect(update.algorithm_migrated_from).toBe("sm2")
    expect(typeof update.algorithm_migrated_at).toBe("string")
  })

  it("leaves an overridden sm2 user untouched", async () => {
    h.configGetSpy.mockResolvedValue(endedConfig)
    h.profileGetSpy.mockResolvedValue(
      profileDoc({ spaced_repetition_algorithm: "sm2", algorithm_user_overridden: true })
    )

    expect(await getUserAlgorithm("u3")).toBe("sm2")
    expect(h.profileUpdateSpy).not.toHaveBeenCalled()
  })

  it("does not touch fsrs users", async () => {
    h.configGetSpy.mockResolvedValue(endedConfig)
    h.profileGetSpy.mockResolvedValue(profileDoc({ spaced_repetition_algorithm: "fsrs" }))

    expect(await getUserAlgorithm("u4")).toBe("fsrs")
    expect(h.profileUpdateSpy).not.toHaveBeenCalled()
  })
})

describe("getUserAlgorithm with A/B still active (fail-open path)", () => {
  it("keeps assigned arms exactly as stored, no self-heal", async () => {
    h.configGetSpy.mockResolvedValue(configDoc(null))
    h.profileGetSpy.mockResolvedValue(
      profileDoc({ spaced_repetition_algorithm: "sm2", algorithm_user_overridden: false })
    )

    expect(await getUserAlgorithm("u5")).toBe("sm2")
    expect(h.profileUpdateSpy).not.toHaveBeenCalled()
  })
})
