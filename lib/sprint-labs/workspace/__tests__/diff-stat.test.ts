import { describe, expect, it } from "vitest"
import { computeDiffStat } from "../diff-stat"

describe("computeDiffStat", () => {
  it("reports no change when seed and current are identical", () => {
    const seed = { "a.ts": "line1\nline2\n" }
    const result = computeDiffStat(seed, seed)
    expect(result).toEqual({ filesChanged: 0, summary: "" })
  })

  it("counts a fully-added file", () => {
    const result = computeDiffStat({}, { "new.ts": "one\ntwo\n" })
    expect(result.filesChanged).toBe(1)
    expect(result.summary).toBe("+2 -0 across 1 file")
  })

  it("counts a fully-removed file (a learner deletion)", () => {
    const result = computeDiffStat({ "gone.ts": "one\ntwo\nthree\n" }, {})
    expect(result.filesChanged).toBe(1)
    expect(result.summary).toBe("+0 -3 across 1 file")
  })

  it("counts an edit in the middle of a file via prefix/suffix trim", () => {
    const seed = { "a.ts": "const x = 1\nconst y = 2\nconst z = 3\n" }
    const current = { "a.ts": "const x = 1\nconst y = 99\nconst z = 3\n" }
    const result = computeDiffStat(seed, current)
    expect(result.filesChanged).toBe(1)
    expect(result.summary).toBe("+1 -1 across 1 file")
  })

  it("sums across multiple changed files and pluralizes correctly", () => {
    const seed = { "a.ts": "a\n", "b.ts": "b\n", "c.ts": "c\n" }
    const current = { "a.ts": "a\nextra\n", "b.ts": "b\n", "c.ts": "changed\n" }
    const result = computeDiffStat(seed, current)
    expect(result.filesChanged).toBe(2)
    expect(result.summary).toBe("+2 -1 across 2 files")
  })

  it("treats an unknown seed path as empty content (fully added)", () => {
    const result = computeDiffStat({}, { "only.ts": "x\n" })
    expect(result.summary).toContain("across 1 file")
  })

  it("is order-independent for path iteration", () => {
    const seedA = { z: "1\n", a: "2\n" }
    const currentA = { z: "1\n", a: "3\n" }
    const resultA = computeDiffStat(seedA, currentA)
    const resultB = computeDiffStat({ a: "2\n", z: "1\n" }, { a: "3\n", z: "1\n" })
    expect(resultA).toEqual(resultB)
  })
})
