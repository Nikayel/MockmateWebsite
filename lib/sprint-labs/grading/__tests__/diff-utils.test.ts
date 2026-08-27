/**
 * Tests for the pure `reference.diff` readers the scorer uses:
 * `extractDiffFilePaths` (Understanding's reference manifest) and
 * `countDiffChangedLines` (Code Quality's diff-size band). Both parse the
 * unified-diff TEXT only — they never execute anything and never touch the
 * secret bundle beyond the string they are handed.
 */

import { describe, expect, it } from "vitest"
import { countDiffChangedLines, extractDiffFilePaths } from "../diff-utils"

const SINGLE_FILE_DIFF = `diff --git a/src/http/claims-parser.ts b/src/http/claims-parser.ts
index 3333333..4444444 100644
--- a/src/http/claims-parser.ts
+++ b/src/http/claims-parser.ts
@@ -1,10 +1,19 @@
-export function parseClaimPayload(body: any) {
-  return { ok: true, value: body }
-}
+interface ParsedClaim {
+  tenantId: string
+  amount: number
+}
+
+export function parseClaimPayload(
+  body: unknown
+): { ok: true; value: ParsedClaim } | { ok: false; reason: string } {
+  return { ok: true, value: body as ParsedClaim }
+}
`

const MULTI_FILE_DIFF = `diff --git a/src/http/compatibility-descriptor.ts b/src/http/compatibility-descriptor.ts
index 7777777..8888888 100644
--- a/src/http/compatibility-descriptor.ts
+++ b/src/http/compatibility-descriptor.ts
@@ -1,3 +1,4 @@
+export const x = 1
diff --git a/src/http/claims-list.ts b/src/http/claims-list.ts
index 1111111..2222222 100644
--- a/src/http/claims-list.ts
+++ b/src/http/claims-list.ts
@@ -1,2 +1,3 @@
+export const y = 2
`

const RENAME_DIFF = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 90%
rename from src/old-name.ts
rename to src/new-name.ts
index 1234567..89abcde 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -1,1 +1,1 @@
-old
+new
`

describe("extractDiffFilePaths", () => {
  it("extracts the single touched path from a one-file diff", () => {
    expect(extractDiffFilePaths(SINGLE_FILE_DIFF)).toEqual(["src/http/claims-parser.ts"])
  })

  it("extracts every touched path from a multi-file diff, in order of first appearance", () => {
    expect(extractDiffFilePaths(MULTI_FILE_DIFF)).toEqual([
      "src/http/compatibility-descriptor.ts",
      "src/http/claims-list.ts",
    ])
  })

  it("includes both sides of a rename, deduplicated", () => {
    expect(extractDiffFilePaths(RENAME_DIFF)).toEqual(["src/old-name.ts", "src/new-name.ts"])
  })

  it("returns an empty array for an empty string", () => {
    expect(extractDiffFilePaths("")).toEqual([])
  })

  it("returns an empty array for text with no diff --git lines", () => {
    expect(extractDiffFilePaths("not a diff at all\njust text\n")).toEqual([])
  })

  it("deduplicates a path that appears on both the a/ and b/ side unchanged", () => {
    const diff = `diff --git a/src/same.ts b/src/same.ts\nindex 111..222 100644\n--- a/src/same.ts\n+++ b/src/same.ts\n@@ -1 +1 @@\n-a\n+b\n`
    expect(extractDiffFilePaths(diff)).toEqual(["src/same.ts"])
  })
})

describe("countDiffChangedLines", () => {
  it("counts added and removed content lines, excluding the +++/--- file headers", () => {
    // SINGLE_FILE_DIFF has 3 removed content lines and 10 added content lines.
    expect(countDiffChangedLines(SINGLE_FILE_DIFF)).toBe(13)
  })

  it("sums changed lines across every file in a multi-file diff", () => {
    // 1 added line per file, 2 files.
    expect(countDiffChangedLines(MULTI_FILE_DIFF)).toBe(2)
  })

  it("returns 0 for an empty string", () => {
    expect(countDiffChangedLines("")).toBe(0)
  })

  it("returns 0 for a diff with only headers and no content changes", () => {
    const diff = `diff --git a/src/x.ts b/src/x.ts\nindex 111..222 100644\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -1,1 +1,1 @@\n context line only\n`
    expect(countDiffChangedLines(diff)).toBe(0)
  })

  it("never counts a hunk header (@@ ... @@) as a changed line", () => {
    const diff = `diff --git a/src/x.ts b/src/x.ts\nindex 111..222 100644\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -1,0 +1,1 @@\n+added\n`
    expect(countDiffChangedLines(diff)).toBe(1)
  })
})
