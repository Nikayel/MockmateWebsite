/**
 * Category badge colours have one owner, because /blog and /blog/[slug] render
 * the same badge for the same post. The map used to be a byte-identical local
 * literal in both components, so a sixth category would have been styled on the
 * listing page and silently fall back to the `guides` cyan on the post page.
 */
import { describe, it, expect } from "vitest"
import {
  blogCategoryBadgeColor,
  categoryBadgeColors,
  categoryLabels,
  type BlogPostMeta,
} from "@/lib/blog-types"

const CATEGORIES = Object.keys(categoryLabels) as BlogPostMeta["category"][]

describe("blogCategoryBadgeColor", () => {
  it("covers every category that has a label", () => {
    for (const category of CATEGORIES) {
      expect(blogCategoryBadgeColor(category)).toBe(categoryBadgeColors[category])
    }
  })

  it("gives every category a distinct light and dark treatment", () => {
    const light = new Set(CATEGORIES.map((c) => blogCategoryBadgeColor(c).light))
    const dark = new Set(CATEGORIES.map((c) => blogCategoryBadgeColor(c).dark))
    expect(light.size).toBe(CATEGORIES.length)
    expect(dark.size).toBe(CATEGORIES.length)
  })

  it("falls back to guides for a category the frontmatter invented", () => {
    // Categories arrive from MDX frontmatter, which the type system never
    // checked; both call sites relied on this fallback rather than crashing.
    expect(blogCategoryBadgeColor("not-a-category")).toBe(categoryBadgeColors.guides)
  })
})
