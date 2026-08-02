/**
 * The orphaning regression test for the interview-prep hub.
 *
 * The hub used to render 3 of the 7 `COMPANY_TIERS` keys. All 38 company pages were still
 * statically generated and still in the sitemap, but 18 of them had zero inbound internal links from
 * anywhere on the site, which is the reliable way to keep a page from being crawled or found. That
 * kind of bug is invisible in review because the page looks complete: the tiers that ARE rendered
 * look fine, and nothing points at the missing ones.
 *
 * So this asserts the only thing that actually matters: the rendered HTML contains a link to every
 * company in `ALL_COMPANIES`. It renders the real page component to static markup rather than
 * inspecting the tier tables, because the tier tables were not the bug, the render loop was.
 *
 * Matches the existing component-test style in this repo (`components/ui/__tests__/button.test.tsx`,
 * `components/tutorials/__tests__/SqlResultGrid.test.tsx`): `renderToStaticMarkup` under the default
 * node environment, no DOM and no test-renderer dependency.
 */
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ALL_COMPANIES, COMPANY_TIERS } from "@/lib/data/company-questions"

// The page pulls in the full site chrome. Header/Footer are auth-aware client components whose
// dependency graph (Firebase, next/navigation, framer-motion) has nothing to do with what is being
// asserted, so they are stubbed to keep this a test of the link render loop.
vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))

import InterviewPrepPage from "../page"

const markup = renderToStaticMarkup(<InterviewPrepPage />)

/** Tier names contain "&" ("Growth & Finance"), which React escapes on the way into the markup. */
function asRendered(text: string): string {
  return text.replace(/&/g, "&amp;")
}

describe("interview-prep hub company links", () => {
  it.each(ALL_COMPANIES.map((company) => [company.id, company.name] as const))(
    "links to /interview-prep/%s (%s)",
    (companyId) => {
      expect(markup).toContain(`href="/interview-prep/${companyId}"`)
    }
  )

  it("links every company exactly once, so no tier duplicates another", () => {
    for (const company of ALL_COMPANIES) {
      const occurrences = markup.split(`href="/interview-prep/${company.id}"`).length - 1
      expect(occurrences).toBe(1)
    }
  })

  it("renders every tier heading", () => {
    // The companion assertion to the link check: a tier could in principle be covered by another
    // tier's roster, and its own section still be missing.
    for (const tier of Object.values(COMPANY_TIERS)) {
      expect(markup).toContain(asRendered(tier.name))
    }
  })

  it("covers every company id declared across the tiers", () => {
    // `ALL_COMPANIES` and the tier rosters are built from the same per-file exports, so a company
    // present in one and absent from the other would be a data bug that silently hides a page.
    const tieredIds = new Set(Object.values(COMPANY_TIERS).flatMap((tier) => tier.companies))
    const rosterIds = new Set(ALL_COMPANIES.map((company) => company.id))
    expect([...tieredIds].filter((id) => !rosterIds.has(id))).toEqual([])
    expect([...rosterIds].filter((id) => !tieredIds.has(id))).toEqual([])
  })
})

describe("interview-prep hub copy", () => {
  it("states the company count from the live roster instead of a hardcoded number", () => {
    expect(markup).toContain(`${ALL_COMPANIES.length} guides`)
  })

  it("carries no invented social proof", () => {
    // The company template used to render "N engineers prepared this month" from a hash of the
    // company name. Nothing on this surface may claim usage we cannot measure.
    expect(markup).not.toMatch(/engineers prepared/i)
    expect(markup).not.toMatch(/\d+[,\d]*\s+(engineers|candidates|users)\b/i)
  })

  it("links into the free Learn corpus", () => {
    // The repurpose: a signed-out visitor must be able to leave this page into something they can
    // use immediately, without an account.
    expect(markup).toContain('href="/learn"')
    expect(markup).toContain('href="/learn/python"')
  })
})
