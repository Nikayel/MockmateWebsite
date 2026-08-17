/**
 * WCAG 2.1 contrast arithmetic.
 *
 * Lives here rather than inside one test file because two separate guards now measure colour pairs
 * (`components/tutorials/__tests__/contrast.test.ts` for the /learn surface,
 * `components/interview/__tests__/pattern-card-contrast.test.ts` for the DSA pattern cards) and the
 * maths is not a matter of taste: a ratio is either above the threshold or it is not. Duplicating it
 * would mean two copies of the sRGB transfer function, which is exactly the kind of thing that
 * silently diverges.
 *
 * Colours are passed as hex literals by necessity. The point of these guards is to catch a class
 * string changing to a shade that fails, and reading the shade back from the class string could not
 * do that.
 */

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

/** WCAG 2.1 contrast ratio between two opaque colours, 1..21. */
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

/** WCAG AA for normal-size text. */
export const AA_NORMAL = 4.5
