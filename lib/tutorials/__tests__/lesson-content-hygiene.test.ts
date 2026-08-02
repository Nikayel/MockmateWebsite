/**
 * Content hygiene over the live Learn corpus — the drift guard for a public, indexed surface.
 *
 * `public-preview-sealing.test.ts` answers "can a gated value escape". This file answers the other
 * half of the same question: "is what we DO publish fit to be published". Every
 * `/learn/{track}/{levelSlug}/{lessonId}` page is statically generated and submitted in the sitemap,
 * so an empty teach body, a stray `TODO`, a duplicated title, or an unclosed code fence is not a
 * cosmetic defect. It is a thin/duplicate page that a crawler will happily index and then hold
 * against the whole directory.
 *
 * ## Why every expectation is derived
 *
 * A concurrent authoring loop commits new lessons to `main` continuously (the Python track grew by
 * thirteen lessons during the week the public routes were built). So this suite walks
 * `listAllCatalogEntries()` and asserts PROPERTIES, never counts, never ids, never a level list. The
 * only numeric assertion is a loose lower bound that exists so a broken registry import cannot make
 * the suite pass vacuously over zero lessons.
 *
 * ## Fail versus report
 *
 * Assertions that encode a real defect fail the build. Assertions that encode a *preference* (title
 * and summary length, which only affect how a result truncates in a SERP) report to the console and
 * fail only past a generous ceiling, because an authoring loop should not be blocked by a
 * sixty-second copy edit. See {@link TITLE_HARD_CEILING} for the reasoning behind each number.
 */
import { describe, expect, it } from "vitest"

import { listAllCatalogEntries, COURSE_IDS, type CatalogEntry } from "../course-catalog"

const ENTRIES = listAllCatalogEntries()

/**
 * Lesson ids are BOTH a URL segment on a public page and a Firestore document key in
 * `tutorial_progress`. Anything outside this shape breaks one or the other: an uppercase letter or a
 * space forces percent-encoding (so the canonical URL and the sitemap URL can disagree), and a `/`
 * or `.` is illegal in a Firestore document id. Lowercase kebab-case is what every authored id
 * already uses, so this pins the existing convention rather than inventing one.
 */
const URL_SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Unfinished-work markers.
 *
 * The shouted markers are matched CASE-SENSITIVELY, which is the difference between a useful guard
 * and one that has to be switched off. Three of these words are also ordinary technical vocabulary
 * in this corpus, and the live content proves it:
 *
 *  - "placeholder" is the correct name for a `{name}` slot in `str.format` (`py-l2-args-kwargs`),
 *    for a `?` bind parameter in SQL (`py-l3-sqlite-parameterized`), and for what a `TypeVar` stands
 *    in for (`py-l3-typing-module`). All three lessons teach it on purpose.
 *  - "todo" is the subject of the Level 3 capstone, which builds a `todo` package
 *    (`py-l3-uv-pyproject-capstone`).
 *
 * Shouted uppercase is the actual convention for unfinished work, so `PLACEHOLDER` fails and
 * `placeholder` does not. The two multi-word phrases stay case-insensitive because "Coming soon" is
 * a marketing string that is equally wrong in any casing, and `lorem ipsum` filler is never anything
 * but filler.
 */
const PLACEHOLDER_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "TODO", pattern: /\bTODO\b/ },
  { label: "FIXME", pattern: /\bFIXME\b/ },
  { label: "TBD", pattern: /\bTBD\b/ },
  { label: "XXX", pattern: /\bXXX\b/ },
  { label: "PLACEHOLDER", pattern: /\bPLACEHOLDER\b/ },
  { label: "lorem ipsum", pattern: /\blorem\s+ipsum/i },
  { label: "coming soon", pattern: /\bcoming soon\b/i },
]

/**
 * Google truncates a title around 60 characters and a description around 155 to 160, so those are
 * the numbers worth *reporting*. They are not worth *failing* on: a long title still ranks, it just
 * ends in an ellipsis, and blocking the authoring loop on that trade is not a good deal.
 *
 * The hard ceilings are set clear of the corpus's measured maxima on 2026-08-02: the longest title
 * is 80 characters (`sql-l5-medallion-streaming-capstone`) and the longest summary is 493
 * (`sd-l9-batch-streaming`). System Design summaries are systematically long because they were
 * written as level-index blurbs, before any of this text was public; 183 of 364 lessons exceed the
 * 160-character SERP limit and that is a real backlog, reported below rather than enforced here.
 *
 * The ceilings exist to catch a REGRESSION in kind, not in degree: an author pasting a paragraph
 * into the title field, or a summary that is actually the lesson body. Roughly 1.4x the current
 * worst case is the band that catches that without failing anything written so far. If a future
 * corpus legitimately crosses one, raise it deliberately and record why; do not delete the assertion.
 */
const TITLE_SOFT_LIMIT = 60
const TITLE_HARD_CEILING = 120
const SUMMARY_SOFT_LIMIT = 160
const SUMMARY_HARD_CEILING = 700

/** A human-readable locator for an offender, since ids alone do not say where to look. */
function locate(entry: CatalogEntry): string {
  return `${entry.courseId}/${entry.level.slug}/${entry.lesson.id}`
}

/**
 * Every string a signed-out visitor can read on the public lesson page, paired with a field name.
 *
 * Deliberately mirrors `PublicLessonPreview`'s string-bearing fields rather than walking the whole
 * authored lesson: gated text is allowed to contain a `TODO` (a starter file's `# TODO: implement`
 * is the standard way to mark the blank a learner fills in), and scanning it would produce hundreds
 * of false positives that would force this suite to be disabled.
 *
 * `teach.demoCode` and `teach.demoSeedSql` are excluded for the same reason in reverse: they are
 * published, but they are CODE, and a comment marker inside a worked example is not placeholder
 * copy. The prose fields below are the ones a reader judges the page by.
 */
function publicProseFields(entry: CatalogEntry): Array<{ field: string; value: string }> {
  const { lesson } = entry
  return [
    { field: "title", value: lesson.title },
    { field: "summary", value: lesson.summary },
    { field: "teach.markdown", value: lesson.teach.markdown },
    { field: "apply.prompt", value: lesson.apply.prompt },
    { field: "practice.prompt", value: lesson.practice.prompt },
    ...lesson.skills.map((skill, index) => ({ field: `skills[${index}]`, value: skill })),
  ]
}

/**
 * Count fence delimiters in a markdown body.
 *
 * A fence is a line whose first non-space characters are three or more backticks. Everything the
 * curriculum uses goes through this shape, including the custom `csdiagram` and `cswidget` fences.
 * The count must be even: an odd count means one fence was opened and never closed, which in CommonMark
 * swallows the entire remainder of the document into a code block. On a public page that turns the
 * rest of the lesson into unreadable monospace, and it is invisible in a diff.
 *
 * Indented fences are matched (up to three spaces is still a fence in CommonMark); a fence indented
 * four or more spaces is an indented code block, not a fence, so it is skipped.
 */
function countFenceLines(markdown: string): number {
  let fences = 0
  for (const line of markdown.split("\n")) {
    if (/^ {0,3}```/.test(line)) fences += 1
  }
  return fences
}

describe("public lesson content hygiene", () => {
  it("walks a real, non-empty corpus covering every course", () => {
    // A loose floor, not a count. Its only job is to fail if a registry import breaks and the walk
    // silently yields nothing, which would make every assertion below pass over an empty array.
    expect(ENTRIES.length).toBeGreaterThan(300)
    expect([...new Set(ENTRIES.map((entry) => entry.courseId))].sort()).toEqual(
      [...COURSE_IDS].sort()
    )
  })

  it("never publishes an empty title, summary, or teach body", () => {
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      for (const { field, value } of [
        { field: "title", value: entry.lesson.title },
        { field: "summary", value: entry.lesson.summary },
        { field: "teach.markdown", value: entry.lesson.teach.markdown },
      ]) {
        if (value.trim().length === 0) offenders.push(`${locate(entry)}: ${field} is blank`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("never publishes unfinished-work markers in reader-facing prose", () => {
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      for (const { field, value } of publicProseFields(entry)) {
        for (const { label, pattern } of PLACEHOLDER_PATTERNS) {
          const match = pattern.exec(value)
          if (!match) continue
          // Carry the surrounding text into the failure message. A bare id and field name sends the
          // reader hunting through a four-thousand-line curriculum file; the snippet does not.
          const start = Math.max(0, match.index - 40)
          const context = value.slice(start, match.index + 60).replace(/\s+/g, " ")
          offenders.push(`${locate(entry)}: ${field} contains "${label}" near "...${context}..."`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("gives every lesson a unique, URL-safe id across the whole corpus", () => {
    // Ids are global, not per-course: they are the Firestore progress key, which has no course
    // namespace, so a collision between a SQL and a Python lesson would merge two learners' progress.
    const seen = new Map<string, string>()
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const { id } = entry.lesson
      if (!URL_SAFE_ID.test(id)) {
        offenders.push(`${locate(entry)}: id "${id}" is not lowercase kebab-case`)
      }
      const previous = seen.get(id)
      if (previous) offenders.push(`${locate(entry)}: id "${id}" duplicates ${previous}`)
      else seen.set(id, locate(entry))
    }
    expect(offenders).toEqual([])
  })

  it("never ships two lessons with the same title inside one course", () => {
    // Scoped per course on purpose. "Joins" meaning one thing in SQL and another in System Design is
    // fine; two SQL lessons both called "Joins" are two pages competing for the same query.
    const offenders: string[] = []
    for (const courseId of COURSE_IDS) {
      const seen = new Map<string, string>()
      for (const entry of ENTRIES.filter((candidate) => candidate.courseId === courseId)) {
        const key = entry.lesson.title.trim().toLowerCase()
        const previous = seen.get(key)
        if (previous)
          offenders.push(`${locate(entry)}: title "${entry.lesson.title}" duplicates ${previous}`)
        else seen.set(key, locate(entry))
      }
    }
    expect(offenders).toEqual([])
  })

  it("never ships two lessons with an identical summary", () => {
    // Corpus-wide, unlike titles: the summary is what feeds the meta description, and two pages with
    // the same description read as duplicates to a crawler regardless of which track they sit in.
    const seen = new Map<string, string>()
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const key = entry.lesson.summary.trim().toLowerCase()
      const previous = seen.get(key)
      if (previous) offenders.push(`${locate(entry)}: summary duplicates ${previous}`)
      else seen.set(key, locate(entry))
    }
    expect(offenders).toEqual([])
  })

  it("closes every markdown code fence it opens", () => {
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const fences = countFenceLines(entry.lesson.teach.markdown)
      if (fences % 2 !== 0) {
        offenders.push(
          `${locate(entry)}: ${fences} fence lines in teach.markdown (odd, so one is unclosed)`
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it("reports overlong titles and summaries without blocking the authoring loop", () => {
    const overSoftLimit = {
      title: [] as Array<[string, number]>,
      summary: [] as Array<[string, number]>,
    }
    const overCeiling: string[] = []

    for (const entry of ENTRIES) {
      const { title, summary } = entry.lesson
      if (title.length > TITLE_SOFT_LIMIT) overSoftLimit.title.push([locate(entry), title.length])
      if (summary.length > SUMMARY_SOFT_LIMIT) {
        overSoftLimit.summary.push([locate(entry), summary.length])
      }
      if (title.length > TITLE_HARD_CEILING) {
        overCeiling.push(`${locate(entry)}: title ${title.length} > ${TITLE_HARD_CEILING}`)
      }
      if (summary.length > SUMMARY_HARD_CEILING) {
        overCeiling.push(`${locate(entry)}: summary ${summary.length} > ${SUMMARY_HARD_CEILING}`)
      }
    }

    // Reporting only, and deliberately summarised: the full list is nearly two hundred lines today
    // and scrolling it off the top of the run helps nobody. The count is the trend line, the worst
    // five are where an editor should start.
    for (const [field, label, limit] of [
      ["title", "titles", TITLE_SOFT_LIMIT],
      ["summary", "summaries", SUMMARY_SOFT_LIMIT],
    ] as const) {
      const rows = overSoftLimit[field].sort((a, b) => b[1] - a[1])
      const worst = rows.slice(0, 5).map(([where, length]) => `${where} (${length})`)
      // `console.info` rather than `warn`: this is a standing measurement of content debt, not a
      // problem with this run. Promoting it to a warning would train everyone to ignore warnings.
      // eslint-disable-next-line no-console
      console.info(
        `[learn-seo] ${label} over ${limit} chars: ${rows.length}/${ENTRIES.length}` +
          (worst.length > 0 ? `; longest: ${worst.join(", ")}` : "")
      )
    }

    expect(overCeiling).toEqual([])
  })
})
