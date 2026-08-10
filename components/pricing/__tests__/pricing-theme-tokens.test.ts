/**
 * The pricing page was unreadable in light mode, and it got that way one class
 * at a time.
 *
 * app/layout.tsx mounts <ThemeProvider attribute="class"> with a full light
 * token set in app/globals.css, and components/header.tsx renders <ThemeToggle />
 * in three places, so light mode is a theme users actually reach. But the whole
 * pricing tree was authored against a dark background: the h1, both plan cards,
 * the FAQ, and the "Traditional vs. Interactive" section were built from
 * text-white / text-gray-* / bg-white-alpha / border-white-alpha, and
 * comparison-section.tsx carried 48 raw hex literals across 43 inline style
 * objects. On a #f9f8f5 page that is white text on near-white: 1.06:1.
 *
 * Every other marketing section (features, relevance-gap, ai-assisted) already
 * uses semantic tokens and is theme-correct. These files were the outliers, so
 * this pins them there. It reads source rather than rendering because the defect
 * is a class name, not a behaviour, and the failure mode is someone pasting a
 * dark-mode-looking snippet back in months from now.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..", "..")

/** The pricing page's full component tree. */
const PRICING_TREE = [
  "components/pricing/PricingPageClient.tsx",
  "components/pricing/SessionPreview.tsx",
  "components/comparison-section.tsx",
  "app/pricing/page.tsx",
  "app/pricing/layout.tsx",
]

/**
 * Classes and literals that pin a colour to one theme. Each is exactly what was
 * removed from these files, so a reappearance is a regression, not a new style.
 */
const THEME_PINNED_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "text-white", pattern: /className=(?:"|`|\{")[^"`]*\btext-white\b/ },
  { label: "text-black", pattern: /className=(?:"|`|\{")[^"`]*\btext-black\b/ },
  { label: "text-gray-*", pattern: /\btext-gray-\d{2,3}\b/ },
  { label: "text-zinc-*", pattern: /\btext-zinc-\d{2,3}\b/ },
  { label: "bg-zinc-*", pattern: /\bbg-zinc-\d{2,3}\b/ },
  { label: "bg-white/<alpha>", pattern: /\bbg-white\/(?:\[|\d)/ },
  { label: "border-white/<alpha>", pattern: /\bborder-white\/(?:\[|\d)/ },
]

/** Strips comments so the explanations of what was wrong do not trip the guard. */
function sourceWithoutComments(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
}

describe("pricing page is theme-token driven", () => {
  it.each(PRICING_TREE)("%s pins no colour to a single theme", (relativePath) => {
    const source = sourceWithoutComments(relativePath)

    const offenders = THEME_PINNED_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(
      ({ label }) => label
    )

    expect(offenders).toEqual([])
  })

  it.each(PRICING_TREE)("%s carries no raw hex colours", (relativePath) => {
    const source = sourceWithoutComments(relativePath)

    // Six- and three-digit hex, in className strings or inline style objects.
    // globals.css owns colour; a component naming one has forked the palette.
    expect(source.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)).toBeNull()
  })
})

describe("accent and success colours use the AA-safe text variants", () => {
  /**
   * globals.css states the rule at the token definitions: --accent measures
   * 3.74:1 on the light page and 3.97:1 on a card, and --neural 3.19:1, so
   * neither passes WCAG AA (4.5:1) as normal-size text. --accent-strong and
   * --neural-strong exist for that and collapse onto the base token in dark
   * mode, where the base is already legible.
   *
   * So `text-accent` and `text-neural` are always a bug on these surfaces,
   * while bg-accent / border-accent / ring-accent remain correct.
   */
  it.each(PRICING_TREE)("%s never uses text-accent or text-neural", (relativePath) => {
    const source = sourceWithoutComments(relativePath)

    // Negative lookahead so the -strong variants pass.
    expect(source).not.toMatch(/\btext-accent(?!-strong|-foreground)\b/)
    expect(source).not.toMatch(/\btext-neural(?!-strong)\b/)
  })
})

describe("the stock-photo comparison section stays deleted", () => {
  it("no file imports the removed feature-with-image-comparison component", () => {
    for (const relativePath of PRICING_TREE) {
      expect(readFileSync(join(REPO_ROOT, relativePath), "utf8")).not.toContain(
        "feature-with-image-comparison"
      )
    }
  })

  it("next.config.mjs no longer allows the unsplash image host", () => {
    // The remotePattern existed solely for that section; its own comment said so.
    // Re-adding it would mean a hotlinked third-party image is back on a page
    // that should only render assets this repo controls.
    const config = readFileSync(join(REPO_ROOT, "next.config.mjs"), "utf8")

    expect(config).not.toContain("images.unsplash.com")
  })
})
