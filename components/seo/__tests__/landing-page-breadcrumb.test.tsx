/**
 * The marketing cluster's BreadcrumbList trail.
 *
 * Breadcrumb is one of the few schema types Google still renders a rich result for, and the whole
 * value is in the emitted JSON: a wrong `item` URL, a leaf pointing at the site root, or a missing
 * "Home" crumb all render exactly like a correct one in the browser and are only visible in the
 * structured data. So the assertions are on the serialised graph, not on the component tree.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { SITE_ORIGIN } from "@/lib/seo/site"

const pathname = vi.hoisted(() => ({ current: "/ai-coding-interview-practice" as string | null }))

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}))

const { LandingPageBreadcrumb } = await import("../LandingPageBreadcrumb")

interface BreadcrumbItem {
  "@type": string
  position: number
  name: string
  item: string
}

/** Render the component and parse the single JSON-LD script it emits, or null when it emits none. */
function renderBreadcrumb(title: string): { itemListElement: BreadcrumbItem[] } | null {
  const html = renderToStaticMarkup(<LandingPageBreadcrumb title={title} />)
  const match = html.match(/<script type="application\/ld\+json">(.*)<\/script>/s)
  if (!match) return null
  return JSON.parse(match[1])
}

describe("LandingPageBreadcrumb", () => {
  it("starts the trail at Home, like every other breadcrumb on the site", () => {
    pathname.current = "/ai-coding-interview-practice"
    const graph = renderBreadcrumb("AI Coding Interview Practice")!

    expect(graph.itemListElement[0]).toMatchObject({
      position: 1,
      name: "Home",
      item: SITE_ORIGIN,
    })
  })

  it("points the leaf at the page's own canonical URL", () => {
    pathname.current = "/guides/what-is-a-real-world-coding-interview-round"
    const graph = renderBreadcrumb("What is a Real-World Coding Interview?")!

    expect(graph.itemListElement[1]).toMatchObject({
      position: 2,
      name: "What is a Real-World Coding Interview?",
      item: `${SITE_ORIGIN}/guides/what-is-a-real-world-coding-interview-round`,
    })
  })

  it("stops at two levels rather than inventing a /guides crumb that 404s", () => {
    pathname.current = "/guides/how-to-talk-through-coding-interviews"
    const graph = renderBreadcrumb("How to Talk Through Coding Interviews")!

    expect(graph.itemListElement).toHaveLength(2)
    expect(graph.itemListElement.map((entry) => entry.item)).not.toContain(`${SITE_ORIGIN}/guides`)
  })

  it("emits nothing rather than a homepage trail when the path is unavailable", () => {
    pathname.current = null
    expect(renderBreadcrumb("Anything")).toBeNull()

    pathname.current = "/"
    expect(renderBreadcrumb("Anything")).toBeNull()
  })
})
