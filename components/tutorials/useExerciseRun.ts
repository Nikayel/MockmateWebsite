"use client"

import { useState } from "react"
import { executeScenarioInBrowser } from "@/lib/workspace-execution"
import { getTutorialExerciseScenario } from "@/lib/tutorials/exercise-scenarios"
import type { TestResult } from "@/components/interview/TestResultsPanel"
import type { PythonExercise } from "@/lib/tutorials/types"

/**
 * Shared grading logic for both the single-file and workspace exercise runners. Runs the
 * exercise entirely client-side (Pyodide via `executeScenarioInBrowser`), maps the result rows
 * into `TestResultsPanel`'s shape, and tracks pass/attempt state. The UI components own only the
 * editor surface (one editor vs file tabs) and decide what to pass to `run`.
 */
type RawResultRow = {
  description?: string
  suite?: string
  name?: string
  passed: boolean
  input?: unknown
  expected?: unknown
  actual?: unknown
  error: string | null
  isHidden?: boolean
}

/** Map a client-runner row (single-file or workspace shape) to a `TestResultsPanel` row. */
function toTestResult(row: RawResultRow): TestResult {
  // Hidden workspace tests still execute, but their source, suite/name, and assertion text must
  // never reach the UI (HANDOFF §C). Surface only pass/fail behind a generic label.
  if (row.isHidden) {
    return {
      description: "Hidden test",
      passed: row.passed,
      input: null,
      expected: "pass",
      actual: row.passed ? "pass" : "fail",
      error: row.passed
        ? null
        : "A hidden test failed — your code didn't satisfy a requirement that isn't shown here.",
    }
  }

  const description =
    row.description ?? (row.suite && row.name ? `${row.suite}: ${row.name}` : (row.name ?? "Test"))
  return {
    description,
    passed: row.passed,
    input: row.input ?? row.suite ?? null,
    expected: row.expected ?? "pass",
    actual: row.actual ?? (row.passed ? "pass" : "fail"),
    error: row.error,
  }
}

export interface RunInput {
  /** Single-file: the editor contents. */
  code?: string
  /** Workspace: the edited editable files. */
  workspaceFiles?: Array<{ path: string; content: string }>
}

/**
 * Pyodide boots once per session (it downloads + starts the WASM runtime on the first Run, which is
 * multi-second). Module-level so every runner shares the same "has it warmed yet" signal — the first
 * run anywhere shows a distinct "Starting Python…" state; later runs are fast. See HANDOFF §C.
 */
let pyodideWarmed = false

export interface ExerciseRunState {
  running: boolean
  /** True only while the first run of the session is booting the Python runtime. */
  warming: boolean
  results: TestResult[]
  runError: string | null
  attempts: number
  passed: boolean
  run: (input: RunInput) => Promise<void>
}

export interface ExerciseRunCallbacks {
  /** Fires once when every test passes for the first time. */
  onPass?: () => void
  /** Fires after every graded run with that run's pass/fail (drives Sable's reactions). */
  onResult?: (passed: boolean) => void
}

export function useExerciseRun(
  exercise: PythonExercise,
  callbacks: ExerciseRunCallbacks = {}
): ExerciseRunState {
  const { onPass, onResult } = callbacks
  const [running, setRunning] = useState(false)
  const [warming, setWarming] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [passed, setPassed] = useState(false)

  const run = async (input: RunInput) => {
    setRunning(true)
    setWarming(!pyodideWarmed)
    setRunError(null)
    try {
      const scenario = getTutorialExerciseScenario(exercise.id)
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
      const mapped = rows.map(toTestResult)
      setResults(mapped)

      // A service/load failure with no graded rows: surface a retry message, not a blank panel.
      if (mapped.length === 0) {
        setRunError(result.error ?? "No tests ran. Please try again.")
        return
      }

      const allPassed = result.success && mapped.every((r) => r.passed)
      onResult?.(allPassed)
      if (allPassed) {
        if (!passed) onPass?.()
        setPassed(true)
      } else {
        setAttempts((n) => n + 1)
      }
    } catch (error) {
      setRunError(
        error instanceof Error ? error.message : "Something went wrong running your code."
      )
    } finally {
      pyodideWarmed = true
      setWarming(false)
      setRunning(false)
    }
  }

  return { running, warming, results, runError, attempts, passed, run }
}
