import { describe, expect, expectTypeOf, it } from "vitest"
import { filterScenarios, getScenarioById, scenarios } from "@/lib/scenarios"
import {
  BUGFIX_COMPANY_PROFILES,
  getBugfixCompanies,
  type BugfixCompanyAlignment,
} from "../company-alignment"
import { defineBugfixScenario, type BugfixScenarioDefinition } from "../define-bugfix-scenario"
import { packToScenario } from "@/lib/bugfix/packs/scenario"
import { bugfixPacks } from "../real-world/bugfix/packs"

describe("reviewed debugging company alignment", () => {
  it("defaults new questions and packs to Generic without inferring a company from their names", () => {
    const fixture = getScenarioById("bugfix-billing-webhook-idempotency")!
    if (fixture.type !== "bugfix") throw new Error("Expected debugging fixture")
    const { companies: _companies, companyAlignment: _alignment, ...definition } = fixture
    const authored = defineBugfixScenario(definition)
    expect(authored.companyAlignment).toBe("generic")
    expect(authored.companies).toEqual(["Generic"])
    const { companyAlignment: _packAlignment, ...pack } = bugfixPacks.find(
      (p) => p.id === "stripe-ledger-double-post"
    )!
    expect(packToScenario(pack).companies).toEqual(["Generic"])
  })

  it("does not allow arbitrary company strings or independent company tags at the authoring boundary", () => {
    expectTypeOf<"Gooogle">().not.toExtend<BugfixCompanyAlignment>()
    expectTypeOf<{ companies: ["Google"] }>().not.toExtend<
      Pick<BugfixScenarioDefinition, "companies">
    >()
  })

  it("keeps every published debugging question's filter tags consistent with its profile", () => {
    for (const scenario of scenarios.filter((s) => s.type === "bugfix")) {
      expect(scenario.companies, scenario.id).toEqual(getBugfixCompanies(scenario.companyAlignment))
      if (scenario.companyAlignment !== "generic") {
        const profile = BUGFIX_COMPANY_PROFILES[scenario.companyAlignment]
        expect(profile.source.url).toMatch(/^https:\/\//)
        expect(profile.description).not.toMatch(/exact interview question|official question/)
      }
    }
  })

  it("filters company practice using actual alignment rather than the payment or monitoring domain", () => {
    const google = filterScenarios({ type: ["bugfix"], companies: ["Google"] }).map((s) => s.id)
    expect(google).toContain("bugfix-bookclub-reading-streak-workspace")
    expect(google).toContain("generic-cache-eviction-mutation")
    expect(google).not.toContain("bugfix-onboarding")
    const stripe = filterScenarios({ type: ["bugfix"], companies: ["Stripe"] }).map((s) => s.id)
    expect(stripe).toContain("bugfix-http-client-library")
    expect(stripe).not.toContain("stripe-ledger-double-post")
    expect(stripe).not.toContain("bugfix-billing-webhook-idempotency")
    expect(filterScenarios({ type: ["bugfix"], companies: ["Meta"] }).map((s) => s.id)).toContain(
      "bugfix-maze-navigation"
    )
  })
})
