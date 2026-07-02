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

/** Coarse run lifecycle for the Output header status pill. */
export type PythonExecutorStatus = "idle" | "running" | "success" | "error"

export interface PythonExecutorState {
  running: boolean
  /** True only while the first run of the session is booting the Python runtime. */
  warming: boolean
  status: PythonExecutorStatus
  /** Wall-clock duration of the last completed run, in ms (null until a run finishes). */
  elapsedMs: number | null
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
  const [status, setStatus] = useState<PythonExecutorStatus>("idle")
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [output, setOutput] = useState<PythonExecutorLine[]>([])
  const [result, setResult] = useState<unknown>(undefined)
  const [error, setError] = useState<string | null>(null)

  const run = async (code: string) => {
    setRunning(true)
    setStatus("running")
    setWarming(!isPythonRuntimeWarm())
    setError(null)
    setResult(undefined)
    const startedAt = performance.now()
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
        setStatus("success")
      } else {
        setError(outcome.error ?? "Something went wrong running your code.")
        setStatus("error")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong running your code.")
      setStatus("error")
    } finally {
      setElapsedMs(Math.round(performance.now() - startedAt))
      markPythonRuntimeWarm()
      setWarming(false)
      setRunning(false)
    }
  }

  const clear = () => {
    setOutput([])
    setResult(undefined)
    setError(null)
    setStatus("idle")
    setElapsedMs(null)
  }

  return { running, warming, status, elapsedMs, output, result, error, run, clear }
}
