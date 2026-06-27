#!/usr/bin/env node
/**
 * LPUI-103 — Theme token guard.
 *
 * Flags hardcoded color classes/values on the marketing surfaces that are
 * required to read in BOTH light and dark mode. These pin a surface to a
 * single theme and reintroduce the white-on-white / invisible-text bugs the
 * landing-page-ui-fix cycle removed.
 *
 * Report-only by default (exit 0) so it can be wired into CI as a warning
 * first. Pass --strict to make it fail the build once the baseline is clean.
 *
 *   node scripts/check-theme-tokens.mjs           # warn, exit 0
 *   node scripts/check-theme-tokens.mjs --strict  # fail on any violation
 *
 * The intentional dark "tiles" are deliberately NOT scanned (see the
 * dark-tile manifest in docs/landing-page-ui-fix.md §2):
 *   - components/hero-section.tsx        (the single dark anchor)
 *   - components/comparison-section.tsx  (full-bleed dark closer tile; self-
 *     declares "not theme-reactive by design". Whether to convert it to a
 *     theme-aware section is the open LPUI-203 decision — until then it is
 *     an intentional tile, not scanned.)
 * Line-level exceptions live in ALLOW below.
 */
import { readFileSync } from "node:fs"

/** Theme-aware marketing surfaces that must work in light AND dark. */
const SURFACES = [
  "components/features-section.tsx",
  "components/metrics-marketing-section.tsx",
  "components/problem-teaser.tsx",
  "components/ai-assisted-section.tsx",
  "components/footer.tsx",
  "components/relevance-gap-section.tsx",
  "components/company-roadmap-section.tsx",
]

/** Hardcoded classes/values that lock a surface to one theme. */
const PATTERNS = [
  { re: /\btext-white\b/, hint: "use text-foreground / text-card-foreground" },
  { re: /\btext-black\b/, hint: "use text-foreground" },
  { re: /\btext-(?:zinc|gray|slate|neutral|stone)-\d/, hint: "use text-muted-foreground / text-foreground" },
  { re: /\bbg-(?:zinc|gray|slate|neutral|stone)-(?:8|9)\d/, hint: "use bg-card / bg-muted / bg-background" },
  { re: /\bbg-black\b/, hint: "use bg-background, or allow-list an intentional scrim" },
  { re: /\bborder-white\//, hint: "use border-border" },
  { re: /#(?:121110|0a0a0a|1a1917|232220|ece9e1|c5c1b6)\b/i, hint: "use a semantic token (var) instead of a theme-locked hex" },
]

/** Documented intentional exceptions (substring match against the line). */
const ALLOW = [
  "bg-black/55", // ai-assisted: modal scrim — intentional dim in both themes
]

let violations = 0
const strict = process.argv.includes("--strict")

for (const file of SURFACES) {
  let src
  try {
    src = readFileSync(file, "utf8")
  } catch {
    continue // surface may not exist yet; skip silently
  }
  src.split("\n").forEach((line, i) => {
    if (ALLOW.some((a) => line.includes(a))) return
    for (const { re, hint } of PATTERNS) {
      if (re.test(line)) {
        violations++
        console.log(`  ${file}:${i + 1}  ${re.source}\n      → ${hint}`)
        console.log(`      ${line.trim().slice(0, 100)}`)
        break
      }
    }
  })
}

if (violations === 0) {
  console.log("✓ theme-token guard: no hardcoded theme-locked colors on marketing surfaces")
  process.exit(0)
}

console.log(`\n✗ theme-token guard: ${violations} hardcoded color(s) on theme-aware surfaces`)
console.log("  Fix with semantic tokens, or add a documented exception to scripts/check-theme-tokens.mjs")
process.exit(strict ? 1 : 0)
