import { trackEvent } from "@/lib/analytics"
import type { RoadmapUpgradeReason } from "./upgrade-gate"

type RoadmapFlowStep =
  | "view"
  | "assessment_completed"
  | "generation_requested"
  | "generation_succeeded"
  | "generation_failed"
  | "paywall_viewed"
  | "upgrade_clicked"

// No assessment answers, dates, code, or API error messages enter analytics.
export function trackRoadmapFlow(step: RoadmapFlowStep, reason?: RoadmapUpgradeReason): void {
  trackEvent("roadmap_flow", { step, ...(reason ? { gate_reason: reason } : {}) })
}
