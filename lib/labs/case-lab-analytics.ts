/**
 * Case Lab analytics events. Thin typed wrappers over the shared `trackEvent`
 * client so call sites stay declarative and event names stay consistent.
 */

import { trackEvent } from "@/lib/analytics"
import type { CaseLabMode, MilestoneKind } from "@/lib/labs/types"

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
