"use client"

import { Loader2 } from "lucide-react"

export interface EvidenceRowView {
  event_id: string
  timestamp: string
  mastery_score: number | null
  score: number | null
  hints_used: number | null
  is_first_review: boolean
  predicted_retention: number | null
  actual_retention: boolean | null
  interval_before_days: number | null
  interval_after_days: number | null
  stability_before: number | null
  stability_after: number | null
}

interface EvidenceListProps {
  loading: boolean
  error: string | null
  rows: EvidenceRowView[]
}

/** "These attempts produced this belief" — one row per past review. */
export function EvidenceList({ loading, error, rows }: EvidenceListProps) {
  if (loading) {
    return (
      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading evidence…
      </div>
    )
  }
  if (error) {
    return (
      <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-400">
        {error}
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground mt-2 text-xs">
        No review log yet — the belief comes from this card&apos;s initial session.
      </p>
    )
  }

  return (
    <div className="border-border mt-2 rounded-lg border p-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium">
        These attempts produced this belief
      </p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.event_id} className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
            <span className="text-foreground/80 w-20 shrink-0">
              {new Date(row.timestamp).toLocaleDateString()}
            </span>
            <span>
              scored {Math.round(row.mastery_score ?? row.score ?? 0)}
              {row.hints_used ? `, ${row.hints_used} hint${row.hints_used === 1 ? "" : "s"}` : ""}
              {row.is_first_review ? " (first attempt)" : ""}
            </span>
            {row.interval_before_days !== null && row.interval_after_days !== null && (
              <span>
                interval {row.interval_before_days}d → {row.interval_after_days}d
              </span>
            )}
            {row.predicted_retention !== null && row.actual_retention !== null && (
              <span>
                predicted {Math.round(row.predicted_retention)}% recall ·{" "}
                {row.actual_retention ? "recalled" : "forgot"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
