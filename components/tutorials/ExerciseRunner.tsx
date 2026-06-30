"use client"

import { useState } from "react"
import { CheckCircle2, Eye, Lightbulb, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { TestResultsPanel } from "@/components/interview/TestResultsPanel"
import { ColdStartNote } from "./ColdStartNote"
import { useExerciseRun } from "./useExerciseRun"
import type { PythonExercise } from "@/lib/tutorials/types"

/**
 * Single-file exercise runner: one editor, keyed test cases, graded in-browser via
 * `useExerciseRun` (client-side Pyodide — no Piston/`/api/execute`). Handles the DoD states:
 * empty submission (friendly nudge, no run), Pyodide unavailable, user code errors / wrong
 * answers (shown by `TestResultsPanel`), and a gated reference reveal for the guided `apply` step.
 */
export interface ExerciseRunnerProps {
  exercise: PythonExercise
  code: string
  onCodeChange: (value: string) => void
  onPass?: () => void
  /** Fires after each graded run with its pass/fail (drives Sable). */
  onRunResult?: (passed: boolean) => void
  /** Fires when the learner reveals a hint (1-based index, total available). */
  onHintReveal?: (index: number, total: number) => void
  /** Fires when the gated reference solution is revealed. */
  onReferenceReveal?: () => void
  /** Guided steps (apply) reveal the reference after a few attempts; challenges (practice) never do. */
  canRevealReference?: boolean
  /** Failed attempts before the reference becomes revealable. */
  revealReferenceAfter?: number
}

export function ExerciseRunner({
  exercise,
  code,
  onCodeChange,
  onPass,
  onRunResult,
  onHintReveal,
  onReferenceReveal,
  canRevealReference = false,
  revealReferenceAfter = 2,
}: ExerciseRunnerProps) {
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
          {warming ? "Starting Python…" : running ? "Running…" : "Run & check"}
        </Button>
        <ColdStartNote warming={warming} />
        {hints.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              setHintsShown((n) => {
                const next = Math.min(n + 1, hints.length)
                if (next > n) onHintReveal?.(next, hints.length)
                return next
              })
            }
            disabled={hintsShown >= hints.length}
            className="gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            {hintsShown === 0 ? "Hint" : `Hint ${Math.min(hintsShown + 1, hints.length)}`}
          </Button>
        )}
        {canShowReference && !showReference && (
          <Button
            variant="ghost"
            onClick={() => {
              setShowReference(true)
              onReferenceReveal?.()
            }}
            className="gap-2"
          >
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

      {(emptyWarning || runError) && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
        >
          {emptyWarning ? "Write your solution first, then run it." : runError}
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
