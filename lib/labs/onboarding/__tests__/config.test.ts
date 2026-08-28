import { describe, expect, it } from "vitest"

import { findSystemMapBeat, type OnboardingConfig } from "@/lib/labs/onboarding/config"

const withMap: OnboardingConfig = {
  id: "x",
  company: "X",
  beats: [
    { kind: "offer", chapter: "Offer", lines: ["a"] },
    {
      kind: "system-map",
      chapter: "System",
      heading: "h",
      modules: [{ id: "m", label: "m", role: "r", path: "p" }],
    },
    { kind: "handoff", chapter: "Start", heading: "h", body: "b", ctaLabel: "Go" },
  ],
}

const withoutMap: OnboardingConfig = {
  id: "y",
  company: "Y",
  beats: [
    { kind: "offer", chapter: "Offer", lines: ["a"] },
    { kind: "handoff", chapter: "Start", heading: "h", body: "b", ctaLabel: "Go" },
  ],
}

describe("findSystemMapBeat", () => {
  it("returns the system-map beat when the config has one", () => {
    const beat = findSystemMapBeat(withMap)
    expect(beat?.kind).toBe("system-map")
    expect(beat?.modules).toHaveLength(1)
  })

  it("returns null when the config has no map (e.g. a decomposition lab)", () => {
    expect(findSystemMapBeat(withoutMap)).toBeNull()
  })
})
