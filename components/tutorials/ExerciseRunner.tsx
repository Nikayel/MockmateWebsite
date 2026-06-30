"use client"

import { useState } from "react"
import { Lightbulb, Play, Eye, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { TestResultsPanel, type TestResult } from "@/components/interview/TestResultsPanel"
import { executeScenarioInBrowser } from "@/lib/workspace-execution"
import { getTutorialExerciseScenario } from "@/lib/tutorials/exercise-scenarios"
import type { PythonExercise } from "@/lib/tutorials/types"

/**
 * Runs a tutorial exercise entirely **client-side** (Pyodide via `executeScenarioInBrowser`) —
 * Piston / `/api/execute` is not used. Adapted from `components/labs/stations/BuildStation.tsx`,
 * but for the single-file lesson path: one editor, keyed test cases, graded in the browser.
 *
 * Handles the states the DoD calls out: empty submission (friendly nudge, no run), Pyodide
 * unavailable (try again), user code errors / wrong answers (shown as result rows by
 * `TestResultsPanel`), and a gated reference reveal for the guided `apply` step.
 */
export interface ExerciseRunnerProps {
  exercise: PythonExercise
  code: string
  onCodeChange: (value: string) => void
  /** Fired once when every test passes. */
  onPass?: () => void
  /** Guided steps (apply) reveal the reference after a few attempts; challenges (practice) never do. */
  canRevealReference?: boolean
  /** Failed attempts before the reference becomes revealable. */
  revealReferenceAfter?: number
}

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

/** Map a client-runner result row (single-file or workspace shape) to a `TestResultsPanel` row. */
function toTestResult(row: RawResultRow): TestResult {
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

export function ExerciseRunner({
  exercise,
  code,
  onCodeChange,
  onPass,
  canRevealReference = false,
  revealReferenceAfter = 2,
}: ExerciseRunnerProps) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [hintsShown, setHintsShown] = useState(0)
  const [showReference, setShowReference] = useState(false)
  const [passed, setPassed] = useState(false)

  const handleRun = async () => {
    if (!code.trim()) {
      setRunError("Write your solution first, then run it.")
      return
    }
    setRunning(true)
    setRunError(null)
    try {
      const scenario = getTutorialExerciseScenario(exercise.id)
      if (!scenario) {
        setRunError("This exercise could not be loaded. Please refresh and try again.")
        return
      }

      const result = await executeScenarioInBrowser({
        code,
        scenario,
        language: "python",
      })

      if (!result) {
        setRunError("Python isn't available in this browser right now. Please try again.")
        return
      }

      const rows = (result.results as RawResultRow[]) ?? []
      const mapped = rows.map(toTestResult)
      setResults(mapped)

      // A service/load failure with no graded rows: surface a retry message rather than a blank panel.
      if (mapped.length === 0) {
        setRunError(result.error ?? "No tests ran. Please try again.")
        return
      }

      const allPassed = result.success && mapped.every((r) => r.passed)
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
      setRunning(false)
    }
  }

  const hints = exercise.hints ?? []
  const canShowReference =
    canRevealReference && Boolean(exercise.referenceSolution) && attempts >= revealReferenceAfter

  return (
    <div className="flex flex-col gap-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={exercise.prompt} />
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <CodeMirrorErrorBoundary>
          <CodeMirrorEditor value={code} onChange={onCodeChange} language="python" height={280} />
        </CodeMirrorErrorBoundary>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleRun} disabled={running} className="gap-2">
          <Play className="h-4 w-4" />
          {running ? "Running…" : "Run & check"}
        </Button>
        {hints.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setHintsShown((n) => Math.min(n + 1, hints.length))}
            disabled={hintsShown >= hints.length}
            className="gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            {hintsShown === 0 ? "Hint" : `Hint ${Math.min(hintsShown + 1, hints.length)}`}
          </Button>
        )}
        {canShowReference && !showReference && (
          <Button variant="ghost" onClick={() => setShowReference(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Show solution
          </Button>
        )}
        {passed && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            All tests passed
          </span>
        )}
      </div>

      {hintsShown > 0 && (
        <ul className="border-border bg-muted/40 space-y-1.5 rounded-lg border p-3 text-sm">
          {hints.slice(0, hintsShown).map((hint, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}

      {runError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
        >
          {runError}
        </p>
      )}

      {showReference && exercise.referenceSolution && (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="border-border bg-muted/40 text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
            Reference solution
          </div>
          <CodeMirrorErrorBoundary>
            <CodeMirrorEditor
              value={exercise.referenceSolution}
              language="python"
              height={140}
              readOnly
            />
          </CodeMirrorErrorBoundary>
        </div>
      )}

      <TestResultsPanel results={results} isRunning={running} />
    </div>
  )
}
