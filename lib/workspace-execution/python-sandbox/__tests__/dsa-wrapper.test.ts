/**
 * The wrapper builds the Python source that Pyodide actually executes, so the one
 * property that matters is that the source RUNS. It had no tests at all, and that is
 * exactly how `_input = [3,9,20,null,null,15,7]` shipped: JSON's `true`/`false`/`null`
 * are not Python names, so every test case carrying a boolean or a null died on a
 * NameError before the learner's code was reached. That silently broke every
 * tree/linked-list DSA scenario (null marks an absent child) and the Learn-Python
 * booleans lessons.
 *
 * These run the emitted source through a REAL Python interpreter rather than asserting
 * on the string, because "is this valid Python" is not a question a substring match can
 * answer — the bug being guarded here was a perfectly well-formed string.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "child_process"
import { buildPythonWrapper, PYTHON_WRAPPER_LINE_OFFSET } from "../dsa-wrapper"

/** Runs the wrapper source and returns the value it resolves `_result` to. */
function runWrapper(code: string, input: Record<string, unknown>, scenarioId: string): unknown {
  const wrapped = buildPythonWrapper(code, { input }, code, scenarioId)
  // Pyodide evaluates the trailing `_result` expression; python3 -c needs it printed.
  const script = wrapped.replace(/\n_result\n$/, "\nprint(json.dumps(_result))\n")
  const stdout = execFileSync("python3", ["-c", script], { encoding: "utf8", timeout: 20000 })
  const lines = stdout.trim().split("\n")
  return JSON.parse(lines[lines.length - 1])
}

describe("buildPythonWrapper emits executable Python", () => {
  it("passes a boolean input through as Python True", () => {
    const code = "def solution(age, citizen):\n    return age >= 18 and citizen"
    expect(runWrapper(code, { age: 20, citizen: true }, "x")).toBe(true)
    expect(runWrapper(code, { age: 20, citizen: false }, "x")).toBe(false)
  })

  it("passes a null input through as Python None", () => {
    const code = "def solution(value):\n    return value is None"
    expect(runWrapper(code, { value: null }, "x")).toBe(true)
  })

  it("builds a tree from a null-bearing level-order array", () => {
    // The LeetCode encoding every tree scenario in lib/scenarios/dsa uses.
    const code = "def solution(root):\n    return tree_to_array(root)"
    expect(runWrapper(code, { root: [3, 9, 20, null, null, 15, 7] }, "dsa-x")).toEqual([
      3,
      9,
      20,
      null,
      null,
      15,
      7,
    ])
  })

  it("survives strings that would break naive quoting", () => {
    const code = "def solution(text):\n    return text"
    for (const text of ["it's", 'say "hi"', "back\\slash", "line\nbreak", "emoji 😀", "null"]) {
      expect(runWrapper(code, { text }, "x")).toBe(text)
    }
  })

  /**
   * The console subtracts PYTHON_WRAPPER_LINE_OFFSET from every traceback line to point
   * the learner at their own editor. A stale constant is invisible until someone reads a
   * wrong line number and mistrusts the whole console, so pin it to the template. The
   * offset must also not depend on the INPUT, or a long payload would shift every line.
   */
  describe("PYTHON_WRAPPER_LINE_OFFSET", () => {
    const MARKER = "###USER_CODE###"
    const userCodeLine = (input: Record<string, unknown>) =>
      buildPythonWrapper(MARKER, { input }, "def solution(n):\n    return n", "x")
        .split("\n")
        .findIndex((line) => line.includes(MARKER)) + 1

    it("names the line the learner's code actually starts on", () => {
      expect(userCodeLine({ n: 1 })).toBe(PYTHON_WRAPPER_LINE_OFFSET + 1)
    })

    it("does not shift with the size or shape of the input", () => {
      for (const input of [{}, { root: [1, null, 2] }, { s: "x".repeat(5000) }, { a: true }]) {
        expect(userCodeLine(input)).toBe(PYTHON_WRAPPER_LINE_OFFSET + 1)
      }
    })
  })

  it("still resolves a Solution class method and a bare function", () => {
    expect(
      runWrapper(
        "class Solution:\n    def two_sum(self, nums):\n        return nums",
        { nums: [1] },
        "x"
      )
    ).toEqual([1])
    expect(runWrapper("def solution(nums):\n    return nums", { nums: [1] }, "x")).toEqual([1])
  })
})
