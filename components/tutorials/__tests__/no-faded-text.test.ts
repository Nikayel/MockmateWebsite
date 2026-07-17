/**
 * A structural guard for the class of bug the audit council kept finding: text dimmed with
 * an alpha until it fell under WCAG AA.
 *
 * `contrast.test.ts` asserts specific PAIRS, which only protects pairs someone thought to
 * list. This asserts a RULE over the whole learn surface, so the next `text-muted-foreground/60`
 * fails here rather than in a future audit. Ten separate findings shared this one shape:
 * the diagram's own subject, the join NULL, the placeholder in an empty field, the unreached
 * phase chips, the code lines not yet stepped to.
 *
 * The measured reality (see contrast.test.ts for the arithmetic):
 *   text-muted-foreground       5.23:1 light / 8.02:1 dark   AA
 *   text-muted-foreground/80    3.47:1 light                 fails
 *   text-muted-foreground/70    2.89:1 light                 fails
 *   text-muted-foreground/60    2.41:1 light                 fails
 *   text-muted-foreground/50    2.07:1 light                 fails
 *   text-muted-foreground/40    1.74:1 light                 fails
 * Every alpha step fails in light mode. There is no safe fade of this token for text.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

const ROOTS = ["components/tutorials", "app/learn"]

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

/**
 * An alpha-faded muted-foreground, with enough of the surrounding class string to tell what
 * it is styling.
 */
const FADED =
  /(?:className|class)=(?:"([^"]*text-muted-foreground\/\d+[^"]*)"|\{[^}]*?"([^"]*text-muted-foreground\/\d+[^"]*)")/g

/**
 * True when the faded class is painting an ICON rather than text.
 *
 * Lucide icons in this codebase always carry an explicit box (`h-4 w-4`, `size-3`), and
 * text spans never do. Icons are exempt because WCAG's 4.5:1 text rule does not reach them,
 * and every one of these is decorative (`aria-hidden`) with a real text label beside it.
 * The heuristic is deliberately narrow: a false "icon" verdict silently un-guards a real
 * string, so it demands the sizing be right there in the same class attribute.
 */
function looksLikeIcon(classString: string): boolean {
  return /\b(?:h-\d|h-\[|size-\d)/.test(classString) && /\b(?:w-\d|w-\[|size-\d)/.test(classString)
}

/** Borders and rings are non-text: `border-muted-foreground/40` is a 1px rule, not a word. */
function isNonTextUtility(classString: string, match: string): boolean {
  return new RegExp(
    `(?:border|ring|bg|divide|outline|from|via|to)-${match.replace("/", "\\/")}`
  ).test(classString)
}

describe("no alpha-faded text in the learn surface", () => {
  it("scanned a real number of files", () => {
    // Guards the guard: a broken walk() would make every assertion below vacuously pass.
    expect(FILES.length).toBeGreaterThan(30)
  })

  it("never fades text-muted-foreground, at any alpha", () => {
    const offenders: string[] = []

    for (const { path, source } of FILES) {
      for (const match of source.matchAll(FADED)) {
        const classString = match[1] ?? match[2] ?? ""
        const faded = classString.match(/text-muted-foreground\/\d+/)?.[0] ?? ""
        if (looksLikeIcon(classString)) continue
        if (isNonTextUtility(classString, faded)) continue
        const line = source.slice(0, match.index).split("\n").length
        offenders.push(`${path}:${line}  ${faded}`)
      }
    }

    // Every alpha of this token fails AA in light mode, so the fix is always the same:
    // drop the alpha. If a genuinely dimmer step is ever needed, add an AA-safe token —
    // do not reach back for the alpha.
    expect(offenders).toEqual([])
  })
})
