/**
 * Competitor Pricing Facts + Derived Comparison Claims
 *
 * Single source of truth for every "cheaper than X" claim the marketing
 * surfaces make. Before this module the same facts were typed by hand in five
 * places that had no way to stay in agreement:
 *
 *   components/comparison-section.tsx  750, 1125, "$150-225 per session", "$35/mo", "$150+"
 *   app/pricing/layout.tsx             "29% cheaper than LeetCode Premium" (x3, in metadata)
 *   app/pricing/page.tsx               "29% cheaper", "$225/year, saving you $75" (FAQ)
 *   components/seo/JsonLd.tsx          "29% cheaper", "45x cheaper", "$25/month vs $35/month"
 *   components/comparison-section.tsx  is rendered on BOTH / and /pricing
 *
 * Every one of those percentages is a function of PRICING_CONFIG's own price.
 * Change Pro from $25 to $29 and all five go silently wrong: the page would
 * still claim "29% cheaper" while actually being 17% cheaper. That is a false
 * advertising claim rendered directly above a Subscribe button, so these are
 * derived here rather than written down.
 *
 * The competitor prices themselves are the only real inputs, and they are
 * observed facts about other companies, so they carry a `verifiedOn` date. If
 * you update one, update the date in the same commit.
 */

import { PRICING_CONFIG } from "./config"

/**
 * Observed competitor prices in USD. These are the ONLY hand-maintained numbers
 * in this module; everything else is computed from them plus PRICING_CONFIG.
 */
export const COMPETITOR_PRICING = {
  leetcodePremium: {
    name: "LeetCode",
    fullName: "LeetCode Premium",
    monthlyPrice: 35,
    /** Last time a human loaded their pricing page and checked. */
    verifiedOn: "2026-08-10",
  },
  humanMock: {
    name: "Human",
    fullName: "Human Mock Interviews",
    /** Interviewing.io / Pramp Pro and similar, per session. */
    perSessionMin: 150,
    perSessionMax: 225,
    examples: "Interviewing.io, Pramp Pro, etc.",
    verifiedOn: "2026-08-10",
  },
} as const

/**
 * How many mock interviews the "significantly improves pass rates" claim rests
 * on. Used both as the multiplier for the human-mock cost comparison and in the
 * copy that explains it, so the two can never disagree.
 */
export const MOCKS_FOR_IMPACT = 5

/** CodeSparring Pro, monthly, on the website. The number every claim is relative to. */
function proMonthlyPrice(): number {
  return PRICING_CONFIG.pro.website.monthly.price
}

/**
 * How much cheaper Pro is than LeetCode Premium, as a whole percent.
 * At $25 vs $35 this is 29 (28.57 rounded), which is the number the metadata,
 * the FAQ, and the JSON-LD have all been quoting by hand.
 */
export function getLeetCodeSavingsPercent(): number {
  const theirs = COMPETITOR_PRICING.leetcodePremium.monthlyPrice
  return Math.round(((theirs - proMonthlyPrice()) / theirs) * 100)
}

/**
 * What {@link MOCKS_FOR_IMPACT} human mock interviews cost, as a range.
 * At $150-225 x 5 this is $750-$1125.
 */
export function getHumanMockTotalCost(): { min: number; max: number } {
  const { perSessionMin, perSessionMax } = COMPETITOR_PRICING.humanMock
  return {
    min: perSessionMin * MOCKS_FOR_IMPACT,
    max: perSessionMax * MOCKS_FOR_IMPACT,
  }
}

/**
 * How many times cheaper one month of Pro is than the top of the human-mock
 * range. At $1125 vs $25 this is 45, the "45x cheaper" claim in the JSON-LD.
 */
export function getHumanMockCostMultiple(): number {
  return Math.round(getHumanMockTotalCost().max / proMonthlyPrice())
}

/** "$150-225 per session x 5 sessions" — built from the same constants it describes. */
export function getHumanMockCostBasis(): string {
  const { perSessionMin, perSessionMax } = COMPETITOR_PRICING.humanMock
  return `$${perSessionMin}-${perSessionMax} per session x ${MOCKS_FOR_IMPACT} sessions`
}

/**
 * The one-line positioning claim, used in page metadata, Open Graph, Twitter
 * cards, and the JSON-LD offer descriptions.
 */
export function getLeetCodeComparisonClaim(): string {
  return `${getLeetCodeSavingsPercent()}% cheaper than ${COMPETITOR_PRICING.leetcodePremium.fullName}`
}
