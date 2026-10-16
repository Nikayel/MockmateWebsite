import { describe, expect, it } from "vitest"
import { genericCacheEvictionMutationPack as pack } from "../generic-cache-eviction-mutation"
import { packToScenario } from "@/lib/bugfix/packs/scenario"
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

  it("also accepts last-write dictionary compaction rather than requiring a specific patch", () => {
    const compact = {
      ...withSweep(pack, FIXED_SWEEP),
      srcFiles: withSweep(pack, FIXED_SWEEP).srcFiles.map((file) =>
        file.path === "src/log_reader.py"
          ? {
              ...file,
              content: file.content.replace(
                /def read_events\(path\):[\s\S]*$/,
                `def read_events(path):
    latest = {}
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            event = parse_line(raw)
            if event is not None:
                latest[(event["namespace"], event["key"])] = event
    return list(latest.values())
`
              ),
            }
          : file
      ),
    }
    expect(runCachePack(compact, undefined, true)).toBe(pack.expectedOutput)
  })

  it("does not accept the replay-only fix while cleanup still skips entries", () => {
    expect(runCachePack(withReplay(pack))).not.toBe(pack.expectedOutput)
    expect(runCacheReport(withReplay(pack))).toContain("sessions: 3")
  })

  it("runs the public regression checks, not just the original incident fixture", () => {
    expect(pack.runCmd).toContain("fixtures/regression_checks.py")
    expect(runCachePack(fixed, undefined, true)).toBe(pack.expectedOutput)
    expect(pack.expectedOutput).toContain("Regression checks: 12/12 passed")
    const workspace = packToScenario(pack).workspace
    for (const path of ["fixtures/regression_checks.py", "fixtures/regression_cases.json"]) {
      expect(workspace.files.find((file) => file.path === path)).toMatchObject({ role: "readonly" })
      expect(workspace.editableFilePaths).not.toContain(path)
    }
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
