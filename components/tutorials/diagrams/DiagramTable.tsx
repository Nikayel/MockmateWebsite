import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { formatCell } from "@/lib/tutorials/diagrams/format"
import type { TableSpec } from "@/lib/tutorials/diagrams/schema"

/**
 * A polished static table with column emphasis (static). For authored example tables
 * where a GFM table can't call out the column that matters — e.g. the aggregated
 * column a GROUP BY produces. Numbers right-align (tabular-nums); NULLs read as NULL.
 */
export function DiagramTable({ spec }: { spec: TableSpec }) {
  const hot = new Set(spec.highlightCols ?? [])

  return (
    <DiagramFrame label="Table" caption={spec.caption} bodyClassName="p-0">
      <table className="w-full border-collapse text-left font-mono text-xs">
        <caption className="sr-only">{spec.caption ?? "Data table"}</caption>
        <thead>
          <tr>
            {spec.columns.map((col, i) => (
              <th
                key={`${col}-${i}`}
                scope="col"
                className={cn(
                  "border-border border-b px-3 py-1.5 font-semibold whitespace-nowrap",
                  hot.has(col) ? "bg-accent/10 text-accent" : "bg-muted/40 text-muted-foreground"
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((row, r) => (
            <tr key={r} className="odd:bg-muted/20">
              {spec.columns.map((col, c) => {
                const v = row[c] ?? null
                return (
                  <td
                    key={c}
                    className={cn(
                      "border-border/60 border-b px-3 py-1.5 align-top",
                      hot.has(col) && "bg-accent/5 text-foreground font-medium",
                      typeof v === "number" && "text-right tabular-nums",
                      v === null && "text-muted-foreground/60 italic"
                    )}
                  >
                    {formatCell(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </DiagramFrame>
  )
}
