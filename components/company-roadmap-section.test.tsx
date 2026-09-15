import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { CompanyRoadmapSection } from "./company-roadmap-section"

describe("CompanyRoadmapSection", () => {
  const html = renderToStaticMarkup(<CompanyRoadmapSection />)

  it("keeps the homepage invitation focused on the roadmap wizard", () => {
    expect(html).toContain("A plan for the company on your calendar.")
    expect(html).toContain('href="/roadmap/new"')
    expect(html).toContain("Set your target")
    expect(html).toContain("company-roadmap-serif")
    expect(html).not.toContain("Your 4-week plan")
    expect(html).not.toContain("soon")
  })

  it("shows only roadmap-supported companies and hides the repeated logo list", () => {
    for (const company of ["Palantir", "Stripe", "Meta", "Amazon", "Google", "Microsoft"]) {
      expect(html).toContain(company)
    }
    expect(html).toContain('class="roadmap-logo-list" aria-hidden="true"')
    expect(html).toContain('aria-label="Roadmap companies"')
  })
})
