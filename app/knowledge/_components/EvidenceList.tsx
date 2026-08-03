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
 * Whether this row records a prediction the model actually made.
 *
 * First reviews do not, and the stored data does not say so. Both write paths pass
 * `predictedRetention: 0` for a first attempt (lib/learning-state.ts:679,
 * spaced-repetition/complete/route.ts:341), and research-tracker.ts:105 then derives
 * `retention_as_predicted = (0 >= 50) === actualRetention`. So a first attempt that
 * PASSED is stored as the model having been wrong, and one that FAILED is stored as
 * the model having been right — a fabricated verdict in both directions, on the row
 * every card has.
 *
 * Excluding them here is the honest read of the data we have; storing null at the
 * two write paths would be the durable fix, but it cannot repair existing rows, so
 * this filter is needed either way.
 */
function isScoredPrediction(row: EvidenceRowView): boolean {
  return !row.is_first_review && row.retention_as_predicted !== null
}

/**
 * How often the model's prediction matched the outcome, over the rows we have.
 * Returns null when no row recorded a real call, so the headline is never invented.
 */
export function calibrationOf(rows: EvidenceRowView[]): { hits: number; total: number } | null {
  const judged = rows.filter(isScoredPrediction)
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
    // An indent rail, not a third nested border: the panel already sits inside an
    // expanded row inside a bordered group container.
    <div className="border-border mt-2 border-l-2 pl-3 sm:pl-4">
      {/* Keyboard-scrollable region: a bare overflow-x-auto div cannot take focus in
          Safari/Firefox, so the wide table was mouse-only. tabIndex on a
          non-interactive element is exactly the W3C scrollable-region pattern here —
          role="region" + a label make it a legitimate stop, not a tab trap. */}
      <div
        className="focus-visible:ring-accent overflow-x-auto rounded focus-visible:ring-2 focus-visible:outline-none"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Review history"
      >
        <table className="w-full text-xs">
          {/*
            The calibration line is the page's money line — including when it is
            unflattering — and it is the table's own summary, so it IS the caption:
            visible, and announced with the table instead of orphaned above it.
          */}
          <caption className="text-foreground mb-2 text-left text-sm font-medium tabular-nums">
            {/*
              Names its own denominator. calibrationOf counts only rows carrying a
              real call, while the body renders every row, so the caption's total is
              smaller than the visible row count whenever a card has a first review
              (no prior belief to predict from) or a legacy event (written before
              retention_as_predicted existed). Both show "—" in Predicted and
              Outcome, so the excluded rows are already marked; saying "the N it made
              a call on" turns an unexplained mismatch into a stated fact.
            */}
            {calibration
              ? `The model called ${calibration.hits} of the ${calibration.total} review${
                  calibration.total === 1 ? "" : "s"
                } it made a call on correctly.`
              : null}
            {calibration && calibration.total < rows.length ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                The other {rows.length - calibration.total} had no prediction to score.
              </span>
            ) : null}
            <span className="sr-only">
              {" "}
              Review history, oldest first: score, prediction, outcome, interval.
            </span>
          </caption>
          <thead>
            <tr className="text-muted-foreground text-left">
              <th
                scope="col"
                className="pr-3 pb-1 text-[11px] font-medium tracking-wider uppercase"
              >
                Date
              </th>
              <th
                scope="col"
                className="pr-3 pb-1 text-[11px] font-medium tracking-wider uppercase"
              >
                Score
              </th>
              <th
                scope="col"
                className="pr-3 pb-1 text-[11px] font-medium tracking-wider uppercase"
              >
                Predicted
              </th>
              <th
                scope="col"
                className="pr-3 pb-1 text-[11px] font-medium tracking-wider uppercase"
              >
                Outcome
              </th>
              <th scope="col" className="pb-1 text-[11px] font-medium tracking-wider uppercase">
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
                  <td className="text-muted-foreground py-1 pr-3 whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">
                    {score === null ? "—" : Math.round(score)}
                    {/* No opacity fades here: opacity-70 on muted-foreground text
                        composited to ~2.9:1 — the exact fade the guard test forbids,
                        dodged via the opacity property. */}
                    {row.hints_used ? (
                      <span>
                        {" "}
                        ({row.hints_used} hint{row.hints_used === 1 ? "" : "s"})
                      </span>
                    ) : null}
                    {row.is_first_review ? <span> first</span> : null}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">
                    {/* Exact, not rounded-to-5: this column is a ledger of what the
                        model actually said going in; fuzzing the audit record would
                        undercut the calibration claim in the caption.

                        A first review is an em-dash, not the stored 0%: the write
                        path uses 0 as a placeholder for "no prior belief", and
                        printing it claims the model predicted certain failure. */}
                    {row.is_first_review || row.predicted_retention === null
                      ? "—"
                      : `${Math.round(row.predicted_retention)}%`}
                  </td>
                  <td className="py-1 pr-3 whitespace-nowrap">
                    {/* No verdict on a first review — there was no prediction to be
                        right or wrong about, whatever the stored flag says. */}
                    {row.is_first_review ? (
                      row.actual_retention === null ? (
                        "—"
                      ) : (
                        <span>{row.actual_retention ? "recalled" : "forgot"}</span>
                      )
                    ) : row.actual_retention === null ? (
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
