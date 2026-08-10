import { describe, expect, it } from "vitest"

import { formatErrorMessage, getErrorType } from "../CodeConsole"

/**
 * What getErrorType returns decides whether a candidate is told a failure is their fault.
 *
 * It got that wrong in the way that matters most: the sandbox's assert shim was missing
 * `deepEqual`, every test threw "assert.deepEqual is not a function", and because that
 * string contains "is not a function" the console called it a Type Error and told the
 * candidate to verify their own variable types and function signatures. They spent the
 * interview debugging correct code.
 */

describe("getErrorType", () => {
  describe("harness faults", () => {
    it("classifies a missing assert method as ours, not a Type Error", () => {
      // The exact string that shipped.
      expect(getErrorType("assert.deepEqual is not a function")).toBe("harness")
    })

    it("covers any missing assert member, not just deepEqual", () => {
      expect(getErrorType("assert.notDeepStrictEqual is not a function")).toBe("harness")
      expect(getErrorType("assert is not a function")).toBe("harness")
    })

    it("classifies a shim that failed to load", () => {
      expect(getErrorType("self.createAssertShim is not a function")).toBe("harness")
      expect(getErrorType("Failed to execute 'importScripts' on 'WorkerGlobalScope'")).toBe(
        "harness"
      )
    })

    it("classifies the sandbox failing to resolve its own assert module", () => {
      expect(getErrorType("Module not found: node:assert (resolved as: node:assert)")).toBe(
        "harness"
      )
    })
  })

  describe("faults that really are the candidate's", () => {
    it("still classifies a genuine TypeError in their code", () => {
      // The harness rule must not swallow real bugs. Only `assert` members are ours.
      expect(getErrorType("TypeError: rows.filter is not a function")).toBe("type")
      expect(getErrorType("lineItems.forEach is not a function")).toBe("type")
      expect(getErrorType("undefined is not a function")).toBe("type")
    })

    it("still classifies syntax, runtime and timeout errors", () => {
      expect(getErrorType("SyntaxError: Unexpected token )")).toBe("syntax")
      expect(getErrorType("ReferenceError: seenAmounts is not defined")).toBe("type")
      expect(getErrorType("RangeError: Maximum call stack size exceeded")).toBe("timeout")
    })
  })

  describe("assertion failures", () => {
    it("reads an assertion message as a logic error, not a runtime error", () => {
      // These messages quote the values they compared. "undefined" appearing in the quoted
      // value was matching the runtime bucket, so a wrong answer was reported as a crash.
      expect(getErrorType("Expected deep equality, got undefined vs [0,2]")).toBe("logic")
      expect(getErrorType("Expected deep equality, got null vs []")).toBe("logic")
      expect(getErrorType("Expected [0,2] == []")).toBe("logic")
    })

    it("only matches at the start, so a runtime error mentioning the word is unaffected", () => {
      expect(getErrorType("TypeError: expected an object but rows is undefined")).toBe("type")
    })
  })
})

describe("formatErrorMessage", () => {
  it("tells the candidate a harness fault is not theirs and not judged", () => {
    const { title, hint } = formatErrorMessage("assert.deepEqual is not a function", "javascript")

    expect(title).not.toMatch(/Type Error/)
    expect(hint).toMatch(/not in your code/i)
    expect(hint).toMatch(/has not been judged/i)
  })

  // Reported line numbers are wrapper-relative, so they must clear
  // JAVASCRIPT_WRAPPER_LINE_OFFSET (80) to resolve to a line in the candidate's file.
  it("does not pin a harness fault to a line in the candidate's code", () => {
    // A line number here sends them hunting for a bug they did not write.
    const { title } = formatErrorMessage(
      "assert.deepEqual is not a function at line 142",
      "javascript",
      100
    )

    expect(title).not.toMatch(/line/i)
  })

  it("still reports a line number for a real error in their code", () => {
    const { title } = formatErrorMessage(
      "SyntaxError: Unexpected token at line 142",
      "javascript",
      100
    )

    expect(title).toMatch(/on line 62/)
  })
})

// The console once titled a candidate's `for course in numCourses:` (their line 15) as
// "Type Error on line 527": the first `line N` in a raw Pyodide traceback is always a
// Pyodide-internal frame, and the blanket offset regex then rewrote 597 into 527. These
// pin the python path: last-<exec>-frame wins, internals never render, and sanitized
// runner output is never adjusted a second time.
describe("python traceback display", () => {
  const OFFSET = 70 // PYTHON_WRAPPER_LINE_OFFSET, inlined so a drift fails loudly here
  const raw = `Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
  File "/lib/python312.zip/_pyodide/_base.py", line 411, in run_async
    coroutine = eval(self.code, globals, locals)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<exec>", line ${OFFSET + 61}, in <module>
  File "<exec>", line ${OFFSET + 15}, in canFinish
TypeError: 'int' object is not iterable`

  it("titles a raw traceback with the candidate's own line", () => {
    const { title } = formatErrorMessage(raw, "python", 19)
    expect(title).toBe("🟠 Type Error on line 15")
  })

  it("renders details without Pyodide internals or wrapper frames", () => {
    const { details } = formatErrorMessage(raw, "python", 19)
    expect(details).toContain("line 15, in canFinish")
    expect(details).toContain("TypeError: 'int' object is not iterable")
    expect(details).not.toContain("_pyodide")
    expect(details).not.toContain("eval_code_async")
    expect(details).not.toContain("527")
    expect(details).not.toContain("line 61")
  })

  it("uses sanitized runner output verbatim - no second offset subtraction", () => {
    const sanitized = `Traceback (most recent call last):
  line 15, in canFinish
TypeError: 'int' object is not iterable`
    const { title, details } = formatErrorMessage(sanitized, "python", 19)
    expect(title).toBe("🟠 Type Error on line 15")
    expect(details).toBe(sanitized)
  })
})
