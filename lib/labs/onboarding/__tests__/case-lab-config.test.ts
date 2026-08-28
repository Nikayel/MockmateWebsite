import { describe, expect, it } from "vitest"

import { listCaseLabs } from "@/lib/labs/case-labs"
import { findSystemMapBeat } from "@/lib/labs/onboarding/config"
import { caseLabOnboardingConfig } from "@/lib/labs/onboarding/case-lab-config"

const labs = listCaseLabs()

describe("case-lab onboarding config", () => {
  it("derives a valid four-beat arc for every live lab", () => {
    expect(labs.length).toBeGreaterThan(0)
    for (const lab of labs) {
      const config = caseLabOnboardingConfig(lab)
      expect(config.id).toBe(`case-lab:${lab.id}`)
      expect(config.beats.map((b) => b.kind)).toEqual(["offer", "company", "pair", "handoff"])
    }
  })

  it("never gives a decomposition lab a system map", () => {
    for (const lab of labs) {
      expect(findSystemMapBeat(caseLabOnboardingConfig(lab))).toBeNull()
    }
  })

  it("names the company in title case and states the real problem", () => {
    for (const lab of labs) {
      const config = caseLabOnboardingConfig(lab)
      // Title-cased from the lowercase slug.
      expect(config.company[0]).toBe(config.company[0]?.toUpperCase())
      expect(config.company.toLowerCase()).toContain(lab.company.split(/[\s_-]+/)[0])

      const offer = config.beats[0]
      expect(offer.kind === "offer" && offer.lines.some((l) => l.includes(lab.title))).toBe(true)

      // The brief beat states the lab's own authored hook, not invented copy.
      const brief = config.beats[1]
      expect(brief.kind === "company" && brief.lines[0]).toBe(lab.hook)

      const handoff = config.beats.at(-1)
      expect(handoff?.kind).toBe("handoff")
      if (handoff?.kind === "handoff") expect(handoff.ctaLabel.length).toBeGreaterThan(0)
    }
  })
})
