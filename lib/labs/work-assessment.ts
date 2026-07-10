/**
 * Pure assessment of how much real work a Case Lab run contains (PF-03).
 *
 * A run could previously be marked `completed` with every station blank: click
 * Next five times, then Complete. That runs feedback over 0/0 and records a
 * mastery signal from nothing. This helper lets the Review station nudge (not
 * hard-block — P1 keeps the flow open) before finishing an empty run.
 */

import type { CaseLabAnswers, MilestoneKind } from "./types"

/** The four content-bearing milestones (Review is the closing station itself). */
const CONTENT_MILESTONES = ["clarify", "decompose", "design", "build"] as const
type ContentMilestone = (typeof CONTENT_MILESTONES)[number]

export interface CaseLabWorkAssessment {
  /** Whether each content milestone has meaningful (non-blank) work. */
  filled: Record<ContentMilestone, boolean>
  /** Content milestones with no meaningful work, for the nudge copy + analytics. */
  emptyMilestones: MilestoneKind[]
  /** Whether the Build station ran any tests at all. */
  buildRan: boolean
  /** Count of content milestones with real work (0-4). */
  filledCount: number
  /**
   * Whether the run has enough real work to complete without a nudge: the
   * candidate ran Build tests, or filled at least two content milestones.
   */
  isSubstantive: boolean
}

export function assessCaseLabWork(answers: CaseLabAnswers | undefined): CaseLabWorkAssessment {
  const a = answers ?? {}

  const clarify = (a.clarify ?? []).some((c) => Boolean(c.question?.trim() || c.assumption?.trim()))
  const decompose = Boolean(
    (a.decompose?.workflow ?? []).some((s) => s.trim()) ||
    (a.decompose?.entities ?? []).some((e) => e.name?.trim())
  )
  const design = Boolean(
    a.design?.api?.name?.trim() || (a.design?.tradeoffs ?? []).some((t) => t.decision?.trim())
  )
  const buildRan = (a.build?.testResults?.length ?? 0) > 0

  const filled: Record<ContentMilestone, boolean> = { clarify, decompose, design, build: buildRan }
  const emptyMilestones = CONTENT_MILESTONES.filter((m) => !filled[m])
  const filledCount = CONTENT_MILESTONES.filter((m) => filled[m]).length
  const isSubstantive = buildRan || filledCount >= 2

  return { filled, emptyMilestones, buildRan, filledCount, isSubstantive }
}
