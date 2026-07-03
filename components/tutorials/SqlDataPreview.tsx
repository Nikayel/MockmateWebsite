"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Database } from "lucide-react"
import {
  DEFAULT_PREVIEW_LIMIT,
  introspectSqlSeed,
  isSqlRuntimeWarm,
  type SqlTablePreview,
} from "@/lib/workspace-execution"
import { ColdStartNote } from "./ColdStartNote"
import { SqlResultGrid } from "./SqlResultGrid"

type Status = "loading" | "ready" | "error"

export interface SqlDataPreviewProps {
  /** The exercise/demo seed whose tables to preview. When empty or table-less, nothing renders. */
  seedSql: string | undefined
  /** Sample rows shown per table (default {@link DEFAULT_PREVIEW_LIMIT}). */
  limit?: number
  /** Panel heading. */
  title?: string
  /** Whether the panel starts expanded (Apply expands; Practice can collapse). */
  defaultOpen?: boolean
}

/**
 * A collapsible "Data" panel that renders the tables a SQL exercise/demo runs against — column
 * headers plus a few sample rows per table — so the learner can always see the shape of the data
 * before writing a query. Introspection runs entirely in the client-side sql.js worker against the
 * seed alone (no learner code, no network, no quota); the engine is already prewarmed on lesson
 * mount. Renders nothing when there is no seed or the seed defines no tables.
 */
export function SqlDataPreview({
  seedSql,
  limit = DEFAULT_PREVIEW_LIMIT,
  title = "Data",
  defaultOpen = true,
}: SqlDataPreviewProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [status, setStatus] = useState<Status>("loading")
  const [tables, setTables] = useState<SqlTablePreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [warming, setWarming] = useState(false)

  useEffect(() => {
    if (!seedSql || !seedSql.trim()) {
      setStatus("ready")
      setTables([])
      return
    }
    let cancelled = false
    setStatus("loading")
    setWarming(!isSqlRuntimeWarm())
    introspectSqlSeed(seedSql, limit)
      .then((res) => {
        if (cancelled) return
        setWarming(false)
        if (res.success) {
          setTables(res.tables)
          setStatus("ready")
        } else {
          setError(res.error ?? "Sample data is unavailable right now.")
          setStatus("error")
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setWarming(false)
        setError(err instanceof Error ? err.message : "Sample data is unavailable right now.")
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [seedSql, limit])

  // No seed, or a seed with no tables (e.g. a scalar demo): render nothing rather than an empty shell.
  if (!seedSql || !seedSql.trim()) return null
  if (status === "ready" && tables.length === 0) return null

  const count = tables.length
  const meta =
    status === "ready"
      ? `${count} ${count === 1 ? "table" : "tables"}`
      : status === "error"
        ? "unavailable"
        : "loading…"

  return (
    <section className="border-border bg-muted/20 rounded-xl border" aria-label="Sample data">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-visible:ring-accent/50 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <Database className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-foreground text-sm font-medium">{title}</span>
        <span className="text-muted-foreground text-xs">{meta}</span>
        <ChevronDown
          className={[
            "text-muted-foreground ml-auto h-4 w-4 shrink-0 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 px-3 pt-1 pb-3">
          {status === "loading" &&
            (warming ? (
              <ColdStartNote warming engine="sql" />
            ) : (
              <p className="text-muted-foreground text-sm">Loading sample data…</p>
            ))}

          {status === "error" && (
            <p className="text-muted-foreground text-sm">
              {error ?? "Sample data is unavailable right now."}
            </p>
          )}

          {status === "ready" &&
            tables.map((table) => (
              <div key={table.name} className="flex flex-col gap-1.5">
                <SqlResultGrid result={table.result} label={table.name} tone="neutral" />
                {table.totalRows > table.result.rows.length && (
                  <p className="text-muted-foreground text-xs">
                    Showing {table.result.rows.length} of {table.totalRows} rows
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </section>
  )
}
