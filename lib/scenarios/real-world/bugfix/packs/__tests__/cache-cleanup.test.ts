// @vitest-environment node
import { describe, expect, it } from "vitest"
import { genericCacheEvictionMutationPack as pack } from "../generic-cache-eviction-mutation"
import { sealed } from "@/lib/scenarios/sealed/generic-cache-eviction-mutation.server"
import { FIXED_SWEEP, PINNED_SWEEP, runCachePack, withSweep } from "./cache-cleanup-fixture"

const fixed = withSweep(pack, FIXED_SWEEP)
const extended = withSweep(pack, PINNED_SWEEP)
const header = "=== Live entries by namespace ===\n"
const phase2Fixture = pack.fixtures[0].content + sealed.phase2.fixturePatch

describe("cache cleanup executable contract", () => {
  it("reproduces the incident, rather than starting already solved", () => {
    expect(runCachePack(pack)).toBe(sealed.buggyOutput)
    expect(runCachePack(pack)).not.toBe(pack.expectedOutput)
  })

  it("accepts a reference fix through both CLI and browser-wrapper execution", () => {
    expect(runCachePack(fixed)).toBe(pack.expectedOutput)
    expect(runCachePack(fixed, undefined, true)).toBe(pack.expectedOutput)
  })

  it.each([
    ["adjacent expired entries", "a,one,1\na,two,2\na,three,1700000001\n", "a: 1\n"],
    ["expiry exactly at the checkpoint", "a,one,1700000000\na,two,1700000001\n", "a: 1\n"],
    ["all expired", "a,one,1\na,two,2\na,three,3\n", "a: 0\n"],
    ["no expiry", "a,one,1700000001\na,two,1700000002\n", "a: 2\n"],
    [
      "refreshes and namespace isolation",
      "b,key,1\na,key,1700000001\nb,key,1700000002\n",
      "a: 1\nb: 1\n",
    ],
    ["latest write wins even when it expires earlier", "a,key,1700000002\na,key,1\n", "a: 0\n"],
    [
      "malformed input and whitespace",
      "# writes\n\na,key\na,key,soon\na,key,1,extra,field\n a ,key,1700000001\n",
      "a: 1\n",
    ],
    ["empty feed", "# no writes\n", ""],
  ])("handles %s", (_name, input, expected) => {
    expect(runCachePack(fixed, input)).toBe(header + expected)
  })

  it("rejects changing <= to < as a false fix", () => {
    const wrong = withSweep(pack, FIXED_SWEEP.replace("> now", ">= now"))
    expect(runCachePack(wrong)).not.toBe(pack.expectedOutput)
  })

  it("rejects leaving every entry resident", () => {
    expect(
      runCachePack(withSweep(pack, "def evict_expired(entries, now):\n    return entries\n\n"))
    ).not.toBe(pack.expectedOutput)
  })

  it("does not change v1 counts merely by appending the follow-up data", () => {
    expect(runCachePack(fixed, phase2Fixture)).toBe(pack.expectedOutput)
  })

  it("requires the feature adaptation to satisfy the follow-up", () => {
    expect(runCachePack(fixed, phase2Fixture)).not.toBe(sealed.phase2.expectedOutputV2)
    expect(runCachePack(extended, phase2Fixture, true)).toBe(sealed.phase2.expectedOutputV2)
  })

  it("keeps ordinary expiry and refreshed pin state working after the feature", () => {
    const input =
      "a,pinned,1,pinned\na,ordinary,1\na,live,1700000001\na,refresh,1,pinned\na,refresh,2\n"
    expect(runCachePack(extended, input)).toBe(header + "a: 2\n")
    expect(runCachePack(extended)).toBe(pack.expectedOutput)
  })
})
