/**
 * These claims are advertising, rendered above a Subscribe button and emitted
 * into structured data that Google indexes. They were previously hand-typed in
 * five files, so a price change in lib/config.ts could leave the site claiming
 * a discount it no longer offers with nothing failing.
 *
 * The point of this file is not to re-test arithmetic. It is to pin the claims
 * to the config they describe, so that changing a price and NOT updating the
 * marketing surfaces fails here instead of on the live pricing page.
 */

import { describe, it, expect } from "vitest"

import { PRICING_CONFIG } from "../config"
import {
  COMPETITOR_PRICING,
  MOCKS_FOR_IMPACT,
  formatPlanPrice,
  formatVerifiedOn,
  getHumanMockCostBasis,
  getHumanMockCostMultiple,
  getHumanMockTotalCost,
  getLeetCodeComparisonClaim,
  getLeetCodeSavingsPercent,
} from "../pricing-comparison"

describe("competitor comparison claims", () => {
  it("derives the LeetCode discount from the live Pro price, not a literal", () => {
    const ours = PRICING_CONFIG.pro.website.monthly.price
    const theirs = COMPETITOR_PRICING.leetcodePremium.monthlyPrice

    expect(getLeetCodeSavingsPercent()).toBe(Math.round(((theirs - ours) / theirs) * 100))
  })

  it("still reads 29% at the prices currently shipped ($25 vs $35)", () => {
    // Guards the specific string the metadata, FAQ, and JSON-LD have all been
    // quoting. If this fails, a price moved and that copy is now a false claim.
    expect(getLeetCodeSavingsPercent()).toBe(29)
    expect(getLeetCodeComparisonClaim()).toBe("29% cheaper than LeetCode Premium")
  })

  it("keeps the human-mock total consistent with its own stated cost basis", () => {
    const { min, max } = getHumanMockTotalCost()

    expect(min).toBe(COMPETITOR_PRICING.humanMock.perSessionMin * MOCKS_FOR_IMPACT)
    expect(max).toBe(COMPETITOR_PRICING.humanMock.perSessionMax * MOCKS_FOR_IMPACT)
    // The displayed range and the sentence explaining it must describe the same
    // multiplication. These were two unrelated string literals before.
    expect(getHumanMockCostBasis()).toContain(`x ${MOCKS_FOR_IMPACT} sessions`)
    expect(getHumanMockCostBasis()).toContain(`$${COMPETITOR_PRICING.humanMock.perSessionMin}`)
  })

  it("derives the 45x human-mock multiple rather than asserting it", () => {
    const ours = PRICING_CONFIG.pro.website.monthly.price

    expect(getHumanMockCostMultiple()).toBe(Math.round(getHumanMockTotalCost().max / ours))
    expect(getHumanMockCostMultiple()).toBe(45)
  })

  it("keeps the 'less than a single human mock session' claim true", () => {
    // components/comparison-section.tsx renders "One month costs less than a
    // single human mock session." as prose, 70px above a CTA, on both / and
    // /pricing. It is an advertising claim with no code behind it, true only
    // while Pro's monthly price stays under the CHEAPEST human session. This
    // is the one assertion between a price rise and a false claim.
    expect(PRICING_CONFIG.pro.website.monthly.price).toBeLessThan(
      COMPETITOR_PRICING.humanMock.perSessionMin
    )
  })
})

/**
 * /codesparring-vs-hellointerview publishes another company's prices next to a
 * review date. Both halves are load-bearing: a price with no date is a claim
 * about today, and a date that renders differently per reader is not a date.
 */
describe("competitor facts a comparison page publishes", () => {
  it("renders a verifiedOn date without the UTC off-by-one", () => {
    // `new Date("2026-08-16").toLocaleDateString()` reads the string as UTC
    // midnight and prints August 15 for every reader west of Greenwich, so the
    // published review date would disagree with itself by timezone.
    expect(formatVerifiedOn("2026-08-16")).toBe("August 16, 2026")
    expect(formatVerifiedOn("2026-01-01")).toBe("January 1, 2026")
    expect(formatVerifiedOn("2026-12-31")).toBe("December 31, 2026")
  })

  it("prints a competitor's list price alongside a promotional one", () => {
    // A table that quoted only the sale price would go quietly wrong the day
    // the sale ended, which is the failure mode a comparison page cannot have.
    expect(formatPlanPrice({ price: 47, listPrice: 59 })).toBe("$47 (list $59)")
    expect(formatPlanPrice({ price: 79, listPrice: 79 })).toBe("$79")
  })

  it("keeps every Hello Interview plan sourced and dated", () => {
    const hello = COMPETITOR_PRICING.helloInterview

    expect(hello.source).toMatch(/^https:\/\/www\.hellointerview\.com\//)
    expect(hello.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Every plan needs both figures, because the page renders both. A plan
    // added without a list price would render "$X (list undefined)".
    for (const plan of Object.values(hello.plans)) {
      expect(typeof plan.price).toBe("number")
      expect(typeof plan.listPrice).toBe("number")
      expect(plan.price).toBeLessThanOrEqual(plan.listPrice)
      expect(plan.label.length).toBeGreaterThan(0)
    }
  })
})

describe("PRICING_CONFIG internal consistency", () => {
  /**
   * The yearly block carries `savings` and `savingsPercent` as literals next to
   * the prices they describe. Nothing recomputed them, so the pricing page's
   * "Save 25%" badge and the FAQ's "saving you $75" could both go stale from a
   * one-line price edit.
   */
  it("yearly savings and savingsPercent match the monthly and yearly prices", () => {
    const { monthly, yearly } = PRICING_CONFIG.pro.website
    const fullYear = monthly.price * 12

    expect(yearly.savings).toBe(fullYear - yearly.totalPrice)
    expect(yearly.savingsPercent).toBe(Math.round((yearly.savings / fullYear) * 100))
  })

  it("the yearly per-month display is the annual total divided by twelve", () => {
    const { yearly } = PRICING_CONFIG.pro.website

    expect(yearly.priceDisplay).toBe(`$${Math.round(yearly.totalPrice / 12)}`)
  })

  it("the yearly billing note states the actual annual charge", () => {
    const { yearly } = PRICING_CONFIG.pro.website

    // The pricing card renders this string verbatim as its one disclosure that
    // an annual plan is a single charge, so it has to contain the real total.
    expect(yearly.billingNote).toContain(String(yearly.totalPrice))
  })
})
