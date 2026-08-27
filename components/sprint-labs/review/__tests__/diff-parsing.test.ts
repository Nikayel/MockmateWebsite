import { describe, expect, it } from "vitest"
import { formatChangedLines, splitDiffByFile } from "../diff-parsing"

const TWO_FILE_DIFF = `diff --git a/src/pool.ts b/src/pool.ts
index 1111111..2222222 100644
--- a/src/pool.ts
+++ b/src/pool.ts
@@ -40,3 +40,5 @@ export function release(client) {
-  client.release()
+  await client.query("RESET ALL")
+  client.release()
 }
diff --git a/src/index.ts b/src/index.ts
index 3333333..4444444 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,1 +1,1 @@
-export {}
+export { release } from "./pool"
`

describe("splitDiffByFile", () => {
  it("splits into one entry per diff --git block, in order", () => {
    const entries = splitDiffByFile(TWO_FILE_DIFF)
    expect(entries.map((e) => e.path)).toEqual(["src/pool.ts", "src/index.ts"])
  })

  it("counts added/removed content lines, excluding the +++/--- file headers", () => {
    const [pool] = splitDiffByFile(TWO_FILE_DIFF)
    expect(pool.added).toBe(2)
    expect(pool.removed).toBe(1)
  })

  it("keeps each file's hunk text scoped to that file only", () => {
    const [pool, index] = splitDiffByFile(TWO_FILE_DIFF)
    expect(pool.hunkText).toContain("RESET ALL")
    expect(pool.hunkText).not.toContain("export { release }")
    expect(index.hunkText).toContain("export { release }")
  })

  it("returns an empty array for text with no diff --git header", () => {
    expect(splitDiffByFile("")).toEqual([])
    expect(splitDiffByFile("not a diff")).toEqual([])
  })
})

describe("formatChangedLines", () => {
  it("formats as +added -removed", () => {
    expect(formatChangedLines(34, 6)).toBe("+34 -6")
    expect(formatChangedLines(0, 0)).toBe("+0 -0")
  })
})
