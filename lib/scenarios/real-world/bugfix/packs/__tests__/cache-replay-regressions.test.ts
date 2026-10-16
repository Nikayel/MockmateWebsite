import { describe, expect, it } from "vitest"
import { genericCacheEvictionMutationPack as pack } from "../generic-cache-eviction-mutation"
import {
  FIXED_SWEEP,
  runCachePack,
  runCacheReport,
  withReplay,
  withSweep,
} from "./cache-cleanup-fixture"

const fixed = withReplay(withSweep(pack, FIXED_SWEEP))

describe("cache incident requires two independent repairs", () => {
  it("does not accept the old else-only fix as the complete incident repair", () => {
    const sweepOnly = withSweep(pack, FIXED_SWEEP)
    expect(runCachePack(sweepOnly)).not.toBe(pack.expectedOutput)
    expect(runCacheReport(sweepOnly)).toContain("feed: 1")
  })

  it("does not accept the replay-only fix while cleanup still skips entries", () => {
    expect(runCachePack(withReplay(pack))).not.toBe(pack.expectedOutput)
    expect(runCacheReport(withReplay(pack))).toContain("sessions: 3")
  })

  it("runs the public regression checks, not just the original incident fixture", () => {
    expect(pack.runCmd).toContain("fixtures/regression_checks.py")
    expect(runCachePack(fixed, undefined, true)).toBe(pack.expectedOutput)
    expect(pack.expectedOutput).toContain("Regression checks: 12/12 passed")
  })

  it.each([
    ["refresh after expiry", "feed,key,1\nfeed,key,1700000100\n", "feed: 1"],
    ["shorter latest expiry", "feed,key,1700000100\nfeed,key,1\n", "feed: 0"],
    ["same key in two namespaces", "a,key,1\nb,key,1700000100\na,key,1700000100\n", "a: 1\nb: 1"],
    ["three updates", "a,key,1\na,key,1700000100\na,key,2\n", "a: 0"],
  ])(
    "honors %s without using first-write or greatest-expiry shortcuts",
    (_name, input, expected) => {
      expect(runCacheReport(fixed, input)).toBe(`=== Live entries by namespace ===\n${expected}\n`)
    }
  )
})
