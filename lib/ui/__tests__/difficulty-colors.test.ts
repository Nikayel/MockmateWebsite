import { describe, it, expect } from "vitest"
import { difficultyColorClass } from "../difficulty-colors"

/**
 * The variant split that matters: `text` is a dark-surface-only treatment whose -400
 * shades measure 1.7-2.8:1 on a white card, and it was being used on /knowledge's
 * light-mode rows. `textOnLight` is the fix. Nothing stops the next caller reaching
 * for the wrong one, so the difference is pinned here.
 */
const LEVELS = ["easy", "medium", "hard"] as const

describe("difficultyColorClass textOnLight", () => {
  it("pairs an AA light shade with the existing dark shade", () => {
    for (const level of LEVELS) {
      const cls = difficultyColorClass(level, "textOnLight")
      expect(cls).toMatch(/^text-[a-z]+-700 dark:text-[a-z]+-400$/)
    }
  })

  it("keeps the dark appearance identical to the legacy text variant", () => {
    // The fix must not change what dark-mode users already see.
    for (const level of LEVELS) {
      const legacyDark = difficultyColorClass(level, "text").replace("text-", "")
      expect(difficultyColorClass(level, "textOnLight")).toContain(`dark:text-${legacyDark}`)
    }
  })

  it("falls back to a readable gray rather than the dark-only one", () => {
    expect(difficultyColorClass(null, "textOnLight")).toBe("text-gray-600 dark:text-gray-400")
    expect(difficultyColorClass("nonsense", "textOnLight")).toBe("text-gray-600 dark:text-gray-400")
  })

  it("leaves the dark-only text variant untouched for its existing callers", () => {
    // Documented as dark-only, not deleted: other surfaces legitimately use it.
    expect(difficultyColorClass("medium", "text")).toBe("text-amber-400")
  })

  it("gives every level a distinct colour", () => {
    const classes = LEVELS.map((l) => difficultyColorClass(l, "textOnLight"))
    expect(new Set(classes).size).toBe(LEVELS.length)
  })
})
