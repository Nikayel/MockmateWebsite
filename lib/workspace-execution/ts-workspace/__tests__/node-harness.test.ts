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

  it("refuses to leak a hidden test's content through a non-driver require (security regression)", async () => {
    // src/leak.ts is an "editable" file that tries to smuggle the hidden suite in as a side-effect
    // import; a visible test file requires it as part of its own dependency graph. Before the
    // fix, the hidden suite's describe/it would register with isHidden:false (currentFile still
    // said "visible test", not the hidden path) — a real name/message leak.
    const result = await runTsWorkspace({
      files: [
        { path: "src/leak.ts", content: 'import "../tests/hidden/secret.test"\nexport {}\n' },
        {
          path: "tests/visible/uses-leak.test.ts",
          content: `import { describe, expect, it } from "vitest"
import "../../src/leak"

describe("visible", () => {
  it("passes", () => {
    expect(1).toBe(1)
  })
})
`,
        },
        {
          path: "tests/hidden/secret.test.ts",
          content: `import { describe, expect, it } from "vitest"

describe("Secret Probe", () => {
  it("should never leak", () => {
    expect(true).toBe(true)
  })
})
`,
        },
      ],
      testPaths: ["tests/visible/uses-leak.test.ts"],
      hiddenTestPaths: ["tests/hidden/secret.test.ts"],
    })

    // The leak attempt poisoned the visible file's own load (its nested require threw) — it did
    // NOT silently succeed with the hidden suite mislabeled as visible.
    const visibleFileFailure = result.results.find(
      (r) => r.suite === "tests/visible/uses-leak.test.ts"
    )
    expect(visibleFileFailure).toMatchObject({ passed: false })
    expect(visibleFileFailure?.error).toMatch(/Module not found/)

    // The hidden suite still ran (via the driver's own legitimate direct require) and is
    // correctly marked hidden — never surfaced as an ordinary visible result.
    const secretResult = result.results.find((r) => r.name === "should never leak")
    expect(secretResult).toMatchObject({ suite: "Secret Probe", passed: true, isHidden: true })

    // No row anywhere claims the hidden suite's content while marked non-hidden.
    expect(result.results.some((r) => r.suite === "Secret Probe" && r.isHidden !== true)).toBe(
      false
    )
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

  it("runs beforeEach/afterEach hooks and skips a describe.skip suite through the FULL pipeline (R13, both-runtimes check)", async () => {
    // Exercises real transpile + require-graph + shim together (not the shim in isolation, which
    // vitest-shim.test.ts already covers directly) — the hooks are declared via a real
    // `import { ... } from "vitest"` that ts.transpileModule turns into `require("vitest")`.
    const result = await runTsWorkspace({
      files: [
        {
          path: "tests/visible/hooks.test.ts",
          content: `import { afterEach, beforeEach, describe, expect, it } from "vitest"

const log: string[] = []

describe("Suite", () => {
  beforeEach(() => log.push("beforeEach"))
  afterEach(() => log.push("afterEach"))

  it("first", () => {
    log.push("first")
    expect(log).toEqual(["beforeEach", "first"])
  })

  it("second checks the previous test's afterEach already ran", () => {
    expect(log).toEqual(["beforeEach", "first", "afterEach", "beforeEach"])
  })
})

describe.skip("Skipped", () => {
  it("never runs", () => {
    throw new Error("should never execute")
  })
})
`,
        },
      ],
      testPaths: ["tests/visible/hooks.test.ts"],
      hiddenTestPaths: [],
    })

    expect(result.results).toHaveLength(2)
    expect(result.results.every((r) => r.passed)).toBe(true)
    expect(result.results.some((r) => r.name === "never runs")).toBe(false)
  })
})
