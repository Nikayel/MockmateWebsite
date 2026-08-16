/**
 * The shared `BreadcrumbList` emitter.
 *
 * Every breadcrumbed page on the site renders through this one component, so a defect here is a
 * defect on all of them at once and none of it is visible in a browser. The specific regression this
 * pins was found with the Search Console URL Inspection API on 2026-08-16: the graph validated, and
 * the detected rich result came back named "Unnamed item" because the `BreadcrumbList` itself had no
 * `name`, so the enhancement report bucketed the whole site under one meaningless label.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SITE_ORIGIN } from "@/lib/seo/site"
import { BreadcrumbJsonLd } from "../JsonLd"

interface BreadcrumbGraph {
  "@type": string
  name?: string
  itemListElement: Array<{ "@type": string; position: number; name: string; item: string }>
}

function render(props: Parameters<typeof BreadcrumbJsonLd>[0]): BreadcrumbGraph {
  const html = renderToStaticMarkup(<BreadcrumbJsonLd {...props} />)
  const match = html.match(/<script type="application\/ld\+json">(.*)<\/script>/s)
  expect(match).not.toBeNull()
  return JSON.parse(match![1])
}

const LESSON_TRAIL = [
  { name: "Home", url: "/" },
  { name: "Learn", url: "/learn" },
  { name: "Data Engineering", url: "/learn/data-engineering" },
  { name: "Level 1: SQL Foundations", url: "/learn/data-engineering/foundations" },
  { name: "Dates and Times in SQLite", url: "/learn/data-engineering/foundations/sql-l1-dates" },
]

describe("BreadcrumbJsonLd", () => {
  it("names the list itself, so Search Console does not report it as an unnamed item", () => {
    const graph = render({ items: LESSON_TRAIL })
    expect(graph.name).toBe("Dates and Times in SQLite")
  })

  it("accepts an explicit name over the leaf", () => {
    expect(render({ items: LESSON_TRAIL, name: "Lesson trail" }).name).toBe("Lesson trail")
  })

  it("still names every item in the trail", () => {
    const graph = render({ items: LESSON_TRAIL })
    const unnamed = graph.itemListElement.filter((entry) => !entry.name)
    expect(unnamed).toEqual([])
  })

  it("numbers the trail from one and resolves every item to an absolute URL", () => {
    const graph = render({ items: LESSON_TRAIL })
    expect(graph.itemListElement.map((entry) => entry.position)).toEqual([1, 2, 3, 4, 5])
    expect(graph.itemListElement[0].item).toBe(SITE_ORIGIN)
    expect(graph.itemListElement[4].item).toBe(
      `${SITE_ORIGIN}/learn/data-engineering/foundations/sql-l1-dates`
    )
  })

  it("falls back to the brand rather than emitting an undefined name", () => {
    expect(render({ items: [] }).name).toBe("CodeSparring")
  })
})
