import { describe, expect, it } from "vitest"
import { roadmapUpgradeReason } from "../upgrade-gate"

describe("roadmap upgrade refusals", () => {
  it("recognizes both server entitlement responses", () => {
    expect(roadmapUpgradeReason("PRO_REQUIRED")).toBe("pro_required")
    expect(roadmapUpgradeReason("FREE_ROADMAP_ALREADY_USED")).toBe("free_roadmap_used")
  })

  it.each([
    "FREE_ROADMAP_IN_PROGRESS",
    "SUBSCRIPTION_INACTIVE",
    "RATE_LIMITED",
    "Unauthorized",
    null,
    {},
    403,
  ])("does not upsell operational/auth failures: %s", (code) =>
    expect(roadmapUpgradeReason(code)).toBeNull()
  )
})
