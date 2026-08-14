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
 * ## Everything here fails, as of 2026-08-13
 *
 * Title and summary length used to REPORT rather than fail, because 216 of 425 summaries were over
 * the SERP limit and blocking an authoring loop on a backlog nobody could clear in a sitting is a
 * bad trade. The debt is now paid (zero summaries over 160), so the reporter is an assertion and
 * the grandfathering allow-list is empty. Four titles remain over 60 deliberately and are named
 * individually rather than tolerated as a count. See {@link SUMMARY_ALLOW_LIST}.
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
 * Google truncates a title around 60 characters and a description around 155 to 160. Both limits are
 * now enforced, with a named exception list for titles.
 *
 * The hard ceilings were set clear of the corpus's maxima as measured on 2026-08-02, when the
 * longest title was 80 characters and the longest summary was 493 (`sd-l9-batch-streaming`, a
 * single sentence chain covering Lambda, Kappa, watermarks, exactly-once and Flink-into-Iceberg).
 * Both of those are gone: the corpus maxima are now 68 and 160. The ceilings stay anyway, because
 * they catch a different failure from the soft limits.
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

/**
 * The reporter above is now an ASSERTION, because the debt it was reporting is paid.
 *
 * When this file was written, 216 of 425 summaries exceeded 160 characters and the worst ran 493,
 * so failing on it would have blocked the authoring loop on a backlog nobody could clear in a
 * sitting. That is why it printed and passed. CLAUDE.md's rule is that a convention worth keeping
 * is enforced by a test rather than by a document, and a reporter is enforcement by nobody: the
 * count sat in the console for eleven days and moved only when someone went looking for it.
 *
 * Two sweeps cleared it (SEO-35 in `curriculumfixesbacklog.md`, then the Python and Data
 * Engineering pass), so on 2026-08-13 the corpus is at ZERO summaries over 160, and the allow-list
 * below is empty because there is nothing left to grandfather.
 *
 * Titles are NOT at zero and are pinned rather than asserted: four remain over 60, all of them
 * System Design, all naming a genuine list of things a searcher might type ("Short-Poll,
 * Long-Poll, SSE, WebSocket & Webhooks"). Shortening those means dropping a term someone searches
 * for, which is a worse trade than an ellipsis. They are named explicitly so the number cannot
 * drift upward while looking like the same four.
 */
const SUMMARY_ALLOW_LIST: ReadonlySet<string> = new Set([])

/**
 * Lessons whose own title exceeds the 60-character SERP budget, deliberately.
 *
 * Each one is a list of searchable terms rather than a title that drifted into describing a
 * lesson, which is the distinction SEO-010 draws. The metadata layer no longer adds a suffix to
 * these (`lib/seo/learn-metadata.ts` degrades to `title.absolute`), so what renders is exactly the
 * string below and nothing more.
 */
const TITLE_ALLOW_LIST: ReadonlySet<string> = new Set([
  "sd-l1-realtime-comms",
  "sd-l1-concurrency-models",
  "sd-l7-progressive-delivery-schema",
  "sd-l10-distributed-lock",
])

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

  it("never publishes a summary over the SERP description budget", () => {
    // Was a console report while 216 of 425 summaries were over the limit and the worst ran 493.
    // Two sweeps took that to zero, so this is an assertion now and the allow-list is empty.
    // A summary over 160 becomes a snippet Google cuts mid-argument, on a page whose only job is
    // to earn the click.
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const { summary } = entry.lesson
      if (summary.length > SUMMARY_SOFT_LIMIT && !SUMMARY_ALLOW_LIST.has(entry.lesson.id)) {
        offenders.push(
          `${locate(entry)}: summary is ${summary.length} chars (limit ${SUMMARY_SOFT_LIMIT})`
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it("never publishes a title over the SERP budget outside the named exceptions", () => {
    // Pinned by NAME rather than by count. Four titles are deliberately long because each is a
    // list of terms a searcher actually types, and shortening them means dropping one of those
    // terms. Naming them stops the number drifting upward while looking like the same four.
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const { title } = entry.lesson
      if (title.length > TITLE_SOFT_LIMIT && !TITLE_ALLOW_LIST.has(entry.lesson.id)) {
        offenders.push(
          `${locate(entry)}: title is ${title.length} chars (limit ${TITLE_SOFT_LIMIT})`
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it("keeps the title allow-list honest, so it cannot outlive its entries", () => {
    // An allow-list that still names a lesson someone already shortened is a licence nobody
    // revoked. If an entry no longer needs the exemption, this fails and it gets deleted.
    const unnecessary: string[] = []
    for (const id of TITLE_ALLOW_LIST) {
      const entry = ENTRIES.find((candidate) => candidate.lesson.id === id)
      if (!entry) {
        unnecessary.push(`${id} is allow-listed but no longer exists`)
      } else if (entry.lesson.title.length <= TITLE_SOFT_LIMIT) {
        unnecessary.push(
          `${id} is allow-listed but its title now fits (${entry.lesson.title.length})`
        )
      }
    }
    expect(unnecessary).toEqual([])
  })

  it("catches a title or summary that is actually a pasted paragraph", () => {
    // The hard ceilings stay: they catch a regression in KIND (someone pasting the lesson body
    // into the summary field) rather than in degree, which is what the soft limits above cover.
    const overCeiling: string[] = []
    for (const entry of ENTRIES) {
      const { title, summary } = entry.lesson
      if (title.length > TITLE_HARD_CEILING) {
        overCeiling.push(`${locate(entry)}: title ${title.length} > ${TITLE_HARD_CEILING}`)
      }
      if (summary.length > SUMMARY_HARD_CEILING) {
        overCeiling.push(`${locate(entry)}: summary ${summary.length} > ${SUMMARY_HARD_CEILING}`)
      }
    }
    expect(overCeiling).toEqual([])
  })
})
