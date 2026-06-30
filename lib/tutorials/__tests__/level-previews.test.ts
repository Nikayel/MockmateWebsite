/**
 * The Path's sticky preview renders a sample for whatever level is selected, so every authored
 * level must have a complete `LEVEL_PREVIEWS` entry — otherwise the panel falls back to level 1's
 * sample and silently mislabels the level. This guards against adding a level without its preview.
 */
import { describe, it, expect } from "vitest"
import { LEVEL_PREVIEWS } from "../level-previews"
import { listLevels } from "../registry"

describe("LEVEL_PREVIEWS", () => {
  it("has a complete entry for every authored level", () => {
    for (const level of listLevels()) {
      const preview = LEVEL_PREVIEWS[level.id]
      expect(preview, `level ${level.id} preview`).toBeDefined()
      expect(preview.filename).toMatch(/\.py$/)
      expect(preview.audience.length).toBeGreaterThan(0)
      expect(preview.sample.length).toBeGreaterThan(0)
      // At least one line carries real tokens (not an all-blank sample).
      expect(preview.sample.some((line) => line.length > 0)).toBe(true)
    }
  })

  it("only colors tokens with known syntax kinds", () => {
    const kinds = new Set(["kw", "str", "com", "fn", "num", "plain"])
    for (const preview of Object.values(LEVEL_PREVIEWS)) {
      for (const line of preview.sample) {
        for (const token of line) {
          expect(kinds.has(token.kind)).toBe(true)
          expect(typeof token.text).toBe("string")
        }
      }
    }
  })
})
