import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  applyDiff,
  cleanupGitWorkspace,
  commitAll,
  createGitWorkspace,
  readAllFiles,
  readAllGitObjectBlobs,
  writeWorkspaceFiles,
} from "../git-workspace"

const NEW_FILE_DIFF = `diff --git a/src/hello.ts b/src/hello.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/src/hello.ts
@@ -0,0 +1,1 @@
+export const hello = 1
`

const MODIFY_DIFF = `diff --git a/src/hello.ts b/src/hello.ts
index 1111111..2222222 100644
--- a/src/hello.ts
+++ b/src/hello.ts
@@ -1,1 +1,1 @@
-export const hello = 1
+export const hello = 2
`

describe("createGitWorkspace / cleanupGitWorkspace", () => {
  it("creates a fresh directory with its own git repo at its own root (no prefix)", () => {
    const ws = createGitWorkspace()
    try {
      expect(existsSync(ws.dir)).toBe(true)
    } finally {
      cleanupGitWorkspace(ws)
    }
    expect(existsSync(ws.dir)).toBe(false)
  })
})

describe("applyDiff", () => {
  it("applies a real new-file diff and the file is readable back", () => {
    const ws = createGitWorkspace()
    try {
      const result = applyDiff(ws, NEW_FILE_DIFF)
      expect(result.applied).toBe(true)

      const files = readAllFiles(ws)
      expect(files).toEqual([{ path: "src/hello.ts", content: "export const hello = 1\n" }])
    } finally {
      cleanupGitWorkspace(ws)
    }
  })

  it("applies setup then reference sequentially onto the same workspace", () => {
    const ws = createGitWorkspace()
    try {
      expect(applyDiff(ws, NEW_FILE_DIFF).applied).toBe(true)
      commitAll(ws, "setup")
      expect(applyDiff(ws, MODIFY_DIFF).applied).toBe(true)

      const files = readAllFiles(ws)
      expect(files).toEqual([{ path: "src/hello.ts", content: "export const hello = 2\n" }])
    } finally {
      cleanupGitWorkspace(ws)
    }
  })

  it("reports a structured failure (never throws) when the modify diff's target file does not exist -- a real `git apply` error, not the silent 'Skipped patch' exit-0 no-op", () => {
    const ws = createGitWorkspace()
    try {
      const result = applyDiff(ws, MODIFY_DIFF)
      expect(result.applied).toBe(false)
      expect(result.error).toMatch(/No such file or directory/)
      // Confirms the failure is real, not a "Skipped patch" no-op that silently changed nothing:
      // readAllFiles must still show the empty workspace, matching the reported failure.
      expect(readAllFiles(ws)).toEqual([])
    } finally {
      cleanupGitWorkspace(ws)
    }
  })
})

describe("writeWorkspaceFiles", () => {
  it("rejects an invalid workspace path rather than writing outside the workspace", () => {
    const ws = createGitWorkspace()
    try {
      expect(() => writeWorkspaceFiles(ws, [{ path: "../escape.ts", content: "x" }])).toThrow()
    } finally {
      cleanupGitWorkspace(ws)
    }
  })
})

describe("readAllGitObjectBlobs", () => {
  it("returns the blob content of every committed file, matching AGENT-CONTEXT.md §4's git-object leak-scan input", () => {
    const ws = createGitWorkspace()
    try {
      writeWorkspaceFiles(ws, [
        { path: "src/plain.ts", content: 'export const marker = "findable-blob-text"\n' },
      ])
      commitAll(ws, "add plain.ts")

      const blobs = readAllGitObjectBlobs(ws)

      expect(blobs.some((blob) => blob.includes("findable-blob-text"))).toBe(true)
    } finally {
      cleanupGitWorkspace(ws)
    }
  })
})
