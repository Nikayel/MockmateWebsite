/**
 * The searcher-facing lesson description (SEO-02), and the rules it has to obey to be worth having.
 *
 * ## What this is guarding
 *
 * Every Learn lesson's meta description is its `summary`, cut to 155 characters. The summary is
 * authored for someone already inside the course, so the snippet frequently opens with curriculum
 * framing instead of the answer the query asked for. `seoDescription` is the per-lesson override,
 * and it is opt-in: absent on most lessons, set only where there is measured search demand.
 *
 * An optional override needs a floor, or it degrades into a second summary field. Two rules:
 *
 *  1. **110 to 155 characters.** The ceiling is where Google truncates. The floor matters just as
 *     much and is the one authors miss: a 60-character description leaves half the snippet to
 *     Google, which fills it from page text, which is the outcome the field exists to prevent.
 *  2. **Does not open with "In this lesson" or "This lesson".** Those spend the first clause, the
 *     only one a scanning searcher reliably reads, describing the page rather than answering the
 *     question. This is the exact habit the summaries have and the reason SEO-02 exists.
 *
 * ## Why it is a corpus test and passes today with zero values set
 *
 * The plumbing lands before the copy: a later pass authors the values for the top pages by
 * impressions. A test that only ran once content existed would be a test nobody runs during the
 * change that introduces the risk, which is exactly how `supplied` slipped past the sealing test's
 * allowlist (`b9f19500`). So this walks the live corpus and asserts over whatever is set, including
 * nothing, and the two unit tests below pin the fallback behaviour that the 400-odd lessons without
 * a value depend on.
 */
import { describe, expect, it } from "vitest"

import { learnLessonMetadata, lessonMetaDescription } from "../learn-metadata"
import { listAllCatalogEntries } from "@/lib/tutorials/course-catalog"
import { toPublicLessonPreview, type PublicLessonPreview } from "@/lib/tutorials/public-preview"

const ENTRIES = listAllCatalogEntries()

/** Google truncates around here. `truncateForDescription` targets 155. */
const DESCRIPTION_MAX = 155
/** Below this the snippet is mostly Google's text, not ours. */
const DESCRIPTION_MIN = 110

/** Openings that describe the page instead of answering the query. */
const WEAK_OPENINGS = ["in this lesson", "this lesson"]

interface Authored {
  id: string
  description: string
}

const AUTHORED: Authored[] = ENTRIES.flatMap((entry) =>
  entry.lesson.seoDescription
    ? [{ id: entry.lesson.id, description: entry.lesson.seoDescription }]
    : []
)

/**
 * The two rules, as functions.
 *
 * They are extracted rather than inlined into the corpus loops because the corpus is empty of
 * `seoDescription` on the day this ships: the plumbing lands first and a later pass authors the
 * values. A rule that has never been shown to reject anything is not a rule, so the same two
 * functions are exercised against deliberate offenders below.
 */
function outsideBudget(authored: Authored[]): string[] {
  return authored
    .filter(
      ({ description }) =>
        description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX
    )
    .map(({ id, description }) => `${id}: ${description.length} chars ("${description}")`)
}

function weakOpening(authored: Authored[]): string[] {
  return authored
    .filter(({ description }) =>
      WEAK_OPENINGS.some((opening) => description.toLowerCase().startsWith(opening))
    )
    .map(({ id, description }) => `${id}: "${description.slice(0, 60)}"`)
}

/** A minimal preview, so the fallback tests do not depend on any particular lesson's copy. */
function previewWith(overrides: Partial<PublicLessonPreview>): PublicLessonPreview {
  return { ...toPublicLessonPreview(ENTRIES[0]), ...overrides }
}

describe("authored lesson seoDescriptions fit the SERP", () => {
  it("walks a real, non-empty corpus", () => {
    expect(ENTRIES.length).toBeGreaterThan(300)
  })

  it("is between 110 and 155 characters wherever it is set", () => {
    expect(outsideBudget(AUTHORED)).toEqual([])
  })

  it("never opens by describing the lesson", () => {
    expect(weakOpening(AUTHORED)).toEqual([])
  })

  it("is never machine-clipped by the time it reaches the head", () => {
    // A trailing ellipsis means the authored sentence overran and `truncateForDescription` cut it.
    // The length assertion above should make that unreachable; this is the check from the other
    // side, and it is the one that would catch a truncation introduced anywhere in between.
    for (const entry of ENTRIES) {
      if (!entry.lesson.seoDescription) continue
      const description = lessonMetaDescription(toPublicLessonPreview(entry))
      expect(description, entry.lesson.id).not.toMatch(/…$/)
    }
  })

  it("is what the head actually renders, wherever it is set", () => {
    for (const entry of ENTRIES) {
      if (!entry.lesson.seoDescription) continue
      const metadata = learnLessonMetadata(toPublicLessonPreview(entry))
      expect(metadata.description, entry.lesson.id).toBe(entry.lesson.seoDescription)
    }
  })
})

describe("the two rules reject what they are meant to reject", () => {
  // Without this block, both corpus assertions above pass on an empty list and would keep passing
  // if their predicates were inverted. These are the cases the authoring pass will actually write.
  const good =
    "Fencing tokens stop a stale lock holder from writing: the lock service hands out a rising " +
    "number and storage rejects anything older than it has seen."

  it("accepts a description that follows both rules", () => {
    expect(good.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN)
    expect(good.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(outsideBudget([{ id: "good", description: good }])).toEqual([])
    expect(weakOpening([{ id: "good", description: good }])).toEqual([])
  })

  it("rejects a description that is too short", () => {
    expect(outsideBudget([{ id: "short", description: "Fencing tokens explained." }])).toHaveLength(
      1
    )
  })

  it("rejects a description that is too long", () => {
    expect(outsideBudget([{ id: "long", description: `${good} ${good}` }])).toHaveLength(1)
  })

  it("rejects both weak openings, whatever their casing", () => {
    expect(weakOpening([{ id: "a", description: `In this lesson you ${good}` }])).toHaveLength(1)
    expect(weakOpening([{ id: "b", description: `This lesson covers ${good}` }])).toHaveLength(1)
    expect(weakOpening([{ id: "c", description: `IN THIS LESSON ${good}` }])).toHaveLength(1)
  })

  it("does not reject the phrase when it appears later in the sentence", () => {
    // The rule is about the opening clause, which is the part a scanning searcher reads. A
    // description that mentions the lesson halfway through has already answered the question.
    expect(weakOpening([{ id: "d", description: `${good} This lesson practises it.` }])).toEqual([])
  })
})

describe("the lesson description falls back to the summary", () => {
  it("prefers seoDescription when the lesson has one", () => {
    const authored =
      "Fencing tokens stop a stale lock holder from writing: the lock service issues a " +
      "monotonically increasing number and storage rejects anything older."
    const preview = previewWith({ seoDescription: authored, summary: "A summary nobody searched." })
    expect(lessonMetaDescription(preview)).toBe(authored)
    expect(learnLessonMetadata(preview).description).toBe(authored)
  })

  it("uses the summary when it does not", () => {
    const preview = previewWith({ seoDescription: undefined, summary: "A one-line summary." })
    expect(lessonMetaDescription(preview)).toBe("A one-line summary.")
  })

  it("still truncates an over-length override rather than shipping it whole", () => {
    // The corpus assertion above is what stops this from happening. This pins what production does
    // if it ever does: a clean word-boundary cut, not a 400-character tag Google throws away.
    const preview = previewWith({ seoDescription: `${"word ".repeat(60)}end` })
    const description = lessonMetaDescription(preview)
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(description.endsWith("…")).toBe(true)
  })
})
