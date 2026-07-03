"use client"

import { useState } from "react"
import { CheckCircle2, Eye, Lightbulb, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { TestResultsPanel } from "@/components/interview/TestResultsPanel"
import { ColdStartNote } from "./ColdStartNote"
import { SqlResultGrid } from "./SqlResultGrid"
import { useExerciseRun } from "./useExerciseRun"
import type { SqlExercise, SqlResultSet } from "@/lib/tutorials/types"

/**
 * Single-query SQL runner (L1/L2): one SQL editor, graded in-browser via the SAME `useExerciseRun`
 * hook the Python runner uses (client-side sql.js — no Piston/`/api/execute`). It differs from the
 * Python `ExerciseRunner` only in the surface: the editor is in SQL mode, the cold-start copy names
 * the SQL engine, and a **result grid** shows the returned rows (a SELECT returns `{columns, rows}`,
 * not a scalar). Grading + gated-reference-reveal behavior is inherited unchanged.
 */
export interface SqlExerciseRunnerProps {
  exercise: SqlExercise
  code: string
  onCodeChange: (value: string) => void
  onPass?: () => void
  onRunResult?: (passed: boolean) => void
  /** Guided steps (apply) reveal the reference after a few attempts; challenges (practice) never do. */
  canRevealReference?: boolean
  revealReferenceAfter?: number
}

export function SqlExerciseRunner({
  exercise,
  code,
  onCodeChange,
  onPass,
  onRunResult,
  canRevealReference = false,
  revealReferenceAfter = 2,
}: SqlExerciseRunnerProps) {
  const { running, warming, results, runError, attempts, passed, run } = useExerciseRun(exercise, {
    onPass,
    onResult: onRunResult,
  })
  const [emptyWarning, setEmptyWarning] = useState(false)
  const [hintsShown, setHintsShown] = useState(0)
  const [showReference, setShowReference] = useState(false)

  const handleRun = () => {
    if (!code.trim()) {
      setEmptyWarning(true)
      return
    }
    setEmptyWarning(false)
    void run({ code })
  }

  const hints = exercise.hints ?? []
  const canShowReference =
    canRevealReference && Boolean(exercise.referenceSolution) && attempts >= revealReferenceAfter

  // The single graded row carries the returned + expected result sets (see the SQL single-file runner).
  // `actual` can be a non-result-set sentinel (the shared result mapper's "fail" string) on an errored
  // run, so guard: only a real { columns, rows } object reaches the grid — else a failing query would
  // throw in render and eject the learner to the error page instead of showing the failure.
  const graded = results[0]
  const isResultSet = (value: unknown): value is SqlResultSet =>
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { columns?: unknown }).columns)
  const actualSet = isResultSet(graded?.actual) ? graded.actual : undefined
  const expectedSet = isResultSet(graded?.expected) ? graded.expected : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={exercise.prompt} />
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <CodeMirrorErrorBoundary>
          <CodeMirrorEditor value={code} onChange={onCodeChange} language="sql" height={220} />
        </CodeMirrorErrorBoundary>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleRun} disabled={running} className="gap-2">
          <Play className="h-4 w-4" />
          {warming ? "Starting SQL engine…" : running ? "Running…" : "Run query"}
        </Button>
        <ColdStartNote warming={warming} engine="sql" />
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
            Result matches
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

      {(emptyWarning || runError) && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
        >
          {emptyWarning ? "Write your query first, then run it." : runError}
        </p>
      )}

      {actualSet && <SqlResultGrid result={actualSet} label="Your result" tone="actual" />}
      {!passed && graded && expectedSet && (
        <SqlResultGrid result={expectedSet} label="Expected result" tone="expected" />
      )}

      {showReference && exercise.referenceSolution && (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="border-border bg-muted/40 text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
            Reference solution
          </div>
          <CodeMirrorErrorBoundary>
            <CodeMirrorEditor
              value={exercise.referenceSolution}
              language="sql"
              height={160}
              readOnly
            />
          </CodeMirrorErrorBoundary>
        </div>
      )}

      <TestResultsPanel results={results} isRunning={running} />
    </div>
  )
}
