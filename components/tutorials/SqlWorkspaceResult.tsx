"use client"

import { useEffect, useState } from "react"
import { Table2 } from "lucide-react"
import {
  DEFAULT_PREVIEW_LIMIT,
  previewSqlWorkspace,
  type SqlTablePreview,
} from "@/lib/workspace-execution"
import { SqlResultGrid } from "./SqlResultGrid"
import { LessonNotice } from "./LessonNotice"

type Status = "idle" | "loading" | "ready" | "error"

export interface SqlWorkspaceResultProps {
  /** The seed DB the script runs on top of (empty for schema-building lessons). */
  seedSql?: string
  /** The exact script submitted for the latest run — the content this preview re-executes. */
  script: string
  /** Increments on each graded Run; a change triggers a fresh preview. 0 means "not run yet". */
  runNonce: number
  /** Sample rows shown per table (default {@link DEFAULT_PREVIEW_LIMIT}). */
  limit?: number
}

/**
 * After a learner runs an L3/L4 SQL workspace script, this shows the RESULTING tables — the actual
 * database their script produced — so an abstract pass/fail becomes concrete ("exactly one order
 * landed" is visible as a one-row `orders` table). It re-runs the same seed + script the grader ran,
 * in a display-only pass with no assertions, entirely in the client-side sql.js worker (no network,
 * no quota). A SQL error inside the script still shows the tables built before it, plus the error.
 * Renders nothing until the first run.
 */
export function SqlWorkspaceResult({
  seedSql,
  script,
  runNonce,
  limit = DEFAULT_PREVIEW_LIMIT,
}: SqlWorkspaceResultProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [tables, setTables] = useState<SqlTablePreview[]>([])
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (runNonce <= 0 || !script.trim()) return
    let cancelled = false
    setStatus("loading")
    previewSqlWorkspace(seedSql, script, limit)
      .then((res) => {
        if (cancelled) return
        if (res.success) {
          setTables(res.tables)
          setScriptError(res.scriptError ?? null)
          setError(null)
          setStatus("ready")
        } else {
          setError(res.error ?? "Couldn't read your resulting tables.")
          setStatus("error")
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Couldn't read your resulting tables.")
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [runNonce, seedSql, script, limit])

  // Before the first run there is nothing to show; the input "Data" panel covers pre-run state.
  if (status === "idle") return null

  const meta =
    status === "loading"
      ? "running…"
      : status === "error"
        ? "unavailable"
        : `${tables.length} ${tables.length === 1 ? "table" : "tables"}`

  return (
    <section className="border-border bg-muted/20 rounded-xl border" aria-label="Resulting tables">
      <div className="flex items-center gap-2 px-3 py-2">
        <Table2 className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-foreground text-sm font-medium">Resulting tables</span>
        <span className="text-muted-foreground text-xs">{meta}</span>
      </div>

      <div className="flex flex-col gap-4 px-3 pb-3">
        {status === "loading" && (
          <p className="text-muted-foreground text-sm">Reading the tables your script built…</p>
        )}

        {status === "error" && (
          <p className="text-muted-foreground text-sm">
            {error ?? "Couldn't read your resulting tables."}
          </p>
        )}

        {status === "ready" && (
          <>
            {scriptError && (
              <LessonNotice className="p-2.5 text-xs">
                Your script stopped at a SQL error: {scriptError}. The tables below reflect the
                state up to that point.
              </LessonNotice>
            )}

            {tables.length === 0 && !scriptError && (
              <p className="text-muted-foreground text-sm">Your script created no tables.</p>
            )}

            {tables.map((table) => (
              <div key={table.name} className="flex flex-col gap-1.5">
                <SqlResultGrid result={table.result} label={table.name} tone="actual" />
                {table.totalRows > table.result.rows.length && (
                  <p className="text-muted-foreground text-xs">
                    Showing {table.result.rows.length} of {table.totalRows} rows
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
