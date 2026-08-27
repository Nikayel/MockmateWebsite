"use client"

/**
 * SummaryView — screen 10's content (UX-SPEC.md §11).
 */

import { SparraLoader } from "@/components/brand/SparraLoader"
import { EscapedDefectCurve } from "./EscapedDefectCurve"
import { MasteryGrid } from "./MasteryGrid"
import { ShareArtifactCard } from "./ShareArtifactCard"
import type { WorkbookSummaryState } from "./useWorkbookSummaryData"

export interface SummaryViewProps {
  workbookTitle: string
  state: WorkbookSummaryState
}

const HEADING_CLASS = "text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
const SECTION_CLASS =
  "flex flex-col gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-5"

export function SummaryView({ workbookTitle, state }: SummaryViewProps) {
  if (state.phase === "loading") {
    return <SparraLoader label="Adding it up…" />
  }

  if (state.phase === "empty") {
    return (
      <div className={SECTION_CLASS}>
        <p className="text-sm text-[var(--wb-text)]">
          No graded attempts yet. Ship a ticket and this page fills in.
        </p>
      </div>
    )
  }

  const gradedPoints = state.escapedRatePoints.filter((p) => p.graded && p.rate !== null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-[var(--wb-text)]">
          {state.ticketsShipped} {state.ticketsShipped === 1 ? "ticket" : "tickets"} shipped this
          session. {state.pointsShipped} {state.pointsShipped === 1 ? "point" : "points"}.
        </p>
        <p className="text-xs text-[var(--wb-text-secondary)]">
          {state.gradedEscapedRatePercent === null
            ? "No graded attempts yet — assisted attempts are feedback only and don't feed this number."
            : `Escaped defect rate ${state.gradedEscapedRatePercent}% across graded attempts.`}
        </p>
      </div>

      <section aria-labelledby="summary-curve-heading" className={SECTION_CLASS}>
        <h2 id="summary-curve-heading" className={HEADING_CLASS}>
          Escaped defect rate
        </h2>
        {gradedPoints.length < 2 ? (
          <p className="text-sm text-[var(--wb-text-secondary)]">
            Two graded tickets are enough for a curve. You have {gradedPoints.length}.
          </p>
        ) : (
          <EscapedDefectCurve points={state.escapedRatePoints} />
        )}
        <p className="text-xs text-[var(--wb-faint)]">
          Graded line: unassisted and review only attempts. Dotted line: assisted attempts, feedback
          only.
        </p>
      </section>

      <section aria-labelledby="summary-mastery-heading" className={SECTION_CLASS}>
        <h2 id="summary-mastery-heading" className={HEADING_CLASS}>
          What you can do now
        </h2>
        <MasteryGrid objectives={state.objectives} />
      </section>

      <section aria-labelledby="summary-artifact-heading" className="flex flex-col gap-3">
        <h2 id="summary-artifact-heading" className={HEADING_CLASS}>
          Share
        </h2>
        <ShareArtifactCard
          workbookTitle={workbookTitle}
          ticketsShipped={state.ticketsShipped}
          pointsShipped={state.pointsShipped}
          gradedCount={state.gradedCount}
          assistedCount={state.assistedCount}
          unassistedGradedCount={state.unassistedGradedCount}
          reviewOnlyGradedCount={state.reviewOnlyGradedCount}
          gradedEscapedRatePercent={state.gradedEscapedRatePercent}
          scoredAt={state.scoredAt}
          modelId={state.modelId}
        />
      </section>
    </div>
  )
}
