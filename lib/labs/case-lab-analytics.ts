/**
 * Case Lab analytics events. Thin typed wrappers over the shared `trackEvent`
 * client so call sites stay declarative and event names stay consistent.
 */

import { trackEvent } from "@/lib/analytics"
import type { CaseLabMode, MilestoneKind } from "@/lib/labs/types"

/**
 * The `/labs` browse list was rendered. Paired with {@link trackCaseLabViewed} and
 * {@link trackCaseLabStarted} this closes the lab funnel: list view -> detail view -> start. Two of
 * those three steps had no event at all, so the only visible number was how many runs began, with no
 * denominator to read it against.
 */
export function trackCaseLabListViewed(params: { labCount: number }): void {
  trackEvent("case_lab_list_viewed", params)
}

/** A lab's detail page was opened (the intro screen, before any run starts). */
export function trackCaseLabViewed(params: { labId: string; company: string }): void {
  trackEvent("case_lab_viewed", params)
}

export function trackCaseLabStarted(params: {
  labId: string
  company: string
  mode: CaseLabMode
}): void {
  trackEvent("case_lab_started", params)
}

export function trackCaseLabMilestoneCompleted(params: {
  labId: string
  milestone: MilestoneKind
}): void {
  trackEvent("case_lab_milestone_completed", params)
}

export function trackCaseLabCompleted(params: { labId: string; company: string }): void {
  trackEvent("case_lab_completed", params)
}

/**
 * Fired when a candidate is nudged for completing with little/no work (PF-03):
 * lets us see how often runs are finished empty (which corrupts the mastery
 * signal) without hard-blocking the open flow (P1).
 */
export function trackCaseLabSkippedCompletion(params: {
  labId: string
  company: string
  emptyMilestones: MilestoneKind[]
}): void {
  trackEvent("case_lab_skipped_completion", {
    labId: params.labId,
    company: params.company,
    emptyMilestones: params.emptyMilestones.join(","),
    emptyCount: params.emptyMilestones.length,
  })
}
