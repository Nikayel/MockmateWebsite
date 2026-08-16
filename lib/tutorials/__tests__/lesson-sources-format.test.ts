/**
 * Format guard for the `**Sources:**` block that lesson teach prose may carry.
 *
 * The corpus contains **zero** external markdown links today, so this file lands before the
 * sourcing wave rather than after it, per CLAUDE.md's "build the verifier before the sweep". Every
 * corpus assertion below therefore passes vacuously right now, and that is the point: the wave adds
 * 53 blocks written by concurrent agents against one written pattern, and the only thing that can
 * keep 53 hand-authored citation lines identical in shape is a test that fails on the first drift.
 *
 * ## The one legal shape
 *
 * ```
 * **Sources:** [Label](https://host/path) · [Label](https://host/path) · Book Title, ch. N
 * ```
 *
 * Last non-empty line of `teach.markdown`, its own paragraph, flush left, 2 to 4 items joined by
 * `" · "`, at least one of them a link, `https` only, no em dash, no trailing period. No heading,
 * no `Further reading`, no access dates. The whole citation apparatus is the bold word and the dots.
 *
 * ## Why the fence exclusion is a precondition, not an optimization
 *
 * {@link ANNOUNCER} is the net that catches a drifted marker (`## Sources`, `**Source:**`,
 * `References:`). Run over all live catalog entries it matches exactly two lines today, both the
 * YAML key `source:` inside Argo CD `Application` manifests in a fenced block in
 * `sd-l9-platform-gitops`. Scanned without the fence mask this guard fails on the corpus the day it
 * lands. So the fence rule and the marker rule ship together, and case 14 of the rejection block
 * pins that exact manifest rather than trusting the argument.
 *
 * ## Properties, never counts
 *
 * A concurrent authoring loop commits lessons to `main`, so this walks `listAllCatalogEntries()` and
 * asserts properties, exactly as `lesson-content-hygiene.test.ts` does. The only numeric assertions
 * are a loose corpus floor (so a broken import cannot make everything pass over an empty array) and
 * the coverage floor in the last test, which is raised once the wave lands.
 *
 * Scope is `teach.markdown` only. Apply and Practice prompts never carry sources.
 */
import { describe, expect, it } from "vitest"

import { listAllCatalogEntries, COURSE_IDS, type CatalogEntry } from "../course-catalog"

const ENTRIES = listAllCatalogEntries()

/** The one legal marker. Bold label, colon INSIDE the bold, exactly one trailing space. */
const MARKER = "**Sources:** "

/** The block on its own line. Group 1 is the item list. */
const SOURCES_LINE = /^\*\*Sources:\*\* (.+)$/

/** Items are joined by exactly this: space, U+00B7 MIDDLE DOT, space. */
const SEPARATOR = " · "

/**
 * A link item. https only; no whitespace, parens, angle brackets or quotes in the URL
 * (parens would break markdown link parsing). Label 1-60 chars, no nested brackets.
 */
const LINK_ITEM = /^\[([^\][\n]{1,60})\]\((https:\/\/[^\s()<>"']+)\)$/

/** A book item: "Title, ch. N" or "Title, ch. N-M". No URL, no brackets, no parens. */
const BOOK_ITEM = /^[A-Z][^\][()·\n]{2,80}, ch\. \d{1,2}(?:-\d{1,2})?$/

/**
 * Link shape without the rules, so an item that is nearly a link can be reported against the rule it
 * actually broke. `[A](http://a.test/)` fails {@link LINK_ITEM} on the scheme; without this, rule H
 * would have no URL to inspect and the only message would be the generic "matches neither grammar".
 */
const LOOSE_LINK_ITEM = /^\[([^\][\n]*)\]\(([^)\s]*)\)$/

/**
 * The NET for a sources announcement in any form. A line matching this that is not the block itself
 * means the marker text has drifted.
 *
 * The trailing lookahead is load-bearing: without it this fires on the existing prose string
 * "**Source of truth:** an OpenAPI 3 document" in system-design/curriculum/level1.ts. Requiring
 * end-of-line, a link, or a URL immediately after the label excludes that. Case 13 pins it.
 */
const ANNOUNCER =
  /^\s*(?:#{1,6}\s+)?(?:\*\*|__)?\s*(?:sources?|further reading|references?|bibliography|citations?)\s*:?\s*(?:\*\*|__)?\s*(?=$|\[|https?:)/i

/** Banned in learner-facing prose (CLAUDE.md). Scoped here to the block; see rule J. */
const EM_DASH = /—/

/** Anything that makes a URL a tracked or unstable link. */
const TRACKING_PARAM = /[?&](?:utm_[a-z_]+|ref|referrer|fbclid|gclid|mc_cid|mc_eid|igshid|source)=/i

/** Must mirror PLACEHOLDER_PATTERNS in lesson-content-hygiene.test.ts, case-sensitively. */
const HYGIENE_TOKEN = /\b(?:TODO|FIXME|TBD|XXX|PLACEHOLDER)\b/

/** A fence, seen the way remark sees one. Copied from predict-check-integrity.test.ts. */
const FENCE = /```([a-zA-Z0-9_-]*)[^\n]*\n([\s\S]*?)\n```/g

/**
 * Coverage floor, rule L.
 *
 * Zero until the sourcing wave lands, then raised to the shipped count in the same commit that
 * finishes it. Without a floor every assertion above passes forever after someone deletes every
 * block, which is the failure a format guard is least able to notice on its own.
 */
const SOURCED_LESSON_FLOOR = 0

/** One rule breach. The letter is the rule id from the verifier spec, so failures name their rule. */
interface Violation {
  rule: string
  message: string
}

/** A human-readable locator for an offender, since ids alone do not say where to look. */
function locate(entry: CatalogEntry): string {
  return `${entry.courseId}/${entry.level.slug}/${entry.lesson.id}`
}

/** Character spans covered by fenced blocks, opening and closing delimiters included. */
function fenceSpans(markdown: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = []
  FENCE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FENCE.exec(markdown)) !== null) {
    spans.push({ start: match.index, end: match.index + match[0].length })
  }
  return spans
}

/**
 * Rule E, as a mask: one entry per line, true when that line sits inside a fence.
 *
 * A "sources" line inside a `csdiagram` or `cswidget` JSON body, or a `source:` key in a fenced YAML
 * manifest, is a different thing and must be counted neither as a block nor as a violation.
 */
function fenceMask(markdown: string): boolean[] {
  const spans = fenceSpans(markdown)
  const mask: boolean[] = []
  let offset = 0
  for (const line of markdown.split("\n")) {
    mask.push(spans.some((span) => offset >= span.start && offset < span.end))
    offset += line.length + 1
  }
  return mask
}

/** The sources block of one teach body, or undefined. Trim-tolerant so rule F can see indentation. */
function sourcesBlockOf(markdown: string): string | undefined {
  const mask = fenceMask(markdown)
  const found = markdown
    .split("\n")
    .find((line, index) => !mask[index] && line.trimStart().startsWith(MARKER))
  return found?.trimStart()
}

/**
 * Every way one teach body can break the pattern, tagged with the rule it broke.
 *
 * Rule B is tested against the TRIMMED line so that an indented but otherwise correct block is
 * reported once, by rule F as an indentation defect, rather than twice as a drifted marker as well.
 */
function sourcesViolations(where: string, markdown: string): Violation[] {
  const violations: Violation[] = []
  const lines = markdown.split("\n")
  const mask = fenceMask(markdown)

  const blockIndexes: number[] = []
  lines.forEach((line, index) => {
    if (mask[index]) return
    const isBlock = line.trimStart().startsWith(MARKER)
    if (isBlock) blockIndexes.push(index)
    else if (ANNOUNCER.test(line)) {
      violations.push({
        rule: "B",
        message: `${where}: line ${index + 1} announces sources as "${line.trim()}" instead of "${MARKER.trimEnd()} "`,
      })
    }
  })

  if (blockIndexes.length > 1) {
    violations.push({
      rule: "C",
      message: `${where}: ${blockIndexes.length} sources blocks, at most one is allowed`,
    })
  }
  const index = blockIndexes[0]
  if (index === undefined) return violations
  const line = lines[index]

  const lastNonEmpty = lines.reduce(
    (last, candidate, at) => (candidate.trim() === "" ? last : at),
    -1
  )
  if (index !== lastNonEmpty) {
    violations.push({
      rule: "D",
      message: `${where}: the sources block is on line ${index + 1}, not the last non-empty line (${lastNonEmpty + 1})`,
    })
  }
  if (index === 0 || lines[index - 1].trim() !== "") {
    violations.push({
      rule: "D",
      message: `${where}: the sources block is glued to the line above instead of being its own paragraph`,
    })
  }

  if (line !== line.trimStart()) {
    violations.push({
      rule: "F",
      message: `${where}: the sources block is indented; it must sit at column 0`,
    })
  }

  if (EM_DASH.test(line)) {
    violations.push({ rule: "J", message: `${where}: the sources block contains an em dash` })
  }

  const parsed = SOURCES_LINE.exec(line.trimStart())
  if (!parsed) {
    violations.push({ rule: "G", message: `${where}: the sources block lists no items` })
    return violations
  }

  const items = parsed[1].split(SEPARATOR)
  if (items.length < 2 || items.length > 4) {
    violations.push({
      rule: "G",
      message: `${where}: ${items.length} item(s) in the sources block, the range is 2 to 4`,
    })
  }
  for (const item of items) {
    if (item.length === 0 || item !== item.trim()) {
      violations.push({
        rule: "G",
        message: `${where}: item "${item}" is empty or padded, so the separator is not exactly " · "`,
      })
    } else if (!LINK_ITEM.test(item) && !BOOK_ITEM.test(item)) {
      violations.push({
        rule: "G",
        message: `${where}: item "${item}" is neither [Label](https://...) nor "Title, ch. N"`,
      })
    }
  }
  if (!items.some((item) => LINK_ITEM.test(item))) {
    violations.push({
      rule: "G",
      message: `${where}: no item is a link, so there is nothing a reader can follow`,
    })
  }

  const urls: string[] = []
  for (const item of items) {
    const loose = LOOSE_LINK_ITEM.exec(item)
    if (!loose) continue
    const [, label, url] = loose
    if (!url.startsWith("https://")) {
      violations.push({ rule: "H", message: `${where}: "${url}" is not https` })
    }
    if (TRACKING_PARAM.test(url)) {
      violations.push({ rule: "H", message: `${where}: "${url}" carries a tracking parameter` })
    }
    if (HYGIENE_TOKEN.test(url)) {
      violations.push({ rule: "H", message: `${where}: "${url}" contains a placeholder token` })
    }
    if (urls.includes(url)) {
      violations.push({ rule: "H", message: `${where}: "${url}" is cited twice in one block` })
    }
    urls.push(url)

    if (label.trim().length === 0) {
      violations.push({ rule: "I", message: `${where}: a link label is blank` })
    }
    if (label.trim().startsWith("http")) {
      violations.push({
        rule: "I",
        message: `${where}: link label "${label}" is a bare URL, not a description of the destination`,
      })
    }
    if (label.includes("·")) {
      violations.push({
        rule: "I",
        message: `${where}: link label "${label}" contains the item separator`,
      })
    }
  }

  return violations
}

/** Rule K, as a pure function so the corpus test and the seeded proof share one implementation. */
function duplicateBlocks(bodies: Array<{ where: string; markdown: string }>): string[] {
  const seen = new Map<string, string>()
  const collisions: string[] = []
  for (const { where, markdown } of bodies) {
    const block = sourcesBlockOf(markdown)
    if (!block) continue
    const previous = seen.get(block)
    if (previous) collisions.push(`${where}: sources block is byte-identical to ${previous}`)
    else seen.set(block, where)
  }
  return collisions
}

/** The rule letters a body broke, deduplicated and sorted. What the seeded cases assert against. */
function rulesBroken(violations: Violation[]): string[] {
  return [...new Set(violations.map((violation) => violation.rule))].sort()
}

describe("lesson sources block format", () => {
  it("walks a real, non-empty corpus covering every course", () => {
    // A loose floor, not a count. Its only job is to fail if a registry import breaks and the walk
    // silently yields nothing, which would make every assertion below pass over an empty array.
    expect(ENTRIES.length).toBeGreaterThan(300)
    expect([...new Set(ENTRIES.map((entry) => entry.courseId))].sort()).toEqual(
      [...COURSE_IDS].sort()
    )
  })

  it("announces sources with the one legal marker and nothing else", () => {
    // Rules B, C, D, F, G, H, I and J at once: one walk, one list, every failure naming its rule.
    const offenders = ENTRIES.flatMap((entry) =>
      sourcesViolations(locate(entry), entry.lesson.teach.markdown).map(
        (violation) => `[${violation.rule}] ${violation.message}`
      )
    )
    expect(offenders).toEqual([])
  })

  it("never ships the same sources block on two lessons", () => {
    // Rule K. An agent pasting one block across a level instead of picking per-lesson sources is
    // the failure this catches. Two lessons that genuinely warrant identical sources is a signal
    // the two lessons overlap, which is worth surfacing rather than tolerating.
    expect(
      duplicateBlocks(
        ENTRIES.map((entry) => ({
          where: locate(entry),
          markdown: entry.lesson.teach.markdown,
        }))
      )
    ).toEqual([])
  })

  it("keeps a coverage floor, so the guard cannot survive every block being deleted", () => {
    // Rule L. Zero today because the corpus has no blocks yet; raised to the shipped count by the
    // commit that finishes the sourcing wave. Do not delete this: a format guard over zero blocks
    // is indistinguishable from a format guard that has been switched off.
    const withSources = ENTRIES.filter((entry) => sourcesBlockOf(entry.lesson.teach.markdown))
    expect(withSources.length).toBeGreaterThanOrEqual(SOURCED_LESSON_FLOOR)
  })
})

describe("the rule rejects what it is meant to reject", () => {
  // Without this block every assertion above passes on a corpus with zero blocks and would keep
  // passing with the detector inverted, which is exactly how a guard rots into decoration. Cases 1
  // to 11 and 15 must reject; 12 to 14 must pass clean.
  const WELL_FORMED =
    "**Sources:** [Kafka design internals](https://kafka.apache.org/documentation/#design) · [Log compaction](https://kafka.apache.org/documentation/#compaction) · Designing Data-Intensive Applications, ch. 11"

  /** A minimal teach body whose last non-empty line is `block`, preceded by its own blank line. */
  function seeded(block: string): string {
    return `## Leases\n\nA lease is a bet that a holder which has gone quiet is dead, and a pause has no bound.\n\n${block}\n`
  }

  function rulesFor(block: string): string[] {
    return rulesBroken(sourcesViolations("seeded", seeded(block)))
  }

  it("passes a well-formed block", () => {
    expect(rulesFor(WELL_FORMED)).toEqual([])
  })

  it("1. rejects a `## Sources` heading", () => {
    expect(rulesFor("## Sources")).toEqual(["B"])
  })

  it("2. rejects `**Further reading:**`", () => {
    expect(rulesFor("**Further reading:** [x](https://a.test/)")).toEqual(["B"])
  })

  it("3. rejects a block with prose after it", () => {
    const body = `## Leases\n\nA lease is a bet that a holder which has gone quiet is dead.\n\n${WELL_FORMED}\n\nOne more paragraph, which should not be here.\n`
    expect(rulesBroken(sourcesViolations("seeded", body))).toEqual(["D"])
  })

  it("4. rejects a single item", () => {
    expect(
      rulesFor("**Sources:** [Kafka](https://kafka.apache.org/documentation/#design)")
    ).toEqual(["G"])
  })

  it("5. rejects five items", () => {
    const five = [
      "[A](https://a.test/)",
      "[B](https://b.test/)",
      "[C](https://c.test/)",
      "[D](https://d.test/)",
      "[E](https://e.test/)",
    ].join(SEPARATOR)
    expect(rulesFor(`${MARKER}${five}`)).toEqual(["G"])
  })

  it("6. rejects an http URL, naming both the grammar and the scheme rule", () => {
    expect(rulesFor(`${MARKER}[A](http://a.test/)${SEPARATOR}[B](https://b.test/)`)).toEqual([
      "G",
      "H",
    ])
  })

  it("7. rejects a hyphen separator", () => {
    expect(rulesFor(`${MARKER}[A](https://a.test/) - [B](https://b.test/)`)).toEqual(["G"])
  })

  it("8. rejects a tracking parameter", () => {
    expect(
      rulesFor(`${MARKER}[A](https://a.test/?utm_source=x)${SEPARATOR}[B](https://b.test/)`)
    ).toEqual(["H"])
  })

  it("9. rejects the same URL cited twice in one block", () => {
    expect(rulesFor(`${MARKER}[A](https://a.test/)${SEPARATOR}[Also A](https://a.test/)`)).toEqual([
      "H",
    ])
  })

  it("10. rejects an em dash", () => {
    expect(
      rulesFor(`${MARKER}[Kafka — design](https://a.test/)${SEPARATOR}[B](https://b.test/)`)
    ).toEqual(["J"])
  })

  it("11. rejects a book citation with no comma and no period", () => {
    expect(
      rulesFor(
        `${MARKER}[A](https://a.test/)${SEPARATOR}Designing Data-Intensive Applications ch 5`
      )
    ).toEqual(["G"])
  })

  it("12. ignores a sources line inside a fence", () => {
    const body = `## Leases\n\nHow the block looks when it is written:\n\n\`\`\`text\n${WELL_FORMED}\n\`\`\`\n`
    expect(rulesBroken(sourcesViolations("seeded", body))).toEqual([])
  })

  it("13. ignores the existing `**Source of truth:**` prose", () => {
    // The real string in system-design/curriculum/level1.ts, and the reason ANNOUNCER carries a
    // lookahead. Pinned here so a future widening of the net cannot break the corpus silently.
    const body = `## Contracts\n\n**Source of truth:** an OpenAPI 3 document that both sides generate from.\n`
    expect(rulesBroken(sourcesViolations("seeded", body))).toEqual([])
  })

  it("14. ignores a `source:` key in a fenced YAML manifest", () => {
    // The real Argo CD manifest in sd-l9-platform-gitops. This is the case that makes the fence
    // mask a precondition of the marker rule rather than an optimization: unfenced, this line
    // matches ANNOUNCER, and the guard would fail on the live corpus the day it landed.
    const body = `## GitOps\n\nA parent Application whose source directory holds child manifests:\n\n\`\`\`yaml\napiVersion: argoproj.io/v1alpha1\nkind: Application\nspec:\n  source:\n    repoURL: https://git.example.com/config.git\n    targetRevision: main\n\`\`\`\n`
    expect(rulesBroken(sourcesViolations("seeded", body))).toEqual([])
  })

  it("15. rejects a bare URL used as its own label, which the item grammar accepts", () => {
    // Not redundant with rule G: this block passes the whole of G, so an implementation that stops
    // at the item grammar looks correct on every other case in this list and ships this one.
    const block = `${MARKER}[https://a.test/](https://a.test/)${SEPARATOR}[B](https://b.test/)`
    expect(rulesFor(block)).toEqual(["I"])
  })

  it("K. rejects one block pasted onto two lessons", () => {
    expect(
      duplicateBlocks([
        { where: "first", markdown: seeded(WELL_FORMED) },
        { where: "second", markdown: seeded(WELL_FORMED) },
      ])
    ).toHaveLength(1)
  })
})
