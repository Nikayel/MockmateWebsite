/**
 * Light-mode contrast guard for the DSA pattern cards (`/interview?track=dsa`, Patterns view).
 *
 * The defect this exists to stop shipped and stayed shipped: all seventeen `PATTERN_GROUPS` carried
 * an identical `bg-slate-900/60`, which overrode the `Card` primitive's `bg-card`. Under the dark
 * theme that reads as a slightly darker card and looks intentional, which is exactly why nobody
 * caught it. Under the light theme it painted a near-black slab (#6f747f) and then put the card's
 * own theme-token text on it: the `text-muted-foreground` "n/m solved" line measured 1.18:1 and the
 * `text-foreground` heading 3.31:1, against 4.5:1 for AA.
 *
 * ## Two halves, because the first fix only covered one of them
 *
 * Removing the slab fixes the theme-token text. It does NOT fix the opposite arrangement, which the
 * same card also has: hardcoded DARK-SURFACE-ONLY TEXT that was legible only because the slab was
 * under it. The difficulty pills (`softBadge`: `text-emerald-300` and friends) went from a washed
 * out 2.5-3:1 on the slab to 1.33-1.66:1 on a white card, and the solved-problem tick
 * (`text-green-400` on `bg-green-500/20`) to 1.47:1. So a guard that only bans dark backgrounds
 * would have passed green on the very commit that introduced the visible failure.
 *
 * Hence both rules below: a surface-wide ban on dark literal BACKGROUNDS, and a measurement of the
 * actual FOREGROUND pairs this card paints, read from the live `difficultyColorClass` table rather
 * than from a copy of its class strings.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

import { AA_NORMAL, composite, contrastRatio } from "@/lib/ui/wcag-contrast"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { DifficultyLevel } from "@/lib/scenarios/types"

const LIGHT = {
  card: "#ffffff",
  foreground: "#26241f",
  mutedForeground: "#6c685f",
}

const SLATE_900 = "#0f172a"

const DIFFICULTIES: DifficultyLevel[] = ["easy", "medium", "hard"]

const PATTERN_BROWSER = "components/interview/PatternBrowser.tsx"
const PATTERN_BROWSER_SOURCE = readFileSync(join(process.cwd(), PATTERN_BROWSER), "utf8")

/**
 * Tailwind's default ramp, for the shades the difficulty variants name. Duplicated from Tailwind by
 * necessity, exactly as `components/tutorials/__tests__/contrast.test.ts` does it: the point is to
 * catch a class string moving to a shade that fails, which reading the shade back from the class
 * string could never do.
 */
const TAILWIND: Record<string, string> = {
  "emerald-100": "#d1fae5",
  "emerald-300": "#6ee7b7",
  "emerald-500": "#10b981",
  "emerald-700": "#047857",
  "amber-100": "#fef3c7",
  "amber-300": "#fcd34d",
  "amber-500": "#f59e0b",
  "amber-700": "#b45309",
  "red-100": "#fee2e2",
  "red-300": "#fca5a5",
  "red-500": "#ef4444",
  "red-700": "#b91c1c",
  "gray-100": "#f3f4f6",
  "gray-300": "#d1d5db",
  "gray-500": "#6b7280",
  "gray-700": "#374151",
}

/** `bg-emerald-500/10` -> { shade: "emerald-500", alpha: 0.1 }. Alpha defaults to opaque. */
function parseUtility(token: string, prefix: string): { shade: string; alpha: number } | null {
  if (!token.startsWith(prefix)) return null
  const [shade, alpha] = token.slice(prefix.length).split("/")
  if (!shade || !TAILWIND[shade]) return null
  return { shade, alpha: alpha === undefined ? 1 : Number(alpha) / 100 }
}

/**
 * What a difficulty class string actually paints in LIGHT mode over a given surface: the `dark:`
 * prefixed halves are dropped, since those are the ones light mode never applies.
 */
function lightModeRatio(classes: string, surface: string): number {
  const tokens = classes.split(/\s+/).filter((token) => !token.startsWith("dark:"))
  const bg = tokens.map((t) => parseUtility(t, "bg-")).find(Boolean)
  const fg = tokens.map((t) => parseUtility(t, "text-")).find(Boolean)
  if (!fg) throw new Error(`no light-mode text colour in "${classes}"`)
  const painted = bg ? composite(TAILWIND[bg.shade]!, bg.alpha, surface) : surface
  return contrastRatio(TAILWIND[fg.shade]!, painted)
}

describe("DSA pattern card surface", () => {
  it("measures why the old slab failed, so the fix is anchored to a number", () => {
    // What `bg-slate-900/60` actually painted over the card in light mode.
    const slab = composite(SLATE_900, 0.6, LIGHT.card)
    expect(slab).toBe("#6f747f")
    expect(contrastRatio(LIGHT.foreground, slab)).toBeLessThan(AA_NORMAL)
    expect(contrastRatio(LIGHT.mutedForeground, slab)).toBeLessThan(AA_NORMAL)
  })

  it("clears AA for both text roles on the untinted card the primitive supplies", () => {
    expect(contrastRatio(LIGHT.foreground, LIGHT.card)).toBeGreaterThanOrEqual(AA_NORMAL)
    expect(contrastRatio(LIGHT.mutedForeground, LIGHT.card)).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

/**
 * The foreground half. These assertions are what a background-only rule cannot express: the pills
 * sit ON the card, so removing the card's dark slab is precisely what put them under test.
 */
describe("DSA pattern card difficulty pills", () => {
  /**
   * The variant is read out of the component rather than hardcoded here, so this measures what the
   * card actually renders. Flipping it back to `softBadge` re-breaks the assertion below rather than
   * quietly passing against a variant name this file happens to name.
   */
  const variantMatch = /difficultyColorClass\([\w.]+,\s*"(\w+)"\)/.exec(PATTERN_BROWSER_SOURCE)

  it("routes its badges through the shared difficulty table", () => {
    expect(variantMatch, `no difficultyColorClass(...) call found in ${PATTERN_BROWSER}`).not.toBe(
      null
    )
  })

  it("clears AA in light mode for every difficulty, on the card the pills sit on", () => {
    const variant = variantMatch![1]!
    for (const difficulty of DIFFICULTIES) {
      const classes = difficultyColorClass(difficulty, variant as never)
      const ratio = lightModeRatio(classes, LIGHT.card)
      expect(
        ratio,
        `${difficulty} pill (${variant}: "${classes}") on the light card`
      ).toBeGreaterThanOrEqual(AA_NORMAL)
    }
  })

  /**
   * Guards the guard. If `softBadge` also passed the assertion above, that assertion would prove
   * nothing about the variant swap that fixed this.
   */
  it("would fail on the dark-surface variant the card used to rely on the slab for", () => {
    for (const difficulty of DIFFICULTIES) {
      const ratio = lightModeRatio(difficultyColorClass(difficulty, "softBadge"), LIGHT.card)
      expect(ratio).toBeLessThan(2)
    }
  })
})

/**
 * File-scoped, not surface-wide, and deliberately so. There are ~85 unpaired dark-only foreground
 * utilities across 13 other files under `components/interview`, all of them pre-existing. Widening
 * this rule to the whole surface would fail on work this change never touched, which makes a guard
 * into noise; converting all of them is a separate sweep with its own verification. This file is the
 * one whose surface just changed from a dark slab to `bg-card`, so it is the one held to the rule.
 */
describe("PatternBrowser foreground colours", () => {
  const DARK_ONLY_FOREGROUND =
    /(?<!dark:)\btext-(?:slate|gray|zinc|neutral|stone|emerald|amber|red|green|rose|sky|cyan|blue|indigo|violet|purple|lime|teal|yellow|orange|pink)-(?:200|300|400)\b/g

  it("names no dark-only text colour without a light-mode counterpart", () => {
    const offenders = [...stripComments(PATTERN_BROWSER_SOURCE).matchAll(DARK_ONLY_FOREGROUND)].map(
      (match) => match[0]
    )
    expect(offenders).toEqual([])
  })
})

/**
 * Source rule. Tailwind's 700-900 steps of the neutral ramps are dark in BOTH themes, so a component
 * that names one as a background has stopped being theme-aware whatever the alpha. `bg-card`,
 * `bg-muted` and `bg-background` are the tokens that exist for this.
 */
const ROOTS = ["components/interview", "app/interview"]

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__") continue
      out.push(...walk(path))
    } else if (path.endsWith(".tsx")) {
      out.push(path)
    }
  }
  return out
}

const FILES = ROOTS.flatMap((root) => walk(join(process.cwd(), root))).map((absolute) => ({
  path: absolute.replace(process.cwd() + "/", ""),
  source: readFileSync(absolute, "utf8"),
}))

/** `bg-slate-800`, `bg-zinc-900/60`, `bg-gray-700`, and so on. Comments are stripped before matching. */
const DARK_LITERAL_SURFACE = /\bbg-(?:slate|gray|zinc|neutral|stone)-(?:700|800|900|950)\b/g

/**
 * Block comments and line comments. The line-comment arm requires the `//` not be preceded by a
 * colon, so a `https://` inside a string survives instead of truncating the rest of that line.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("interview surface backgrounds", () => {
  it("has files to scan", () => {
    expect(FILES.length).toBeGreaterThan(5)
  })

  it("paints no dark literal background under theme-token text", () => {
    const offenders = FILES.flatMap(({ path, source }) =>
      [...stripComments(source).matchAll(DARK_LITERAL_SURFACE)].map(
        (match) => `${path}: ${match[0]}`
      )
    )
    expect(offenders).toEqual([])
  })
})
