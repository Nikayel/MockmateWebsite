"use client"

import { useState } from "react"
import {
  executeScenarioInBrowser,
  isPythonRuntimeWarm,
  markPythonRuntimeWarm,
} from "@/lib/workspace-execution"
import { getTutorialExerciseScenario } from "@/lib/tutorials/exercise-scenarios"
import { mapResultRow, type RawResultRow } from "@/lib/tutorials/test-result-mapping"
import type { TestResult } from "@/components/interview/TestResultsPanel"
import type { PythonExercise } from "@/lib/tutorials/types"

/**
 * Shared grading logic for both the single-file and workspace exercise runners. Runs the
 * exercise entirely client-side (Pyodide via `executeScenarioInBrowser`), maps the result rows
 * into `TestResultsPanel`'s shape, and tracks pass/attempt state. The UI components own only the
 * editor surface (one editor vs file tabs) and decide what to pass to `run`.
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
  const [lastRunPassed, setLastRunPassed] = useState<boolean | null>(null)

  const run = async (input: RunInput) => {
    setRunning(true)
    setWarming(!isPythonRuntimeWarm())
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
      const mapped = rows.map(mapResultRow)
      setResults(mapped)

      // A service/load failure with no graded rows: surface a retry message, not a blank panel.
      if (mapped.length === 0) {
        setRunError(result.error ?? "No tests ran. Please try again.")
        setLastRunPassed(null)
        return
      }

      const allPassed = result.success && mapped.every((r) => r.passed)
      setLastRunPassed(allPassed)
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
      setLastRunPassed(null)
    } finally {
      markPythonRuntimeWarm()
      setWarming(false)
      setRunning(false)
    }
  }

  return { running, warming, results, runError, attempts, passed, lastRunPassed, run }
}
