import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/components/seo/LandingPageBreadcrumb", () => ({ LandingPageBreadcrumb: () => null }))

import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import BugFixInterviewPracticePage from "@/app/bug-fix-interview-practice/page"
import BugFixGuidePage from "@/app/guides/how-to-practice-bug-fix-interviews/page"

describe("LandingPageTemplate CTA destination", () => {
  it("defaults both hero and footer CTAs to /interview", () => {
    const html = renderToStaticMarkup(
      <LandingPageTemplate
        title="Generic page"
        subtitle="Practice"
        heroDescription="Description"
        primaryKeyword="coding interview"
        contentSections={[]}
        faqs={[]}
      />
    )

    expect(html.match(/href="\/interview"/g)).toHaveLength(2)
  })

  it("routes both hero and footer CTAs on bug-fix acquisition pages directly to the debugging track", () => {
    for (const element of [
      <BugFixInterviewPracticePage key="landing" />,
      <BugFixGuidePage key="guide" />,
    ]) {
      const html = renderToStaticMarkup(element)
      expect(html.match(/href="\/interview\?track=debugging"/g)).toHaveLength(2)
      expect(html).not.toContain('href="/interview"')
    }
  })
})
