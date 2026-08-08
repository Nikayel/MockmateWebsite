/**
 * The footer is the site's only crawl path to several pages, so its links are a contract.
 *
 * Eight SEO landing pages and guides were submitted in `app/sitemap.ts` and linked from nowhere at
 * all. A URL that only exists in a sitemap is what Search Console labels "Discovered, currently not
 * indexed": Google knows it exists and has no internal link suggesting it is worth crawling. The
 * footer column added for them is the fix, and nothing else on the site links to them, so a
 * refactor that drops the column silently returns all eight to that state.
 *
 * Rendering the real component (rather than asserting on the exported constant, which would only
 * prove the constant equals itself) is what makes this catch a dropped `.map`, a wrong `href` prop,
 * or a column deleted during a layout change.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FOOTER_GUIDE_LINKS, Footer } from "../footer"

/** Every `href` the rendered footer emits. */
function renderedFooterHrefs(): string[] {
  const html = renderToStaticMarkup(<Footer />)
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
}

/**
 * The pages that had zero inbound internal links before the "Guides & comparisons" column existed.
 * Spelled out as literals on purpose: this is the defect being pinned, so the expectation must not
 * be derived from the same constant the component reads.
 */
const PREVIOUSLY_ORPHANED_PAGES = [
  "/ai-coding-interview-practice",
  "/system-design-interview-practice",
  "/software-engineer-interview-practice",
  "/new-grad-coding-interview-practice",
  "/free-ai-coding-interview",
  "/best-ai-coding-interview-tools",
  "/guides/how-to-talk-through-coding-interviews",
  "/guides/what-is-a-real-world-coding-interview-round",
]

describe("footer internal links", () => {
  it("links every previously orphaned landing page and guide", () => {
    const hrefs = renderedFooterHrefs()
    for (const path of PREVIOUSLY_ORPHANED_PAGES) {
      expect(hrefs, `${path} has no inbound internal link`).toContain(path)
    }
  })

  it("renders one anchor per declared guide link", () => {
    const hrefs = renderedFooterHrefs()
    for (const guide of FOOTER_GUIDE_LINKS) {
      expect(hrefs).toContain(guide.href)
    }
  })

  it("keeps guide links site-relative so they resolve against the canonical host", () => {
    for (const guide of FOOTER_GUIDE_LINKS) {
      expect(guide.href.startsWith("/")).toBe(true)
      expect(guide.href).not.toMatch(/^https?:/)
    }
  })

  it("declares no duplicate guide paths", () => {
    const paths = FOOTER_GUIDE_LINKS.map((guide) => guide.href)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
