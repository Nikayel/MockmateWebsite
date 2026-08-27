/**
 * ShareArtifactCard — the "shipped N sprints on Meridian" artifact (UX-SPEC.md
 * §1.8, §11). No `Copy link` action: per the binding ruling (R7 — no public
 * share route exists in v1), the card renders as a card only rather than
 * copying a URL that would 404 (UX-SPEC.md §11 Interactions says exactly
 * this: render without `Copy link` when no public route exists).
 *
 * Carries WORKBOOK-SPEC.md §5's metric-integrity stamp: the graded/assisted
 * split (rule 1) and the model id + score date (rule 4), both real values
 * this component is handed, never invented here.
 */

export interface ShareArtifactCardProps {
  workbookTitle: string
  ticketsShipped: number
  pointsShipped: number
  gradedCount: number
  assistedCount: number
  unassistedGradedCount: number
  reviewOnlyGradedCount: number
  /** 0..100, or null when there are zero graded attempts to average. */
  gradedEscapedRatePercent: number | null
  /** Most recent graded attempt's `submittedAt`, or null. */
  scoredAt: string | null
  /** `attempt.modelId`, honestly `null` when the attempt never recorded one. */
  modelId: string | null
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

export function ShareArtifactCard({
  workbookTitle,
  ticketsShipped,
  pointsShipped,
  gradedCount,
  assistedCount,
  unassistedGradedCount,
  reviewOnlyGradedCount,
  gradedEscapedRatePercent,
  scoredAt,
  modelId,
}: ShareArtifactCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-card)] p-5">
      <p className="text-sm font-semibold text-[var(--wb-text)]">
        Shipped {ticketsShipped} {ticketsShipped === 1 ? "ticket" : "tickets"} on {workbookTitle}
      </p>
      <p className="text-sm text-[var(--wb-text-secondary)]">
        {pointsShipped} {pointsShipped === 1 ? "point" : "points"}.{" "}
        {gradedEscapedRatePercent === null
          ? "No graded attempts yet."
          : `Escaped defect rate ${gradedEscapedRatePercent}% on ${gradedCount} uncontaminated ${
              gradedCount === 1 ? "attempt" : "attempts"
            }.`}
      </p>
      <p className="text-xs text-[var(--wb-faint)]">
        {scoredAt ? `Scored ${formatDate(scoredAt)}` : "Not yet scored"} - model{" "}
        {modelId ?? "not recorded"} - {unassistedGradedCount} unassisted, {reviewOnlyGradedCount}{" "}
        review only
        {assistedCount > 0 ? `, ${assistedCount} assisted (not graded)` : ""}
      </p>
    </div>
  )
}
