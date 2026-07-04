"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { isSqlRuntimeWarm, runSqlInWorker, type SqlResultSet } from "@/lib/workspace-execution"
import { ColdStartNote } from "./ColdStartNote"
import { SqlDataPreview } from "./SqlDataPreview"
import { SqlResultGrid } from "./SqlResultGrid"
import type { TeachSection } from "@/lib/tutorials/types"

/**
 * The "Read" phase: self-contained teaching markdown plus an optional worked example. For SQL
 * lessons that carry a `demoSeedSql`, the example query is EXECUTED live (client-side sql.js, no
 * grading, no network) so the learner sees its output table — and, when `showDemoInput` is set, the
 * input tables it runs against — before being asked to write their own. Python teach demos stay
 * read-only/highlighted (nothing to run). Ends with the hand-off to the "Apply" phase.
 */
export interface TeachPanelProps {
  teach: TeachSection
  onContinue: () => void
  continueLabel?: string
  /** Syntax-highlighting language for the demo block. Defaults to "python" (Python call sites unchanged). */
  demoLanguage?: string
}

type DemoStatus = "running" | "done" | "error"

export function TeachPanel({
  teach,
  onContinue,
  continueLabel = "I've got it — let me try",
  demoLanguage = "python",
}: TeachPanelProps) {
  const { demoCode, demoSeedSql, showDemoInput } = teach
  const canRunDemo = demoLanguage === "sql" && !!demoCode && !!demoSeedSql

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
        if (res.success && isResultSet(res.result)) {
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
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={teach.markdown} />
      </div>

      {canRunDemo && showDemoInput && (
        <SqlDataPreview seedSql={demoSeedSql} title="Tables in this example" />
      )}

      {demoCode && (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="border-border bg-muted/40 text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
            {canRunDemo ? "Example query" : "Live example"}
          </div>
          <CodeMirrorErrorBoundary>
            <CodeMirrorEditor value={demoCode} language={demoLanguage} height={140} readOnly />
          </CodeMirrorErrorBoundary>
        </div>
      )}

      {canRunDemo && (
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

      <div>
        <Button onClick={onContinue} className="gap-2">
          {continueLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function isResultSet(value: unknown): value is SqlResultSet {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { columns?: unknown }).columns) &&
    Array.isArray((value as { rows?: unknown }).rows)
  )
}
