export type RoadmapUpgradeReason = "pro_required" | "free_roadmap_used"

/** Only entitlement refusals may show an upsell, never auth or service failures. */
export function roadmapUpgradeReason(code: unknown): RoadmapUpgradeReason | null {
  if (code === "PRO_REQUIRED") return "pro_required"
  if (code === "FREE_ROADMAP_ALREADY_USED") return "free_roadmap_used"
  return null
}
