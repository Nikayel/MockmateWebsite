/**
 * WCAG AA guard for the /learn colour pairs.
 *
 * Light mode is not hypothetical: `defaultTheme="dark"`, but ThemeToggle is mounted on
 * every lesson player (LessonPlayer, SqlLessonPlayer, SystemDesignLessonPlayer,
 * LevelPathView, LearnPathTopBar), so a learner is one click from it. Everything here
 * was measured failing in light mode at some point — the difficulty badge at 3.00:1, the
 * notice at 4.41:1, the accent CTA at 3.97:1 — and none of it was visible to any test.
 *
 * A ratio is not a matter of taste, so it can simply be asserted. Colours are duplicated
 * from Tailwind/globals.css by necessity: the point is to catch a class string changing
 * to a shade that fails, which reading the shade back from the class string could not do.
 */
import { describe, expect, it } from "vitest"

type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const h = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

function channelLuminance(value: number): number {
  const srgb = value / 255
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
}

function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(fg: string, bg: string): number {
  const [lighter, darker] = [relativeLuminance(parseHex(fg)), relativeLuminance(parseHex(bg))].sort(
    (a, b) => b - a
  )
  return (lighter + 0.05) / (darker + 0.05)
}

/** What a `bg-<colour>/<alpha>` tint actually paints over a surface. */
export function composite(fg: string, alpha: number, bg: string): string {
  const [fr, fg_, fb] = parseHex(fg)
  const [br, bg_, bb] = parseHex(bg)
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha))
  return (
    "#" +
    [mix(fr, br), mix(fg_, bg_), mix(fb, bb)].map((c) => c.toString(16).padStart(2, "0")).join("")
  )
}

const AA_NORMAL = 4.5

const SURFACE = {
  lightBg: "#f9f8f5",
  lightCard: "#ffffff",
  darkBg: "#1a1917",
  darkCard: "#232220",
}

const TAILWIND = {
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "amber-800": "#92400e",
  "emerald-400": "#34d399",
  "emerald-800": "#065f46",
  "rose-400": "#fb7185",
  "rose-800": "#9f1239",
  "orange-300": "#fdba74",
  "orange-500": "#f97316",
  "orange-800": "#9a3412",
}

/** globals.css --accent / --accent-strong, per theme. */
const ACCENT = { light: "#bd6a39", dark: "#d0824f" }
const ACCENT_STRONG = { light: "#a3522a", dark: "#d0824f" }

/** globals.css --muted-foreground, per theme. */
const MUTED_FOREGROUND = { light: "#6c685f", dark: "#b3afa4" }

/** `text-<colour>/<alpha>` — Tailwind fades the TEXT, so composite it over its surface. */
function fadedText(colour: string, alpha: number, surface: string): string {
  return composite(colour, alpha, surface)
}

describe("learn UI colour contrast (WCAG AA, normal text)", () => {
  /**
   * A NULL cell is not decoration — on a course that teaches NULL semantics it is often the
   * answer to "why is this row wrong". Fading it is the obvious move and it is the wrong
   * one: DiagramTable's `text-muted-foreground/60` measured 2.41:1 light / 3.71:1 dark.
   */
  describe("table cells — a NULL must stay readable", () => {
    it("renders NULL at a legible muted, not a faded one", () => {
      expect(contrastRatio(MUTED_FOREGROUND.light, SURFACE.lightBg)).toBeGreaterThanOrEqual(
        AA_NORMAL
      )
      expect(contrastRatio(MUTED_FOREGROUND.dark, SURFACE.darkBg)).toBeGreaterThanOrEqual(AA_NORMAL)
    })

    it("rejects the /60 fade it used to use, in both themes", () => {
      const light = fadedText(MUTED_FOREGROUND.light, 0.6, SURFACE.lightBg)
      const dark = fadedText(MUTED_FOREGROUND.dark, 0.6, SURFACE.darkBg)
      expect(contrastRatio(light, SURFACE.lightBg)).toBeLessThan(AA_NORMAL)
      expect(contrastRatio(dark, SURFACE.darkBg)).toBeLessThan(AA_NORMAL)
    })
  })

  describe("LessonNotice — the shared alert banner", () => {
    it("is readable in light mode over its own tint", () => {
      const tint = composite(TAILWIND["orange-500"], 0.1, SURFACE.lightBg)
      expect(contrastRatio(TAILWIND["orange-800"], tint)).toBeGreaterThanOrEqual(AA_NORMAL)
    })

    it("is readable in dark mode over its own tint", () => {
      const tint = composite(TAILWIND["orange-500"], 0.1, SURFACE.darkBg)
      expect(contrastRatio(TAILWIND["orange-300"], tint)).toBeGreaterThanOrEqual(AA_NORMAL)
    })

    it("rejects the amber it replaced, which is why this file exists", () => {
      const tint = composite(TAILWIND["amber-500"], 0.1, SURFACE.lightBg)
      // text-amber-700 measured 4.41:1 here — under the bar, and shipped for months.
      expect(contrastRatio("#b45309", tint)).toBeLessThan(AA_NORMAL)
    })
  })

  describe("difficulty badge — keeps its traffic-light hues, at readable shades", () => {
    const light: Array<[string, string]> = [
      ["easy", TAILWIND["emerald-800"]],
      ["medium", TAILWIND["amber-800"]],
      ["hard", TAILWIND["rose-800"]],
    ]
    for (const [level, colour] of light) {
      it(`${level} is readable on the light page`, () => {
        expect(contrastRatio(colour, SURFACE.lightBg)).toBeGreaterThanOrEqual(AA_NORMAL)
      })
      it(`${level} is readable on a light card`, () => {
        expect(contrastRatio(colour, SURFACE.lightCard)).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }

    const dark: Array<[string, string]> = [
      ["easy", TAILWIND["emerald-400"]],
      ["medium", TAILWIND["amber-400"]],
      ["hard", TAILWIND["rose-400"]],
    ]
    for (const [level, colour] of dark) {
      it(`${level} is readable on a dark card`, () => {
        expect(contrastRatio(colour, SURFACE.darkCard)).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  })

  describe("accent as text", () => {
    it("--accent alone still fails in light mode — the reason --accent-strong exists", () => {
      // Documents the constraint rather than asserting a bug: `text-accent` at normal size
      // is unreadable on a light surface, so accent-coloured TEXT must use the strong token.
      expect(contrastRatio(ACCENT.light, SURFACE.lightCard)).toBeLessThan(AA_NORMAL)
    })

    it("--accent-strong is readable on both light surfaces", () => {
      expect(contrastRatio(ACCENT_STRONG.light, SURFACE.lightBg)).toBeGreaterThanOrEqual(AA_NORMAL)
      expect(contrastRatio(ACCENT_STRONG.light, SURFACE.lightCard)).toBeGreaterThanOrEqual(
        AA_NORMAL
      )
    })

    it("--accent-strong is readable on the accent tint the Up next pill uses", () => {
      const lightTint = composite(ACCENT.light, 0.1, SURFACE.lightCard)
      const darkTint = composite(ACCENT.dark, 0.1, SURFACE.darkCard)
      expect(contrastRatio(ACCENT_STRONG.light, lightTint)).toBeGreaterThanOrEqual(AA_NORMAL)
      expect(contrastRatio(ACCENT_STRONG.dark, darkTint)).toBeGreaterThanOrEqual(AA_NORMAL)
    })
  })
})
