/**
 * Tests for the server-derived workspace signals RULING R21 (fix round 1)
 * requires in place of the retired client-posted `filesTouched`/
 * `diffLineCount`/`learnerAddedTest` request fields. See
 * workspace-signals.ts's file header for the honest limitation this works
 * under (no compiled seed file map exists in this codebase yet).
 */

import { describe, expect, it } from "vitest"
import { deriveTimeToFirstEditSeconds, deriveWorkspaceSignals } from "../workspace-signals"

describe("deriveWorkspaceSignals", () => {
  it("filesTouched is exactly the set of paths present in the run's file store, sorted", () => {
    const result = deriveWorkspaceSignals([
      { path: "src/b.ts", content: "b" },
      { path: "src/a.ts", content: "a" },
    ])
    expect(result.filesTouched).toEqual(["src/a.ts", "src/b.ts"])
  })

  it("filesTouched is empty when the learner has saved nothing", () => {
    expect(deriveWorkspaceSignals([]).filesTouched).toEqual([])
  })

  it("diffLineCount sums line counts across every touched file", () => {
    const result = deriveWorkspaceSignals([
      { path: "src/a.ts", content: "line1\nline2\nline3" }, // 3 lines
      { path: "src/b.ts", content: "line1\nline2" }, // 2 lines
    ])
    expect(result.diffLineCount).toBe(5)
  })

  it("diffLineCount is 0 for an empty file and 0 for no files", () => {
    expect(deriveWorkspaceSignals([{ path: "src/empty.ts", content: "" }]).diffLineCount).toBe(0)
    expect(deriveWorkspaceSignals([]).diffLineCount).toBe(0)
  })

  it.each([
    ["src/claims.test.ts", true],
    ["src/claims.spec.ts", true],
    ["src/__tests__/claims.ts", true],
    ["test/claims.ts", true],
    ["tests/claims.ts", true],
    ["src/nested/__tests__/deep.ts", true],
    ["src/claims.ts", false],
    ["src/attestation.ts", false], // contains "test" as a substring but is not a test path
  ])("learnerAddedTest recognizes %s as a test path -> %s", (path, expected) => {
    expect(deriveWorkspaceSignals([{ path, content: "x" }]).learnerAddedTest).toBe(expected)
  })

  it("learnerAddedTest is true if ANY touched file is under a test path, even alongside non-test files", () => {
    const result = deriveWorkspaceSignals([
      { path: "src/claims.ts", content: "x" },
      { path: "src/claims.test.ts", content: "x" },
    ])
    expect(result.learnerAddedTest).toBe(true)
  })

  it("learnerAddedTest is false when nothing touched looks like a test", () => {
    const result = deriveWorkspaceSignals([{ path: "src/claims.ts", content: "x" }])
    expect(result.learnerAddedTest).toBe(false)
  })
})

describe("deriveTimeToFirstEditSeconds", () => {
  it("returns null when no ticket-entered-doing timestamp is available (the current, documented, common case)", () => {
    expect(
      deriveTimeToFirstEditSeconds({
        enteredDoingAt: null,
        fileUpdatedAts: ["2026-01-01T00:05:00.000Z"],
      })
    ).toBeNull()
  })

  it("returns null when a timestamp is available but no file has been touched yet", () => {
    expect(
      deriveTimeToFirstEditSeconds({
        enteredDoingAt: "2026-01-01T00:00:00.000Z",
        fileUpdatedAts: [],
      })
    ).toBeNull()
  })

  it("computes seconds from ticket-entered-doing to the FIRST file update at or after it", () => {
    const result = deriveTimeToFirstEditSeconds({
      enteredDoingAt: "2026-01-01T00:00:00.000Z",
      fileUpdatedAts: ["2026-01-01T00:05:00.000Z", "2026-01-01T00:02:00.000Z"],
    })
    expect(result).toBe(120) // earliest update, 2 minutes later
  })

  it("ignores a file update that happened BEFORE the ticket entered doing (stale from earlier work)", () => {
    const result = deriveTimeToFirstEditSeconds({
      enteredDoingAt: "2026-01-01T00:10:00.000Z",
      fileUpdatedAts: ["2026-01-01T00:05:00.000Z", "2026-01-01T00:12:00.000Z"],
    })
    expect(result).toBe(120)
  })

  it("returns null when every file update predates the ticket entering doing", () => {
    const result = deriveTimeToFirstEditSeconds({
      enteredDoingAt: "2026-01-01T00:10:00.000Z",
      fileUpdatedAts: ["2026-01-01T00:05:00.000Z"],
    })
    expect(result).toBeNull()
  })

  it("never returns a negative number", () => {
    const result = deriveTimeToFirstEditSeconds({
      enteredDoingAt: "2026-01-01T00:00:00.000Z",
      fileUpdatedAts: ["2026-01-01T00:00:00.000Z"],
    })
    expect(result).toBe(0)
  })
})
