/**
 * Correctness guard for every single-file Python lesson: the authored `referenceSolution`
 * must actually PASS its own `testCases`, graded by the same wrapper + validator the
 * learner's run uses. The SQL course has had this guard since it shipped
 * (`lib/tutorials/sql/__tests__/reference-solutions.test.ts`); Python never did, which is
 * how `buildPythonWrapper` came to emit JS `true`/`null` into Python source and break the
 * booleans lessons without a single red test.
 *
 * A model answer that does not pass its own tests is worse than no model answer: the
 * lesson reveals it after a few attempts, so the learner reads a "correct" solution the
 * grader rejects.
 *
 * Runs against a real python3 rather than Pyodide (same interpreter semantics, no WASM
 * boot per case), mirroring how the SQL suite runs the same sql.js the worker uses.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "child_process"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { buildPythonWrapper } from "@/lib/workspace-execution/python-sandbox/dsa-wrapper"
import { stripComments } from "@/lib/workspace-execution/js-sandbox/comments"
import { validateResultEnhanced } from "@/lib/validators"
import type { PythonExercise } from "@/lib/tutorials/types"

interface SingleFileCase {
  lessonId: string
  slot: string
  exercise: PythonExercise
}

const cases: SingleFileCase[] = []
for (const level of PYTHON_LEVELS) {
  for (const mod of level.modules) {
    for (const lesson of mod.lessons) {
      const slots: Array<[string, PythonExercise]> = [
        ["apply", lesson.apply],
        ["practice", lesson.practice],
        ...(lesson.extraPractice ?? []).map(
          (exercise, index) => [`extra-practice[${index}]`, exercise] as [string, PythonExercise]
        ),
      ]
      for (const [slot, exercise] of slots) {
        if (
          exercise?.executionMode === "single-file" &&
          exercise.referenceSolution &&
          exercise.testCases?.length
        ) {
          cases.push({ lessonId: lesson.id, slot, exercise })
        }
      }
    }
  }
}

/** Runs one wrapped case and returns the value the runner would grade. */
function runCase(exercise: PythonExercise, testCase: unknown): unknown {
  const code = exercise.referenceSolution as string
  const wrapped = buildPythonWrapper(code, testCase, stripComments(code, "python"), exercise.id)
  // Pyodide returns the trailing `_result` expression; python3 -c has to print it.
  const script = wrapped.replace(/\n_result\n$/, "\nprint(json.dumps(_result))\n")
  const stdout = execFileSync("python3", ["-c", script], { encoding: "utf8", timeout: 20000 })
  const lines = stdout.trim().split("\n")
  return JSON.parse(lines[lines.length - 1])
}

describe("Python reference solutions pass their own test cases", () => {
  it("collected single-file cases", () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  for (const { lessonId, slot, exercise } of cases) {
    it(`${lessonId} [${slot}]`, () => {
      const failures: string[] = []

      for (const testCase of exercise.testCases!) {
        let actual: unknown
        try {
          actual = runCase(exercise, testCase)
        } catch (error) {
          const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error)
          failures.push(`${testCase.description}: raised ${stderr.trim().split("\n").pop()}`)
          continue
        }

        const validation = validateResultEnhanced(actual, testCase as never, exercise.id, "python")
        if (!validation.passed) {
          failures.push(
            `${testCase.description}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`
          )
        }
      }

      expect(failures).toEqual([])
    })
  }
})
