"use client"

import { useState } from "react"
import { CheckCircle2, Database, Eye, Lightbulb, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { TestResultsPanel } from "@/components/interview/TestResultsPanel"
import { ColdStartNote } from "./ColdStartNote"
import { ExerciseBrief, type ExerciseBriefMeta } from "./ExerciseBrief"
import { ExerciseLayout } from "./ExerciseLayout"
import { HintList } from "./HintList"
import { ReadOnlyCodeBlock } from "./ReadOnlyCodeBlock"
import { SqlDataPreview } from "./SqlDataPreview"
import { SqlResultGrid } from "./SqlResultGrid"
import { useExerciseRun } from "./useExerciseRun"
import { isSqlResultSet, type SqlExercise } from "@/lib/tutorials/types"
import { LessonNotice } from "./LessonNotice"

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
  /** Fires when the learner reveals a hint (1-based index, total available). Drives Sable. */
  onHintReveal?: (index: number, total: number) => void
  /** Fires when the gated reference solution is revealed. Drives Sable. */
  onReferenceReveal?: () => void
  /** Guided steps (apply) reveal the reference after a few attempts; challenges (practice) never do. */
  canRevealReference?: boolean
  revealReferenceAfter?: number
  /** Phase framing for the left brief (eyebrow + title + resurfaces chip). */
  brief?: ExerciseBriefMeta
}

export function SqlExerciseRunner({
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
  const actualSet = isSqlResultSet(graded?.actual) ? graded.actual : undefined
  const expectedSet = isSqlResultSet(graded?.expected) ? graded.expected : undefined
  // Show the target result only while the learner hasn't matched it yet.
  const showExpected = Boolean(!passed && graded && expectedSet)
  const goal =
    hints.length > 0
      ? "Write your query, then Run it. Stuck? Tap Hint or check the data panel."
      : "Write your query, then Run it. Your result is checked against the expected one."

  return (
    <ExerciseLayout
      aside={
        <ExerciseBrief
          eyebrow={brief?.eyebrow ?? "Apply"}
          title={brief?.title ?? "Your turn"}
          resurfaces={brief?.resurfaces}
          prompt={exercise.prompt}
          goal={goal}
          // The tables this query runs against — the learner can't transform data they can't see.
          // Apply opens the panel; Practice starts it collapsed to keep the brief compact.
          data={
            <SqlDataPreview
              seedSql={exercise.singleFile?.seedSql}
              title="Schema & data"
              defaultOpen={!brief?.resurfaces}
            />
          }
        />
      }
    >
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5">
          <Database className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground font-mono text-xs">query.sql</span>
        </div>
        <CodeMirrorErrorBoundary>
          <CodeMirrorEditor
            value={code}
            onChange={onCodeChange}
            language="sql"
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
          {warming ? "Starting SQL engine…" : running ? "Running…" : "Run query"}
        </Button>
        <ColdStartNote warming={warming} engine="sql" />
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
            Result matches
          </span>
        )}
      </div>

      <HintList hints={hints.slice(0, hintsShown)} total={hints.length} />

      {(emptyWarning || runError) && (
        <LessonNotice>
          {emptyWarning ? "Write your query first, then run it." : runError}
        </LessonNotice>
      )}

      {(actualSet || showExpected) && (
        <div className="@container">
          <div
            className={
              actualSet && showExpected
                ? "grid gap-3 @min-[520px]:grid-cols-2"
                : "flex flex-col gap-3"
            }
          >
            {actualSet && <SqlResultGrid result={actualSet} label="Your result" tone="actual" />}
            {showExpected && (
              <SqlResultGrid result={expectedSet} label="Expected result" tone="expected" />
            )}
          </div>
        </div>
      )}

      {showReference && exercise.referenceSolution && (
        <ReadOnlyCodeBlock
          code={exercise.referenceSolution}
          language="sql"
          label="Reference solution"
        />
      )}

      <TestResultsPanel results={results} isRunning={running} />
    </ExerciseLayout>
  )
}
