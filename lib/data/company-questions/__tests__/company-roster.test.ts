/**
 * Roster/tier agreement contract.
 *
 * `ALL_COMPANIES` and the `COMPANY_TIERS` rosters are built from the same per-file
 * exports, so a company present in one and absent from the other is a data bug that
 * silently hides that company from every tier-driven surface (the wizard's company
 * selector groups by tier) while the id still validates elsewhere — or the reverse.
 * The retired interview-prep hub test was the only guard on this invariant; this
 * replaces it at the data layer, where the invariant actually lives.
 */
import { describe, expect, it } from "vitest"

import { ALL_COMPANIES, COMPANY_TIERS, getCompanyById } from ".."

const tierEntries = Object.entries(COMPANY_TIERS)

describe("company roster / tier agreement", () => {
  it.each(ALL_COMPANIES.map((company) => [company.id, company.name] as const))(
    "%s (%s) appears in exactly one tier's roster",
    (companyId) => {
      const tiersListingIt = tierEntries.filter(([, tier]) =>
        (tier.companies as readonly string[]).includes(companyId)
      )
      expect(tiersListingIt.map(([key]) => key)).toHaveLength(1)
    }
  )

  it("every id declared across the tiers is a real company", () => {
    for (const [tierKey, tier] of tierEntries) {
      for (const companyId of tier.companies) {
        // getCompanyById rather than a set lookup, so this also exercises the exact
        // resolution path the route guard, labs, and the wizard's resume guard use.
        const company = getCompanyById(companyId)
        expect(
          company,
          `${tierKey} lists "${companyId}" but getCompanyById returns nothing`
        ).toBeDefined()
        expect(company?.id).toBe(companyId)
      }
    }
  })

  it("has no duplicate ids inside ALL_COMPANIES itself", () => {
    // A duplicate would make "exactly one tier" vacuously pass for the shadowed entry:
    // the reduce building COMPANY_MAP keeps only the last one.
    const ids = ALL_COMPANIES.map((company) => company.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
