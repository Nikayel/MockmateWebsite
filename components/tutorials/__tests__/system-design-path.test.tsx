/**
 * SEO guard for the System Design Path.
 *
 * `/learn/system-design` is an indexed traffic surface and it is the main internal route to the
 * twelve level indexes underneath it, which are in turn the route to 208 lesson pages. Rebuilding
 * the flat level list as an interactive path is exactly the change that can quietly turn twelve
 * `<a href>`s into twelve `<button>`s, or move them behind hydration, and neither shows up in a
 * screenshot. So this asserts the property that actually matters to a crawler: every authored level
 * is linked, by href, from the INITIAL HTML, with no JavaScript run.
 *
 * `renderToStaticMarkup` is the right instrument for that precisely because it runs no effects:
 * whatever it produces is the floor a crawler and a JS-disabled reader are guaranteed to get. The
 * completion overlay and the hover preview live in effects and handlers above that floor.
 */
import { describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { listSystemDesignLevels } from "@/lib/tutorials/system-design/registry"
import { toPathLevelSummary } from "@/lib/tutorials/level-path"
import { levelPath } from "@/lib/tutorials/lesson-routes"
import {
  SYSTEM_DESIGN_SECTIONS,
  groupSystemDesignLevels,
} from "@/lib/tutorials/system-design/sections"

// The Path reads auth only to choose between the public lesson page and the gated workspace for the
// preview CTA. Signed out is the state the server renders in, so it is the state under test.
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null, initialized: false }) }))

const { SystemDesignPath } = await import("../SystemDesignPath")

/** Level titles carry `&` and taglines carry `'`, both of which React escapes on the way out. */
function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

const levels = listSystemDesignLevels()
const summaries = levels.map((level) => toPathLevelSummary(level))
const html = decodeEntities(
  renderToStaticMarkup(createElement(SystemDesignPath, { levels: summaries }))
)
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!)

describe("SystemDesignPath", () => {
  it("has a real curriculum to work from", () => {
    // Guards the guard: an empty registry would make every assertion below vacuously true.
    expect(levels.length).toBeGreaterThan(1)
  })

  it("links every level from the initial HTML", () => {
    for (const level of levels) {
      expect(hrefs, `level ${level.id} (${level.slug}) is not linked`).toContain(
        levelPath("system-design", level.slug)
      )
    }
  })

  it("links each level exactly once, so the page has no duplicate route to the same index", () => {
    const levelHrefs = hrefs.filter((href) => /^\/learn\/system-design\/[^/]+$/.test(href))
    expect(levelHrefs).toHaveLength(levels.length)
  })

  /**
   * The arcs collapse, so "every level is linked" has to hold in the COLLAPSED case or it holds by
   * accident. A client-state accordion would render only the open arc's list and quietly drop nine
   * of the twelve links from the server HTML; `<details>` keeps them all. This asserts the setup the
   * link assertions above depend on, so making every arc default-open cannot silently turn those
   * assertions into a test of nothing.
   */
  it("renders most arcs collapsed, which is the case the link guard has to survive", () => {
    const total = (html.match(/<details\b/g) ?? []).length
    const open = (html.match(/<details\b[^>]*\bopen\b/g) ?? []).length
    expect(total).toBe(SYSTEM_DESIGN_SECTIONS.length)
    expect(open).toBeLessThan(total)
  })

  it("carries each level's title and tagline as real text, not as a hydration payload", () => {
    for (const level of levels) {
      expect(html).toContain(level.title)
      expect(html).toContain(level.tagline)
    }
  })

  it("shows every level under an arc, with no level dropped or duplicated", () => {
    const grouped = groupSystemDesignLevels(summaries)
    expect(grouped.flatMap((arc) => arc.levels.map((level) => level.id)).sort()).toEqual(
      levels.map((level) => level.id).sort()
    )
    // The catch-all only exists so a new level cannot vanish. Reaching it means an arc needs editing.
    expect(grouped.map((arc) => arc.section.id)).not.toContain("more")
  })

  it("renders each arc's heading and blurb", () => {
    for (const section of SYSTEM_DESIGN_SECTIONS) {
      expect(html).toContain(section.title)
      expect(html).toContain(section.blurb.slice(0, 40))
    }
  })

  /**
   * The lean projection is the reason the client bundle does not carry the whole course. A regression
   * here (passing authored levels straight through) would ship 208 lessons of teach markdown and
   * model answers into the browser, which no test would otherwise notice.
   */
  it("ships headings and counts, never lesson bodies or model answers", () => {
    const serialized = JSON.stringify(summaries)
    expect(serialized).not.toContain("modelAnswer")
    expect(serialized).not.toContain("thinkAbout")
    expect(serialized).not.toContain("markdown")
    for (const summary of summaries) {
      for (const mod of summary.modules) {
        expect(Object.keys(mod).sort()).toEqual(["id", "lessonCount", "title"])
      }
    }
  })
})
