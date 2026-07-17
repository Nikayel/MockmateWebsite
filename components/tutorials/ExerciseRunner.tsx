"use client"

import { useState } from "react"
import { CheckCircle2, Eye, FileCode2, Lightbulb, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { TestResultsPanel } from "@/components/interview/TestResultsPanel"
import { ColdStartNote } from "./ColdStartNote"
import { ExerciseBrief, type ExerciseBriefMeta } from "./ExerciseBrief"
import { ExerciseLayout } from "./ExerciseLayout"
import { HintList } from "./HintList"
import { ReadOnlyCodeBlock } from "./ReadOnlyCodeBlock"
import { useExerciseRun } from "./useExerciseRun"
import type { PythonExercise } from "@/lib/tutorials/types"
import { LessonNotice } from "./LessonNotice"

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
  /** Phase framing for the left brief (eyebrow + title + resurfaces chip). */
  brief?: ExerciseBriefMeta
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
  brief,
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
  const goal =
    hints.length > 0
      ? "Edit the code, then Run & check to grade it. Stuck? Tap Hint for a nudge."
      : "Edit the code, then Run & check to grade it against the tests."

  return (
    <ExerciseLayout
      aside={
        <ExerciseBrief
          eyebrow={brief?.eyebrow ?? "Apply"}
          title={brief?.title ?? "Your turn"}
          resurfaces={brief?.resurfaces}
          prompt={exercise.prompt}
          goal={goal}
        />
      }
    >
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5">
          <FileCode2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground font-mono text-xs">solution.py</span>
        </div>
        <CodeMirrorErrorBoundary>
          <CodeMirrorEditor
            value={code}
            onChange={onCodeChange}
            language="python"
            autoHeight
            minHeight={260}
            // Cap at ~22 lines (22px line-height + 16px content padding), then scroll internally.
            maxHeight={500}
          />
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
        <Button
          variant="ghost"
          onClick={() => onCodeChange(exercise.starterCode)}
          disabled={code === exercise.starterCode}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {passed && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            All tests passed
          </span>
        )}
      </div>

      <HintList hints={hints.slice(0, hintsShown)} total={hints.length} />

      {(emptyWarning || runError) && (
        <LessonNotice>
          {emptyWarning ? "Write your solution first, then run it." : runError}
        </LessonNotice>
      )}

      {showReference && exercise.referenceSolution && (
        <ReadOnlyCodeBlock
          code={exercise.referenceSolution}
          language="python"
          label="Reference solution"
        />
      )}

      <TestResultsPanel results={results} isRunning={running} />
    </ExerciseLayout>
  )
}
