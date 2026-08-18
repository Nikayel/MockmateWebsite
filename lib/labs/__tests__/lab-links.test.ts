import { describe, it, expect } from "vitest"
import { SCENARIO_LAB_LINKS, getScenarioLabLink } from "../lab-links"
import { listCaseLabs } from "../case-labs"

/**
 * The links map is hand-written so scenario cards stay bundle-light; this
 * bijection against the live registry is what keeps it honest.
 */
describe("SCENARIO_LAB_LINKS bijection with the Case Lab registry", () => {
  const labs = listCaseLabs()

  it("covers every lab's build scenario with the exact lab id and title", () => {
    for (const lab of labs) {
      const link = SCENARIO_LAB_LINKS[lab.buildScenarioId]
      expect(link, `missing link for ${lab.buildScenarioId} (${lab.title})`).toBeDefined()
      expect(link.labId).toBe(lab.id)
      expect(link.labTitle).toBe(lab.title)
    }
  })

  it("invents no extra entries beyond the registry", () => {
    expect(Object.keys(SCENARIO_LAB_LINKS)).toHaveLength(labs.length)
  })

  it("resolves lookups and misses safely", () => {
    expect(getScenarioLabLink("palantir-911-dispatch-build")?.labId).toBe("palantir-911-dispatch")
    expect(getScenarioLabLink("add-feature-support-ticket-search")).toBeNull()
    expect(getScenarioLabLink(undefined)).toBeNull()
  })
})
