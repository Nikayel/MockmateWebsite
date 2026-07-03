"use client"

import type { SqlResultSet } from "@/lib/tutorials/types"

/**
 * Renders a SQL result set (`{ columns, rows }`) as a table — the additive results view for
 * single-query lessons, where a SELECT returns a grid rather than a scalar. An **empty result**
 * (`rows: []`) is a first-class outcome (anti-joins, DQ checks), so it renders a real "0 rows"
 * state, never "no output". Wide grids scroll inside their own container so the page never does.
 */
export function SqlResultGrid({
  result,
  label,
  tone = "neutral",
}: {
  result: SqlResultSet | null | undefined
  label?: string
  /** "actual" tints the header when this is the learner's returned set; "expected" for the target. */
  tone?: "neutral" | "actual" | "expected"
}) {
  // Defensive: a non-result-set value (e.g. an error sentinel) must render the empty state, never throw.
  if (!result || !Array.isArray(result.columns) || result.columns.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
        {label ? `${label}: ` : ""}No result set.
      </div>
    )
  }

  const headerTone =
    tone === "expected"
      ? "bg-accent/10 text-accent"
      : tone === "actual"
        ? "bg-muted/60 text-foreground"
        : "bg-muted/40 text-muted-foreground"

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      {label && (
        <div className="border-border text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
          {label}
        </div>
      )}
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={label ? `${label} result table` : "Result table"}
      >
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead>
            <tr>
              {result.columns.map((col, i) => (
                <th
                  key={`${col}-${i}`}
                  scope="col"
                  className={`${headerTone} border-border border-b px-3 py-1.5 font-semibold whitespace-nowrap`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length}
                  className="text-muted-foreground px-3 py-2 text-center italic"
                >
                  0 rows
                </td>
              </tr>
            ) : (
              result.rows.map((row, r) => (
                <tr key={r} className="odd:bg-muted/20">
                  {result.columns.map((_, c) => (
                    <td key={c} className="border-border/60 border-b px-3 py-1.5 whitespace-nowrap">
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL"
  return String(value)
}
