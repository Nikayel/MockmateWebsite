"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { segmentTeachMarkdown, teachSegmentStorageKey } from "@/lib/tutorials/teach-segments"
import { usePersistentState } from "./usePersistentState"
import { isSqlRuntimeWarm, runSqlInWorker } from "@/lib/workspace-execution"
import { ColdStartNote } from "./ColdStartNote"
import { ReadOnlyCodeBlock } from "./ReadOnlyCodeBlock"
import { PythonDemoRunner } from "./PythonDemoRunner"
import { SqlDataPreview } from "./SqlDataPreview"
import { SqlResultGrid } from "./SqlResultGrid"
import { isSqlResultSet, type SqlResultSet, type TeachSection } from "@/lib/tutorials/types"

/**
 * The "Read" phase: self-contained teaching markdown plus an optional worked example. For SQL
 * lessons that carry a `demoSeedSql`, the example query is EXECUTED live (client-side sql.js, no
 * grading, no network) so the learner sees its output table — and, when `showDemoInput` is set, the
 * input tables it runs against, before being asked to write their own. Python teach demos are an
 * EDITABLE, runnable scratchpad (`PythonDemoRunner`): same in-browser Pyodide the graded exercises
 * use, but ungraded, so a learner can change a value and watch what happens. Ends with the hand-off
 * to the "Apply" phase.
 */
export interface TeachPanelProps {
  teach: TeachSection
  onContinue: () => void
  continueLabel?: string
  /** Syntax-highlighting language for the demo block. Defaults to "python" (Python call sites unchanged). */
  demoLanguage?: string
  /**
   * Opt in to progressive disclosure, the same pacing the System Design player uses.
   * When set, a teach over ~500 words arrives as 2-4 segments revealed one Continue at
   * a time, with the position persisted per lesson. Omit it and the panel renders
   * exactly as before, so call sites that have not opted in are unaffected.
   */
  lessonId?: string
  /** A completed teach renders fully revealed: revisits must never re-gate. */
  teachCompleted?: boolean
}

type DemoStatus = "running" | "done" | "error"

export function TeachPanel({
  teach,
  onContinue,
  continueLabel = "I've got it — let me try",
  demoLanguage = "python",
  lessonId,
  teachCompleted = false,
}: TeachPanelProps) {
  const { demoCode, demoSeedSql, showDemoInput } = teach
  const canRunDemo = demoLanguage === "sql" && !!demoCode && !!demoSeedSql
  // Python demos become an editable scratchpad. Gated on `lessonId` because the runner
  // needs it to tag telemetry, and on the language so SQL keeps its own auto-run path.
  const isRunnablePythonDemo = demoLanguage === "python" && !!demoCode && !!lessonId

  // One segment unless the caller opted in AND the teach is long enough to warrant
  // pacing, so short lessons and non-opted-in callers keep the original single render.
  const segments = useMemo(
    () => (lessonId ? segmentTeachMarkdown(teach.markdown) : [teach.markdown]),
    [lessonId, teach.markdown]
  )

  const [revealedRaw, setRevealedRaw] = usePersistentState(
    teachSegmentStorageKey(lessonId ?? "unsegmented"),
    "1"
  )
  const storedRevealed = Number.parseInt(revealedRaw, 10)
  const revealed = teachCompleted
    ? segments.length
    : Math.min(Math.max(Number.isNaN(storedRevealed) ? 1 : storedRevealed, 1), segments.length)
  const allRevealed = revealed >= segments.length

  // Focus the newly revealed segment ONLY after a click, never on a hydration restore,
  // so keyboard users land on the fresh chunk without focus being stolen on page load.
  const [focusTarget, setFocusTarget] = useState<number | null>(null)
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([])
  useEffect(() => {
    if (focusTarget === null) return
    segmentRefs.current[focusTarget]?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const revealNext = () => {
    const next = Math.min(revealed + 1, segments.length)
    setRevealedRaw(String(next))
    setFocusTarget(next - 1)
  }

  const [status, setStatus] = useState<DemoStatus>("running")
  const [output, setOutput] = useState<SqlResultSet | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)
  const [warming, setWarming] = useState(false)

  useEffect(() => {
    if (!canRunDemo || !demoCode || !demoSeedSql) return
    let cancelled = false
    setStatus("running")
    setWarming(!isSqlRuntimeWarm())
    runSqlInWorker({ mode: "single-file", seedSql: demoSeedSql, code: demoCode })
      .then((res) => {
        if (cancelled) return
        setWarming(false)
        if (res.success && isSqlResultSet(res.result)) {
          setOutput(res.result)
          setStatus("done")
        } else {
          setDemoError(res.error ?? "Couldn't run this example.")
          setStatus("error")
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setWarming(false)
        setDemoError(err instanceof Error ? err.message : "Couldn't run this example.")
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [canRunDemo, demoCode, demoSeedSql])

  return (
    <div className="flex flex-col gap-5">
      {segments.slice(0, revealed).map((segment, i) => (
        <div
          key={i}
          ref={(el) => {
            segmentRefs.current[i] = el
          }}
          tabIndex={-1}
          className="prose prose-sm dark:prose-invert max-w-none outline-none"
        >
          <MarkdownRenderer content={segment} />
        </div>
      ))}

      {canRunDemo && allRevealed && showDemoInput && (
        <SqlDataPreview seedSql={demoSeedSql} title="Tables in this example" />
      )}

      {demoCode &&
        allRevealed &&
        (isRunnablePythonDemo ? (
          <PythonDemoRunner code={demoCode} lessonId={lessonId} />
        ) : (
          <ReadOnlyCodeBlock
            code={demoCode}
            language={demoLanguage}
            label={canRunDemo ? "Example query" : "Live example"}
          />
        ))}

      {canRunDemo && allRevealed && (
        <div className="flex flex-col gap-1.5">
          {status === "running" &&
            (warming ? (
              <ColdStartNote warming engine="sql" />
            ) : (
              <p className="text-muted-foreground text-xs">Running the example…</p>
            ))}
          {status === "error" && (
            <p className="text-muted-foreground text-sm">
              {demoError ?? "Couldn't run this example."}
            </p>
          )}
          {status === "done" && output && (
            <SqlResultGrid result={output} label="Output" tone="actual" />
          )}
        </div>
      )}

      {allRevealed ? (
        <div>
          <Button onClick={onContinue} className="gap-2">
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button onClick={revealNext} variant="outline" className="gap-2">
            Continue
            <ArrowDown className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-xs">
            Part {revealed} of {segments.length}
          </span>
        </div>
      )}
    </div>
  )
}
