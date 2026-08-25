import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Guards on the Sparra motion CSS.
 *
 * These exist because of a real, shipped bug: the scoring ring animated to
 * `calc(var(--sparra-ring-len, 207) * 0.05)`. Blink leaves a calc() CONTAINING a
 * var() as an unresolved token and falls back to DISCRETE interpolation, so the
 * ring held EMPTY for the first half of its duration and then snapped to 95%.
 * Measured in real Chromium the whole animation had exactly two distinct computed
 * values. WebKit rendered it correctly, which is how it survived review, and
 * Firefox interpolated it to a full close. Nothing caught it because nothing here
 * had a test at all.
 */

const ROOT = join(__dirname, "..", "..", "..")

const CSS_COPIES = [
  "components/brand/sparra.css",
  "design/brand/animated/sparra.css",
  "public/brand/animated/sparra.css",
]

/** Strip CSS comments, so prose about a retired name is not read as a use of it. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

/** Body of every @keyframes block in a stylesheet, brace-matched. */
function keyframeBodies(css: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = []
  const opener = /@keyframes\s+([\w-]+)\s*\{/g
  let m: RegExpExecArray | null
  while ((m = opener.exec(css))) {
    let depth = 1
    let i = opener.lastIndex
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++
      else if (css[i] === "}") depth--
      i++
    }
    out.push({ name: m[1], body: css.slice(opener.lastIndex, i - 1) })
  }
  return out
}

describe("sparra motion css", () => {
  for (const rel of CSS_COPIES) {
    describe(rel, () => {
      const css = stripComments(readFileSync(join(ROOT, rel), "utf8"))

      it("declares keyframes", () => {
        expect(keyframeBodies(css).length).toBeGreaterThan(0)
      })

      it("never puts var() inside a calc() in a keyframe", () => {
        for (const { name, body } of keyframeBodies(css)) {
          for (const call of body.match(/calc\([^;]*\)/g) ?? []) {
            expect(
              call.includes("var("),
              `@keyframes ${name} animates ${call}. A calc() containing a var() ` +
                `degrades to DISCRETE interpolation in Blink: the property holds, ` +
                `then snaps at 50%. Use a literal.`
            ).toBe(false)
          }
        }
      })

      it("does not reference the retired --sparra-ring-len", () => {
        // It was read in three places and set in none, so every reference had
        // silently been running on its fallback since the day it was written.
        expect(css).not.toContain("--sparra-ring-len")
      })

      it("sweeps the scoring ring between two different literal endpoints", () => {
        const ring = keyframeBodies(css).find((k) => k.name === "sparra-score-ring")
        expect(ring, "sparra-score-ring keyframe is missing").toBeDefined()
        const stops = [...ring!.body.matchAll(/stroke-dashoffset:\s*([\d.]+)\s*;/g)].map((m) =>
          Number(m[1])
        )
        expect(stops.length, "expected literal from/to endpoints").toBe(2)
        expect(stops[0]).toBeGreaterThan(stops[1])
      })
    })
  }

  it("keeps the two zero-JS asset copies byte-identical", () => {
    const design = readFileSync(join(ROOT, "design/brand/animated/sparra.css"), "utf8")
    const pub = readFileSync(join(ROOT, "public/brand/animated/sparra.css"), "utf8")
    expect(pub).toBe(design)
  })

  for (const rel of [
    "public/brand/animated/sparra-scoring.svg",
    "public/brand/animated/sparra-idle.svg",
    "design/brand/animated/sparra-scoring.svg",
    "design/brand/animated/sparra-idle.svg",
  ]) {
    it(`${rel} carries its own <style>`, () => {
      // External CSS never applies inside an <img>. Both of these shipped with
      // animation class names and no stylesheet, so neither had ever moved --
      // and the scoring one rendered a FULL ring, reading as finished.
      const svg = readFileSync(join(ROOT, rel), "utf8")
      expect(svg).toContain("<style>")
      expect(svg).toMatch(/@keyframes/)
    })
  }

  it("starts the zero-JS scoring ring empty rather than full", () => {
    const svg = readFileSync(join(ROOT, "public/brand/animated/sparra-scoring.svg"), "utf8")
    const ring = svg.match(/<circle class="r"[^>]*>/)?.[0] ?? ""
    expect(ring, "ring circle not found").not.toBe("")
    // stroke-dasharray with no offset draws the whole circumference.
    expect(ring).toMatch(/stroke-dashoffset="[\d.]+"/)
  })
})
