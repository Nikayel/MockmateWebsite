/**
 * The colour tokens in app/globals.css carry contrast promises in their own
 * comments, and nothing checked them.
 *
 * That is how the pricing page ended up shipping a Subscribe button at 3.97:1
 * and a "Save 25%" badge at 3.19:1 in light mode, both built from what looked
 * like the correct tokens. It is also how a proposed fix during this audit
 * (darkening --accent-foreground so it would pass on --accent) nearly landed:
 * it would have taken the two primary CTAs, which sit on --accent-strong, from
 * 5.53:1 down to 3.46:1. Every one of those is a number, so assert the numbers.
 *
 * The rule the tokens encode:
 *   --accent / --neural        fills, borders, rings. NOT text-safe in light.
 *   --accent-strong / --neural-strong   the text-safe variants. In dark mode
 *                              they collapse onto the base token, which is
 *                              already legible there.
 *
 * Parses the stylesheet rather than importing a duplicate palette, so the test
 * fails when someone edits the real source of truth.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const GLOBALS_CSS = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf8")

/** WCAG 2.1 relative luminance. Implemented locally to avoid a dependency. */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Reads a token out of a specific block. `:root` is light; `.dark` is dark.
 * Only six-digit hex tokens participate; anything authored in oklch is skipped
 * by the callers below rather than approximated.
 */
function readToken(block: "light" | "dark", token: string): string {
  // :root { ... } is the first block; .dark { ... } the second.
  const blockMatch =
    block === "light"
      ? GLOBALS_CSS.match(/:root\s*\{([\s\S]*?)\n\}/)
      : GLOBALS_CSS.match(/\.dark\s*\{([\s\S]*?)\n\}/)

  if (!blockMatch) throw new Error(`Could not locate the ${block} token block in globals.css`)

  const declaration = new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(blockMatch[1])
  if (!declaration) {
    throw new Error(`--${token} is not a six-digit hex in the ${block} block`)
  }
  return declaration[1].toLowerCase()
}

const THEMES = ["light", "dark"] as const

describe("globals.css token contrast", () => {
  describe.each(THEMES)("%s theme", (theme) => {
    it("--accent-foreground on --accent-strong clears AA for button labels", () => {
      // The pairing both primary CTAs use: Subscribe (PricingPageClient) and
      // "Try your first mock free" (comparison-section). This is the assertion
      // that rejects darkening --accent-foreground.
      const ratio = contrastRatio(
        readToken(theme, "accent-foreground"),
        readToken(theme, "accent-strong")
      )

      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it("--accent-strong is readable as text on the page and on a card", () => {
      expect(
        contrastRatio(readToken(theme, "accent-strong"), readToken(theme, "background"))
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(readToken(theme, "accent-strong"), readToken(theme, "card"))
      ).toBeGreaterThanOrEqual(4.5)
    })

    it("--neural-strong is readable as text on the page and on a card", () => {
      expect(
        contrastRatio(readToken(theme, "neural-strong"), readToken(theme, "background"))
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(readToken(theme, "neural-strong"), readToken(theme, "card"))
      ).toBeGreaterThanOrEqual(4.5)
    })

    it("--muted-foreground is readable as text on a card", () => {
      // Nearly all supporting copy on the pricing cards and the comparison
      // table uses this at 11-14px, so it must clear the normal-text bar.
      expect(
        contrastRatio(readToken(theme, "muted-foreground"), readToken(theme, "card"))
      ).toBeGreaterThanOrEqual(4.5)
    })

    it("--accent clears the 3:1 non-text bar as a fill or border", () => {
      // Deliberately only 3:1. --accent is NOT text-safe in light mode (3.74:1
      // on the page), which is the entire reason --accent-strong exists. If
      // this ever reaches 4.5 the two tokens could merge; until then, never
      // use text-accent.
      expect(
        contrastRatio(readToken(theme, "accent"), readToken(theme, "background"))
      ).toBeGreaterThanOrEqual(3)
    })
  })

  it("the -strong variants collapse onto their base token in dark mode", () => {
    // Documented in globals.css: dark mode's accent and success green are
    // already legible as text, so the strong variants are the same value.
    // Anything else means dark mode grew a second palette by accident.
    expect(readToken("dark", "accent-strong")).toBe(readToken("dark", "accent"))
    expect(readToken("dark", "neural-strong")).toBe(readToken("dark", "neural"))
  })

  it("the -strong variants are genuinely darker than their base in light mode", () => {
    // If these were equal, the token would be decorative and the AA failures
    // it exists to prevent would be back.
    expect(relativeLuminance(readToken("light", "accent-strong"))).toBeLessThan(
      relativeLuminance(readToken("light", "accent"))
    )
    expect(relativeLuminance(readToken("light", "neural-strong"))).toBeLessThan(
      relativeLuminance(readToken("light", "neural"))
    )
  })
})
