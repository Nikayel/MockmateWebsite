import { afterEach, describe, expect, it, vi } from "vitest"
import { getFlag } from "../feature-flags"

// USE_MULTI_AGENT defaults to false; we drive it via env overrides / percentage in these tests.
const FLAG = "USE_MULTI_AGENT" as const

describe("getFlag — per-user targeting", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("env override wins over everything (kill-switch / force-on)", () => {
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT", "true")
    expect(getFlag(FLAG, "user-1")).toBe(true)
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT", "false")
    // even with a 100% rollout configured, the explicit env value wins:
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT_PCT", "100")
    expect(getFlag(FLAG, "user-1")).toBe(false)
  })

  it("falls through to the static default with no override/rollout", () => {
    expect(getFlag(FLAG)).toBe(false)
    expect(getFlag(FLAG, "user-1")).toBe(false)
  })

  it("percentage rollout is stable for a given user across calls", () => {
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT_PCT", "50")
    const first = getFlag(FLAG, "user-abc")
    for (let i = 0; i < 5; i++) expect(getFlag(FLAG, "user-abc")).toBe(first)
  })

  it("0% is off for all users, 100% is on for all users", () => {
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT_PCT", "0")
    expect(getFlag(FLAG, "anyone")).toBe(false)
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT_PCT", "100")
    expect(getFlag(FLAG, "anyone")).toBe(true)
  })

  it("distributes roughly to the target percentage across many users", () => {
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT_PCT", "30")
    const N = 3000
    let on = 0
    for (let i = 0; i < N; i++) if (getFlag(FLAG, `user-${i}`)) on++
    const pct = (on / N) * 100
    expect(pct).toBeGreaterThan(25)
    expect(pct).toBeLessThan(35)
  })

  it("ignores the rollout percentage when no userId is supplied", () => {
    vi.stubEnv("FEATURE_FLAG_USE_MULTI_AGENT_PCT", "100")
    expect(getFlag(FLAG)).toBe(false) // no user to bucket → static default
  })
})
