"use client"

import { useRef, useState } from "react"
import {
  executeScenarioInBrowser,
  isPythonRuntimeWarm,
  markPythonRuntimeWarm,
} from "@/lib/workspace-execution"
import { toTutorialExerciseScenario } from "@/lib/tutorials/exercise-scenario-adapters"
import { mapResultRow, type RawResultRow } from "@/lib/tutorials/test-result-mapping"
import { useLessonTelemetry } from "./LessonTelemetryProvider"
import type { TestResult } from "@/components/interview/TestResultsPanel"
import type { LessonSection, PythonExercise, SqlExercise } from "@/lib/tutorials/types"

/**
 * Shared grading logic for both the single-file and workspace exercise runners. Runs the
 * exercise entirely client-side (Pyodide via `executeScenarioInBrowser`), maps the result rows
 * into `TestResultsPanel`'s shape, and tracks pass/attempt state. The UI components own only the
 * editor surface (one editor vs file tabs) and decide what to pass to `run`.
 *
 * Every graded run is also recorded as an item response. Recording happens HERE rather than
 * in each runner because this is the one place that sees the actual result rows, and a
 * failed run is the interesting one: which assertions failed, and how many attempts in.
 */
export interface RunInput {
  /** Single-file: the editor contents. */
  code?: string
  /** Workspace: the edited editable files. */
  workspaceFiles?: Array<{ path: string; content: string }>
}

export interface ExerciseRunState {
  running: boolean
  /** True only while the first run of the session is booting the Python runtime. */
  warming: boolean
  results: TestResult[]
  runError: string | null
  attempts: number
  /** Sticky "ever passed" latch — true once the exercise has passed, stays true. Gates onPass. */
  passed: boolean
  /**
   * Pass/fail of the LATEST graded run only, or null before the first run / on an errored run.
   * Live indicators (the "passed" chip, showing the expected result) must read this, not `passed`,
   * so breaking a solved query flips the UI back instead of leaving a stale green chip.
   */
  lastRunPassed: boolean | null
  /**
   * Percentage of tests passed on the LATEST graded run (0-100), or null before the first
   * run / on an errored run. This is what `lastExerciseScore` is supposed to hold; the
   * player persists it instead of the constant it used to write.
   */
  lastScore: number | null
  run: (input: RunInput) => Promise<void>
}

export interface ExerciseRunCallbacks {
  /** Fires once when every test passes for the first time. */
  onPass?: () => void
  /** Fires after every graded run with that run's pass/fail (drives Sable's reactions). */
  onResult?: (passed: boolean) => void
  /**
   * Which lesson phase this exercise is being run in. Only affects telemetry (an apply
   * attempt and a practice attempt are different observations); defaults to `"apply"`.
   */
  section?: LessonSection
}

/**
 * Coarse failure bucket for error-taxonomy work. Deliberately small and stable: the point
 * is to make "this cohort keeps hitting NameError" answerable without parsing free text
 * at analysis time. The raw message is kept alongside it in `failed_tests`.
 */
function classifyErrorKind(rows: TestResult[], runError: string | null): string | undefined {
  const text = runError ?? rows.find((r) => !r.passed && r.error)?.error ?? ""
  if (!text) return rows.some((r) => !r.passed) ? "assertion" : undefined
  if (/SyntaxError|IndentationError|unexpected EOF/i.test(text)) return "syntax"
  if (/NameError|not defined|No callable function/i.test(text)) return "name"
  if (/TypeError/i.test(text)) return "type"
  if (/IndexError|KeyError/i.test(text)) return "lookup"
  if (/ValueError/i.test(text)) return "value"
  if (/ZeroDivisionError/i.test(text)) return "arithmetic"
  if (/AttributeError/i.test(text)) return "attribute"
  if (/RecursionError|maximum recursion/i.test(text)) return "recursion"
  if (/timed? ?out|timeout/i.test(text)) return "timeout"
  return "runtime"
}

/**
 * `TestResult.expected`/`actual` are `any` (a row can hold a list, a dict, or a table), and
 * `error` is `string | null`. The telemetry schema takes strings and omits absent fields, so
 * normalize here rather than letting a `null` or an object reach the request body.
 */
function toFailedTest(row: TestResult): {
  name?: string
  expected?: string
  actual?: string
  error?: string
} {
  const asText = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined
    return typeof value === "string" ? value : JSON.stringify(value)
  }
  const failed: { name?: string; expected?: string; actual?: string; error?: string } = {}
  if (row.description) failed.name = row.description
  const expected = asText(row.expected)
  if (expected !== undefined) failed.expected = expected
  const actual = asText(row.actual)
  if (actual !== undefined) failed.actual = actual
  if (row.error) failed.error = row.error
  return failed
}

export function useExerciseRun(
  exercise: PythonExercise | SqlExercise,
  callbacks: ExerciseRunCallbacks = {}
): ExerciseRunState {
  const { onPass, onResult, section = "apply" } = callbacks
  const { record } = useLessonTelemetry()
  const [running, setRunning] = useState(false)
  const [warming, setWarming] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [passed, setPassed] = useState(false)
  const [lastRunPassed, setLastRunPassed] = useState<boolean | null>(null)
  const [lastScore, setLastScore] = useState<number | null>(null)
  // Counts EVERY graded run, unlike `attempts` (which counts only failures, because it
  // gates the reference reveal). Analysis needs the true run number of each observation.
  const runIndex = useRef(0)
  const startedAt = useRef<number>(0)

  const run = async (input: RunInput) => {
    setRunning(true)
    setWarming(!isPythonRuntimeWarm())
    setRunError(null)
    runIndex.current += 1
    startedAt.current = Date.now()
    try {
      const scenario = toTutorialExerciseScenario(exercise)
      if (!scenario) {
        setRunError("This exercise could not be loaded. Please refresh and try again.")
        return
      }

      const result = await executeScenarioInBrowser({
        code: input.code ?? "",
        scenario,
        language: "python",
        workspaceFiles: input.workspaceFiles,
      })

      if (!result) {
        setRunError("Python isn't available in this browser right now. Please try again.")
        return
      }

      const rows = (result.results as RawResultRow[]) ?? []
      const mapped = rows.map(mapResultRow)
      setResults(mapped)

      // A service/load failure with no graded rows: surface a retry message, not a blank panel.
      if (mapped.length === 0) {
        setRunError(result.error ?? "No tests ran. Please try again.")
        setLastRunPassed(null)
        setLastScore(null)
        return
      }

      const allPassed = result.success && mapped.every((r) => r.passed)
      const passedCount = mapped.filter((r) => r.passed).length
      setLastRunPassed(allPassed)
      setLastScore(Math.round((passedCount / mapped.length) * 100))
      onResult?.(allPassed)

      record({
        kind: "exercise_run",
        section,
        itemId: exercise.id,
        attemptIndex: runIndex.current,
        passed: allPassed,
        testsTotal: mapped.length,
        testsPassed: passedCount,
        errorKind: allPassed ? undefined : classifyErrorKind(mapped, result.error ?? null),
        failedTests: allPassed ? undefined : mapped.filter((r) => !r.passed).map(toFailedTest),
        latencyMs: Date.now() - startedAt.current,
      })

      if (allPassed) {
        if (!passed) onPass?.()
        setPassed(true)
      } else {
        setAttempts((n) => n + 1)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong running your code."
      setRunError(message)
      setLastRunPassed(null)
      setLastScore(null)
      record({
        kind: "exercise_run",
        section,
        itemId: exercise.id,
        attemptIndex: runIndex.current,
        passed: false,
        errorKind: classifyErrorKind([], message),
        failedTests: [{ error: message }],
        latencyMs: Date.now() - startedAt.current,
      })
    } finally {
      markPythonRuntimeWarm()
      setWarming(false)
      setRunning(false)
    }
  }

  return { running, warming, results, runError, attempts, passed, lastRunPassed, lastScore, run }
}
