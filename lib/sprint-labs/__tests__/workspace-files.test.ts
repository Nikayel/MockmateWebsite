/**
 * Pure-function tests for the workspace-file helpers shared by the server
 * service and the client sync hook. No Firestore involved — see
 * `runs.test.ts` for the service-layer (Firestore-backed) behavior.
 */

import { describe, expect, it } from "vitest"
import { isValidWorkspacePath } from "@/lib/workspace-execution/validators"
import {
  decodeWorkspaceFilePathId,
  encodeWorkspaceFilePathId,
  reassembleWorkspaceFiles,
} from "../workspace-files"

describe("encodeWorkspaceFilePathId / decodeWorkspaceFilePathId", () => {
  const paths = [
    "server.ts",
    "src/http/server.ts",
    "src/db/migrations/0001_init.sql",
    ".gitignore",
    "a/b/c/d/e.ts",
    "file with spaces.ts",
    "weird&chars?.ts",
    "MER-101/setup.diff",
  ]

  it.each(paths)("round-trips %s losslessly", (path) => {
    const encoded = encodeWorkspaceFilePathId(path)
    expect(decodeWorkspaceFilePathId(encoded)).toBe(path)
  })

  it("never leaves a literal slash in the encoded id (so it is a valid Firestore doc id)", () => {
    for (const path of paths) {
      expect(encodeWorkspaceFilePathId(path)).not.toContain("/")
    }
  })

  it("produces different ids for different paths (no accidental collisions in this fixture set)", () => {
    const encoded = paths.map(encodeWorkspaceFilePathId)
    expect(new Set(encoded).size).toBe(paths.length)
  })

  it("every path accepted by isValidWorkspacePath round-trips through the codec", () => {
    for (const path of paths) {
      expect(isValidWorkspacePath(path)).toBe(true)
      expect(decodeWorkspaceFilePathId(encodeWorkspaceFilePathId(path))).toBe(path)
    }
  })
})

describe("reassembleWorkspaceFiles", () => {
  const seed = [
    { path: "src/a.ts", content: "seed-a" },
    { path: "src/b.ts", content: "seed-b" },
    { path: "src/c.ts", content: "seed-c" },
  ]

  it("returns the seed verbatim when there is no overlay", () => {
    expect(reassembleWorkspaceFiles(seed, [])).toEqual(seed)
  })

  it("overlay content wins for a path present in both", () => {
    const overlay = [{ path: "src/a.ts", content: "learner-edit-a" }]
    const result = reassembleWorkspaceFiles(seed, overlay)
    expect(result.find((f) => f.path === "src/a.ts")?.content).toBe("learner-edit-a")
    // Untouched seed files are unaffected.
    expect(result.find((f) => f.path === "src/b.ts")?.content).toBe("seed-b")
    expect(result.find((f) => f.path === "src/c.ts")?.content).toBe("seed-c")
  })

  it("preserves seed ordering for seed paths", () => {
    const overlay = [
      { path: "src/c.ts", content: "edited-c" },
      { path: "src/a.ts", content: "edited-a" },
    ]
    const result = reassembleWorkspaceFiles(seed, overlay)
    expect(result.map((f) => f.path)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"])
  })

  it("appends overlay-only paths (a learner-created file) after the seed, sorted by path", () => {
    const overlay = [
      { path: "src/z-new.ts", content: "new file z" },
      { path: "src/a-new.ts", content: "new file a" },
    ]
    const result = reassembleWorkspaceFiles(seed, overlay)
    expect(result.map((f) => f.path)).toEqual([
      "src/a.ts",
      "src/b.ts",
      "src/c.ts",
      "src/a-new.ts",
      "src/z-new.ts",
    ])
  })

  it("does not mutate its inputs", () => {
    const seedCopy = seed.map((f) => ({ ...f }))
    const overlay = [{ path: "src/a.ts", content: "changed" }]
    reassembleWorkspaceFiles(seedCopy, overlay)
    expect(seedCopy).toEqual(seed)
  })
})
