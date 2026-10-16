// @vitest-environment node
import { describe, expect, it } from "vitest"
import { genericCacheEvictionMutationPack as pack } from "../generic-cache-eviction-mutation"
import { sealed } from "@/lib/scenarios/sealed/generic-cache-eviction-mutation.server"
import {
  FIXED_SWEEP,
  PINNED_SWEEP,
  runCachePack,
  runCacheReport,
  withReplay,
  withSweep,
} from "./cache-cleanup-fixture"
import { packToScenario, validatePackQuality } from "@/lib/bugfix/packs/scenario"

const fixed = withReplay(withSweep(pack, FIXED_SWEEP))
const extended = withReplay(withSweep(pack, PINNED_SWEEP))
const header = "=== Live entries by namespace ===\n"
const phase2Fixture = pack.fixtures[0].content + sealed.phase2.fixturePatch

describe("cache cleanup executable contract", () => {
  it("passes the authored pack quality and sealing checks", () => {
    expect(validatePackQuality(pack, sealed)).toEqual([])
  })

  it("opens the entry point without pointing directly at the defective module", () => {
    const scenario = packToScenario(pack)
    expect(pack.srcFiles.map((file) => file.path)).toEqual([
      "src/cache_store.py",
      "src/cache_sweep.py",
      "src/log_reader.py",
      "src/reporting.py",
    ])
    expect(scenario.workspace.primaryFilePath).toBe("src/cache_sweep.py")
    expect(scenario.expectedTouchedFiles).toEqual(["src/cache_store.py", "src/log_reader.py"])
    expect(scenario.id).toBe("generic-cache-eviction-mutation")
    expect(
      pack.srcFiles.reduce((total, file) => total + file.content.split("\n").length, 0)
    ).toBeLessThanOrEqual(200)
  })

  it("rejects stale entry-point and touched-file metadata", () => {
    expect(validatePackQuality({ ...pack, primaryFilePath: "src/missing.py" })).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "primaryFilePath" })])
    )
    expect(validatePackQuality({ ...pack, expectedTouchedFiles: ["src/missing.py"] })).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "expectedTouchedFiles" })])
    )
  })

  it("does not expose the follow-up ticket or sealed diagnosis in the initial workspace", () => {
    const initial = JSON.stringify(packToScenario(pack))
    expect(initial).not.toContain(sealed.phase2.specPatch)
    expect(initial).not.toContain(sealed.phase2.fixturePatch)
    expect(initial).not.toContain(sealed.bugSummary)
    expect(sealed.bugLocation).toContain("src/cache_store.py")
  })

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
    expect(runCacheReport(fixed, input)).toBe(header + expected)
  })

  it("rejects changing <= to < as a false fix", () => {
    const wrong = withSweep(pack, FIXED_SWEEP.replace("> now", ">= now"))
    expect(runCachePack(wrong)).not.toBe(pack.expectedOutput)
  })

  it("also accepts a correct guarded-index patch, without requiring the reference's approach", () => {
    const guarded = withReplay({
      ...pack,
      srcFiles: pack.srcFiles.map((file) => ({
        ...file,
        content: file.content.replace(
          "        index += 1",
          "        else:\n            index += 1"
        ),
      })),
    })
    expect(runCachePack(guarded, undefined, true)).toBe(pack.expectedOutput)
    expect(runCacheReport(guarded, "a,one,1\na,two,2\na,three,3\n")).toBe(header + "a: 0\n")
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
    expect(runCacheReport(extended, input)).toBe(header + "a: 2\n")
    expect(runCachePack(extended)).toBe(pack.expectedOutput)
  })

  it("updates stored state, permits another sweep and write, and isolates replay instances", () => {
    const probe = `from cache_store import CacheStore
from log_reader import read_events
store = CacheStore()
for event in read_events("fixtures/input.txt"):
    store.write(event)
store.sweep(1700000000)
first = store.counts()
store.sweep(1700000000)
assert store.counts() == first
assert first["sessions"] == 2
store.write({"namespace": "sessions", "key": "new", "expires_at": 1700000100, "pinned": False})
assert store.counts()["sessions"] == 3
store.sweep(1700000100)
assert store.counts()["sessions"] == 2
assert CacheStore().counts() == {}
print("state verified")
`
    const probing = {
      ...fixed,
      srcFiles: fixed.srcFiles.map((file) =>
        file.path === "src/cache_sweep.py" ? { ...file, content: probe } : file
      ),
    }
    expect(runCacheReport(probing, undefined, true)).toBe("state verified\n")
  })
})
