/**
 * Pins sanitizePythonTraceback to the failure that motivated it: a candidate's
 * `for course in numCourses:` (line 15 of a 19-line file) surfaced in the console as
 * "Type Error on line 527" over four repeats of Pyodide's internal call stack. The raw
 * fixture below is copied verbatim from that session's console.
 */
import { describe, expect, it } from "vitest"
import { sanitizePythonTraceback } from "../traceback"
import { PYTHON_WRAPPER_LINE_OFFSET } from "../dsa-wrapper"

const USER_CODE_LINES = 19

// Wrapper-space: user line 15 sits at 15 + offset; the <module> frame is the wrapper's own
// invocation line, far past the candidate's file.
const RAW_TYPE_ERROR = `Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
  File "/lib/python312.zip/_pyodide/_base.py", line 411, in run_async
    coroutine = eval(self.code, globals, locals)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 61}, in <module>
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 15}, in canFinish
TypeError: 'int' object is not iterable`

describe("sanitizePythonTraceback", () => {
  it("keeps only the candidate's frames, in their line numbers", () => {
    const clean = sanitizePythonTraceback(RAW_TYPE_ERROR, USER_CODE_LINES)
    expect(clean).toBe(
      `Traceback (most recent call last):\n  line 15, in canFinish\nTypeError: 'int' object is not iterable`
    )
  })

  it("never leaks Pyodide internals or wrapper-space numbers", () => {
    const clean = sanitizePythonTraceback(RAW_TYPE_ERROR, USER_CODE_LINES)
    expect(clean).not.toContain("_pyodide")
    expect(clean).not.toContain("_base.py")
    expect(clean).not.toContain("eval_code_async")
    // The wrapper's <module> invocation frame (candidate-space 61, past their 19 lines)
    // must be dropped, not shown as a line they should go look for.
    expect(clean).not.toContain("61")
    expect(clean).not.toContain(`${PYTHON_WRAPPER_LINE_OFFSET + 15}`)
  })

  it("keeps every candidate frame of a recursive failure, deepest last", () => {
    const raw = `Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 16}, in canFinish
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 14}, in dfs
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 14}, in dfs
RecursionError: maximum recursion depth exceeded`
    const clean = sanitizePythonTraceback(raw, USER_CODE_LINES)
    expect(clean).toBe(
      `Traceback (most recent call last):\n  line 16, in canFinish\n  line 14, in dfs\n  line 14, in dfs\nRecursionError: maximum recursion depth exceeded`
    )
  })

  it("reduces a wrapper-only traceback to its exception line", () => {
    // e.g. the wrapper's own "no callable function" guard: real feedback for the
    // candidate, but no frame of theirs to point at.
    const raw = `Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 130}, in <module>
Exception: No callable function found`
    expect(sanitizePythonTraceback(raw, USER_CODE_LINES)).toBe(
      "Exception: No callable function found"
    )
  })

  it("keeps source echo and carets under a kept frame (SyntaxError context)", () => {
    const raw = `Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 341, in run_async
    coroutine = eval(self.code, globals, locals)
  File "<exec>", line ${PYTHON_WRAPPER_LINE_OFFSET + 3}
    for crs,pre in prerequisites
                                ^
SyntaxError: expected ':'`
    const clean = sanitizePythonTraceback(raw, USER_CODE_LINES)
    expect(clean).toContain("line 3")
    expect(clean).toContain("for crs,pre in prerequisites")
    expect(clean).toContain("^")
    expect(clean).toContain("SyntaxError: expected ':'")
    expect(clean).not.toContain("_pyodide")
  })

  it("passes non-traceback messages through untouched", () => {
    const timeout = "Code execution timed out. Try checking for infinite loops."
    expect(sanitizePythonTraceback(timeout, USER_CODE_LINES)).toBe(timeout)
    const boot = "Couldn't start the Python runtime. Check your connection and try again."
    expect(sanitizePythonTraceback(boot, USER_CODE_LINES)).toBe(boot)
  })
})
