import { describe, expect, it } from "vitest"

import { runTsWorkspace } from "../node-harness"
import {
  FIVE_FILE_HIDDEN_TEST_PATHS,
  FIVE_FILE_TEST_PATHS,
  FIVE_FILE_WORKSPACE,
} from "./fixtures/five-file-workspace"

describe("runTsWorkspace (Node harness)", () => {
  it("transpiles, links, and runs a 5-file TS workspace with passing, failing, and hidden suites", async () => {
    const result = await runTsWorkspace({
      files: FIVE_FILE_WORKSPACE,
      testPaths: FIVE_FILE_TEST_PATHS,
      hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
    })

    expect(result.error).toBeNull()
    expect(result.results).toHaveLength(6)
    expect(result.summary.total).toBe(6)
    expect(result.summary.passed).toBe(5)
    expect(result.summary.failed).toBe(1)
    expect(result.success).toBe(false) // one test fails on purpose

    const byName = new Map(result.results.map((r) => [r.name, r]))

    expect(byName.get("adds two numbers")).toMatchObject({
      suite: "math",
      passed: true,
      isHidden: false,
    })
    expect(byName.get("is wrong on purpose")).toMatchObject({
      suite: "math",
      passed: false,
      isHidden: false,
    })
    expect(byName.get("is wrong on purpose")?.error).toMatch(/to be/)
    expect(byName.get("divide throws on zero")).toMatchObject({ passed: true })
    expect(byName.get("shouts the total")).toMatchObject({
      suite: "format",
      passed: true,
      isHidden: false,
    })
    expect(byName.get("still runs from inside a visible file")).toMatchObject({
      suite: "Hidden edge cases",
      passed: true,
      isHidden: true,
    })
    expect(byName.get("greets asynchronously")).toMatchObject({
      suite: "PaymentProcessor greeting",
      passed: true,
      isHidden: true,
    })
  })

  it("applies editableOverlay before transpiling, so a learner edit changes graded behavior", async () => {
    const result = await runTsWorkspace({
      files: FIVE_FILE_WORKSPACE,
      editableOverlay: [
        {
          path: "src/math.ts",
          content: `export function add(a: number, b: number): number {
  return a + b + 1000
}
export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Cannot divide by zero")
  return a / b
}
`,
        },
      ],
      testPaths: FIVE_FILE_TEST_PATHS,
      hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
    })
    const byName = new Map(result.results.map((r) => [r.name, r]))
    expect(byName.get("adds two numbers")?.passed).toBe(false)
  })

  it("ignores an overlay path that is not part of the workspace", async () => {
    const result = await runTsWorkspace({
      files: FIVE_FILE_WORKSPACE,
      editableOverlay: [{ path: "src/not-a-real-file.ts", content: "export const x = 1" }],
      testPaths: FIVE_FILE_TEST_PATHS,
      hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
    })
    expect(result.error).toBeNull()
    expect(result.results.length).toBeGreaterThan(0)
  })

  it("reports non-negative per-file transpile timing for every .ts file", async () => {
    const result = await runTsWorkspace({
      files: FIVE_FILE_WORKSPACE,
      testPaths: FIVE_FILE_TEST_PATHS,
      hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
    })
    for (const file of FIVE_FILE_WORKSPACE) {
      expect(result.transpileTimingsMs[file.path]).toBeGreaterThanOrEqual(0)
    }
  })

  it("isolates a broken test file's load failure instead of losing every other file's results", async () => {
    const result = await runTsWorkspace({
      files: FIVE_FILE_WORKSPACE,
      testPaths: [...FIVE_FILE_TEST_PATHS, "tests/visible/missing.test.ts"],
      hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
    })
    const failedFileRow = result.results.find((r) => r.suite === "tests/visible/missing.test.ts")
    expect(failedFileRow).toMatchObject({ passed: false })
    expect(result.results.some((r) => r.name === "adds two numbers")).toBe(true)
  })

  it("fails cleanly (no thrown exception) when the workspace has no files at all", async () => {
    const result = await runTsWorkspace({
      files: [],
      testPaths: ["missing.test.ts"],
      hiddenTestPaths: [],
    })
    expect(result.success).toBe(false)
    expect(result.results[0]).toMatchObject({ passed: false })
  })
})
