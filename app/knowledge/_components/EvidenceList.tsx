"use client"

import { Loader2 } from "lucide-react"

/**
 * "These attempts produced this belief" — the review log behind one card.
 *
 * A real table rather than the wrapping spans this used to be. The columns are
 * comparable down the page, which is the whole reason to show a history, and the
 * most credible datum on the page — what the model predicted versus what actually
 * happened — is a column instead of a fragment at the end of a wrapped line.
 *
 * Ordered oldest to newest to match the score track in the row above it. The two ran
 * in opposite directions before, on the same card.
 */

export interface EvidenceRowView {
  event_id: string
  timestamp: string
  mastery_score: number | null
  score: number | null
  hints_used: number | null
  is_first_review: boolean
  predicted_retention: number | null
  actual_retention: boolean | null
  retention_as_predicted: boolean | null
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

/**
 * How often the model's prediction matched the outcome, over the rows we have.
 * Returns null when no row recorded both, so the headline is never invented.
 */
export function calibrationOf(rows: EvidenceRowView[]): { hits: number; total: number } | null {
  const judged = rows.filter((r) => r.retention_as_predicted !== null)
  if (judged.length === 0) return null
  return { hits: judged.filter((r) => r.retention_as_predicted).length, total: judged.length }
}

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

  // The API returns newest-first. Flip to oldest-first so time runs the same way here
  // as in the score track directly above; the two used to disagree on one card.
  const ordered = [...rows].reverse()
  const calibration = calibrationOf(rows)

  return (
    <div className="border-border mt-2 rounded-lg border p-3">
      {calibration && (
        <p className="text-foreground mb-2 text-xs font-medium">
          {/*
            The most persuasive sentence available on this page, and it was derivable
            from data already loaded. A model that publishes its own hit rate is a
            different kind of artifact from one that publishes a confident number.
          */}
          The model called {calibration.hits} of your last {calibration.total} review
          {calibration.total === 1 ? "" : "s"} correctly.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">
            Review history for this problem, oldest first: score, what the model predicted, what
            happened, and how the review interval moved.
          </caption>
          <thead>
            <tr className="text-muted-foreground text-left">
              <th scope="col" className="pr-3 pb-1 font-medium">
                Date
              </th>
              <th scope="col" className="pr-3 pb-1 font-medium">
                Score
              </th>
              <th scope="col" className="pr-3 pb-1 font-medium">
                Predicted
              </th>
              <th scope="col" className="pr-3 pb-1 font-medium">
                Outcome
              </th>
              <th scope="col" className="pb-1 font-medium">
                Interval
              </th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {ordered.map((row) => {
              // Nullish-coalesce, never `|| 0`: a legitimate score of 0 and a review we
              // have no score for are different claims, and `?? 0` rendered the second
              // as the first — inventing a failing grade.
              const score = row.mastery_score ?? row.score
              return (
                <tr key={row.event_id} className="border-border/60 border-t">
                  <td className="text-foreground/80 py-1 pr-3 whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">
                    {score === null ? "—" : Math.round(score)}
                    {row.hints_used ? (
                      <span className="opacity-70">
                        {" "}
                        ({row.hints_used} hint{row.hints_used === 1 ? "" : "s"})
                      </span>
                    ) : null}
                    {row.is_first_review ? <span className="opacity-70"> first</span> : null}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">
                    {row.predicted_retention === null
                      ? "—"
                      : `${Math.round(row.predicted_retention)}%`}
                  </td>
                  <td className="py-1 pr-3 whitespace-nowrap">
                    {row.actual_retention === null ? (
                      "—"
                    ) : (
                      <span
                        className={
                          row.retention_as_predicted === false
                            ? "text-amber-700 dark:text-amber-400"
                            : undefined
                        }
                      >
                        {row.actual_retention ? "recalled" : "forgot"}
                        {/* Flag the misses: a model that hides them is not open. */}
                        {row.retention_as_predicted === false ? " (missed)" : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-1 whitespace-nowrap tabular-nums">
                    {row.interval_before_days === null || row.interval_after_days === null
                      ? "—"
                      : `${row.interval_before_days}d → ${row.interval_after_days}d`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
