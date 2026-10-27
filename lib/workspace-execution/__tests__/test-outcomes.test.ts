import { describe, expect, it } from "vitest"
import { classifyExecutionFailure, summarizeExecutionTests } from "../test-outcomes"
import { executionSourceRevision } from "../source-revision"

describe("execution measurement contracts", () => {
  it("keeps a candidate timeout in the denominator while excluding a runtime startup failure", () => {
    const result = summarizeExecutionTests([
      { passed: true },
      { passed: false, error: "Code execution timed out", failureKind: "candidate-timeout" },
      { passed: false, error: "Runtime startup timed out", failureKind: "service" },
      { passed: false, error: "assert.deepEqual is not a function" },
    ])
    expect(result).toEqual({
      total: 4,
      passed: 1,
      failed: 1,
      passRate: 50,
      serviceErrors: 2,
      effectiveTotal: 2,
    })
  })

  it("does not blame the platform for a candidate exception returning null", () => {
    expect(
      classifyExecutionFailure({ passed: false, error: "TypeError: cannot read property" })
    ).toBe("candidate")
  })

  it("identifies source independently of tab order and active editor buffer", async () => {
    const files = [
      { path: "a.py", content: "first", role: "editable" },
      { path: "b.py", content: "second", role: "editable" },
    ]
    expect(await executionSourceRevision("first", files)).toBe(
      await executionSourceRevision("second", [...files].reverse())
    )
    expect(await executionSourceRevision("first", files)).not.toBe(
      await executionSourceRevision("first", [{ ...files[0], content: "changed" }, files[1]])
    )
  })
})
