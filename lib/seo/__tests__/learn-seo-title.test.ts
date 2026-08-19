/**
 * The searcher-facing lesson title, and the rules that keep it worth having.
 *
 * ## What this is guarding
 *
 * A lesson's `<title>` is its curriculum title. That is usually correct, because a lesson is
 * normally named after the thing it teaches. It is wrong where the curriculum needed a name that
 * reads well inside an ordered course and the searcher uses the plain name of the topic, and the
 * gap is expensive. Measured on 2026-08-18: `sd-l7-sli-slo-sla`, titled "SLI / SLO / SLA Hierarchy",
 * was the ranking page for THIRTY distinct query variants ("sli definition", "sli meaning",
 * "sli vs slo", "sla vs slo vs sli", ...) at an average position near 72. Not one of those queries
 * contained the word "Hierarchy".
 *
 * `seoTitle` is the per-lesson override, opt-in and absent on most lessons. Three rules:
 *
 *  1. **Different from the curriculum title.** An override equal to the fallback is a second name
 *     for the same string, and the next author has to diff them to learn it changes nothing.
 *  2. **At most 45 characters**, which is 60 minus the ` | CodeSparring` the root template appends.
 *     Past that, `composeLearnTitle` drops to its `absolute` rung and the page ships without the
 *     brand; past 60 the SERP cuts it. The whole point of the override is to control what the
 *     searcher reads, so it must not be the thing that overflows.
 *  3. **Never contains the brand.** The template adds it exactly once; an override that repeats it
 *     renders "... | CodeSparring | CodeSparring", the defect `learn-metadata.ts` was written to
 *     retire.
 *
 * ## Why the corpus loops and the rejection block both exist
 *
 * The corpus assertions pass trivially on a corpus with no overrides set, and would keep passing
 * with their predicates inverted. The block at the bottom runs the same three predicates against
 * deliberate offenders, so a rule that has never rejected anything cannot masquerade as enforcement.
 * This mirrors `learn-description-budget.test.ts`, for the same reason.
 */
import { describe, expect, it } from "vitest"

import { composeLearnTitle, learnLessonMetadata, lessonSearchTitle } from "../learn-metadata"
import { listAllCatalogEntries } from "@/lib/tutorials/course-catalog"
import { LEARN_COURSE_LABEL } from "@/lib/tutorials/lesson-routes"
import { toPublicLessonPreview, type PublicLessonPreview } from "@/lib/tutorials/public-preview"

const ENTRIES = listAllCatalogEntries()

/** Google shows roughly 60 characters, and the root template spends 15 of them on the brand. */
const BRAND_SUFFIX_LENGTH = " | CodeSparring".length
const SEO_TITLE_MAX = 60 - BRAND_SUFFIX_LENGTH

interface Authored {
  id: string
  title: string
  seoTitle: string
}

const AUTHORED: Authored[] = ENTRIES.flatMap((entry) =>
  entry.lesson.seoTitle
    ? [{ id: entry.lesson.id, title: entry.lesson.title, seoTitle: entry.lesson.seoTitle }]
    : []
)

function overBudget(authored: Authored[]): string[] {
  return authored
    .filter(({ seoTitle }) => seoTitle.length > SEO_TITLE_MAX)
    .map(({ id, seoTitle }) => `${id}: ${seoTitle.length} chars ("${seoTitle}")`)
}

function sameAsTitle(authored: Authored[]): string[] {
  return authored
    .filter(({ title, seoTitle }) => title.trim() === seoTitle.trim())
    .map(({ id, seoTitle }) => `${id}: "${seoTitle}"`)
}

function repeatsBrand(authored: Authored[]): string[] {
  return authored
    .filter(({ seoTitle }) => seoTitle.toLowerCase().includes("codesparring"))
    .map(({ id, seoTitle }) => `${id}: "${seoTitle}"`)
}

function previewWith(overrides: Partial<PublicLessonPreview>): PublicLessonPreview {
  return { ...toPublicLessonPreview(ENTRIES[0]), ...overrides }
}

describe("authored lesson seoTitles fit the SERP", () => {
  it("walks a real, non-empty corpus", () => {
    expect(ENTRIES.length).toBeGreaterThan(300)
  })

  it("is at most 45 characters wherever it is set", () => {
    expect(overBudget(AUTHORED)).toEqual([])
  })

  it("never merely restates the curriculum title", () => {
    expect(sameAsTitle(AUTHORED)).toEqual([])
  })

  it("never carries the brand the template already adds", () => {
    expect(repeatsBrand(AUTHORED)).toEqual([])
  })

  it("never reaches the absolute rung, so the brand always survives", () => {
    for (const { id, seoTitle } of AUTHORED) {
      const composed = composeLearnTitle(seoTitle, "System Design")
      expect(typeof composed, `${id} fell through to title.absolute`).toBe("string")
    }
  })

  it("is what the head actually renders, wherever it is set", () => {
    for (const entry of ENTRIES) {
      if (!entry.lesson.seoTitle) continue
      const preview = toPublicLessonPreview(entry)
      const rendered = learnLessonMetadata(preview).title
      const label = LEARN_COURSE_LABEL[preview.courseId]
      // Whichever rung the ladder picked, the searcher-facing name must be the authored one and
      // the curriculum title must be gone.
      const asString = typeof rendered === "string" ? rendered : String(rendered?.absolute)
      expect(asString, entry.lesson.id).toContain(entry.lesson.seoTitle)
      expect([entry.lesson.seoTitle, `${entry.lesson.seoTitle} · Learn ${label}`]).toContain(
        asString
      )
    }
  })
})

describe("the three rules reject what they are meant to reject", () => {
  const good = "SLI vs SLO vs SLA: Definitions"

  it("accepts a title that follows all three rules", () => {
    const authored = [{ id: "good", title: "SLI / SLO / SLA Hierarchy", seoTitle: good }]
    expect(overBudget(authored)).toEqual([])
    expect(sameAsTitle(authored)).toEqual([])
    expect(repeatsBrand(authored)).toEqual([])
  })

  it("rejects a title that would overflow the SERP", () => {
    const long = "SLI versus SLO versus SLA, With Worked Examples For Interviews"
    expect(long.length).toBeGreaterThan(SEO_TITLE_MAX)
    expect(overBudget([{ id: "long", title: "x", seoTitle: long }])).toHaveLength(1)
  })

  it("rejects an override identical to the curriculum title, ignoring surrounding space", () => {
    expect(sameAsTitle([{ id: "same", title: good, seoTitle: good }])).toHaveLength(1)
    expect(sameAsTitle([{ id: "spaced", title: good, seoTitle: ` ${good} ` }])).toHaveLength(1)
  })

  it("rejects an override that repeats the brand, whatever its casing", () => {
    expect(
      repeatsBrand([{ id: "a", title: "x", seoTitle: `${good} | CodeSparring` }])
    ).toHaveLength(1)
    expect(repeatsBrand([{ id: "b", title: "x", seoTitle: `${good} codesparring` }])).toHaveLength(
      1
    )
  })
})

describe("the lesson search title falls back to the curriculum title", () => {
  it("prefers seoTitle when the lesson has one", () => {
    const preview = previewWith({ seoTitle: good(), title: "A Name Nobody Searches" })
    expect(lessonSearchTitle(preview)).toBe(good())
    expect(learnLessonMetadata(preview).title).toContain(good())
  })

  it("uses the curriculum title when it does not", () => {
    const preview = previewWith({ seoTitle: undefined, title: "Backpressure & Load Shedding" })
    expect(lessonSearchTitle(preview)).toBe("Backpressure & Load Shedding")
  })

  it("leaves the Open Graph title on the curriculum name", () => {
    // A shared link is read by a person deciding whether to open it, not by a ranking algorithm,
    // so the authored name stays the honest label there even when search gets a different one.
    const preview = previewWith({ seoTitle: good(), title: "A Name Nobody Searches" })
    expect(learnLessonMetadata(preview).openGraph?.title).toContain("A Name Nobody Searches")
  })
})

function good(): string {
  return "SLI vs SLO vs SLA: Definitions"
}
