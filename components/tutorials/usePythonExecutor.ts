"use client"

import { useState } from "react"
import {
  isPythonRuntimeWarm,
  markPythonRuntimeWarm,
  runPythonInWorker,
} from "@/lib/workspace-execution"

/**
 * Free-form Python execution — no test cases, no scenario, no grading. Runs whatever code the user
 * typed via the same Pyodide worker the lesson runners use (`runPythonInWorker`), and surfaces raw
 * stdout/stderr plus the value of the final expression, if any. Shares the cross-surface Pyodide
 * warm-state so the cold start only happens once per session, in either surface.
 */
export interface PythonExecutorLine {
  type: "log" | "error"
  message: string
}

export interface PythonExecutorState {
  running: boolean
  /** True only while the first run of the session is booting the Python runtime. */
  warming: boolean
  output: PythonExecutorLine[]
  /** The value of the last expression, if the script ended in one (REPL-style echo). */
  result: unknown
  error: string | null
  run: (code: string) => Promise<void>
  clear: () => void
}

export function usePythonExecutor(): PythonExecutorState {
  const [running, setRunning] = useState(false)
  const [warming, setWarming] = useState(false)
  const [output, setOutput] = useState<PythonExecutorLine[]>([])
  const [result, setResult] = useState<unknown>(undefined)
  const [error, setError] = useState<string | null>(null)

  const run = async (code: string) => {
    setRunning(true)
    setWarming(!isPythonRuntimeWarm())
    setError(null)
    setResult(undefined)
    try {
      const outcome = await runPythonInWorker(code)
      // The worker also emits transient "info" boot-status lines — never part of the program's output.
      setOutput(
        outcome.logs
          .filter((line) => line.type === "log" || line.type === "error")
          .map((line) => ({ type: line.type as "log" | "error", message: line.message }))
      )
      if (outcome.success) {
        setResult(outcome.result)
      } else {
        setError(outcome.error ?? "Something went wrong running your code.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong running your code.")
    } finally {
      markPythonRuntimeWarm()
      setWarming(false)
      setRunning(false)
    }
  }

  const clear = () => {
    setOutput([])
    setResult(undefined)
    setError(null)
  }

  return { running, warming, output, result, error, run, clear }
}
