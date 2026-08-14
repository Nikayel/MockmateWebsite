/**
 * Every Learn lesson title, as the searcher actually sees it, must fit the SERP.
 *
 * ## Why this is a corpus test and not a unit test
 *
 * The defect it retires was invisible to unit tests because no single function was wrong.
 * `learnLessonMetadata` appended ` · Learn System Design`, `app/layout.tsx` appended
 * ` | CodeSparring`, and each was individually reasonable. Composed over a real lesson name
 * they produced 84 characters against a roughly 60-character display budget:
 *
 *     Design a Stock Exchange / Order-Matching Engine · Learn System Design | CodeSparring
 *
 * Five pages sat on page one for 28 days at an average position near 7 and returned ZERO
 * clicks, against an expected two to four. The searcher never read what the page was about
 * because the title was cut before it got there.
 *
 * So the assertion has to be made against the COMPOSED string over the LIVE corpus. Anything
 * narrower passes while production is broken.
 *
 * ## What it deliberately does not assert
 *
 * It does not require every lesson TITLE to be short. A handful are genuinely long, that is a
 * content ticket, and having the metadata layer silently truncate them would hide the problem
 * from the very test that should surface it. What it requires is that the composition never
 * makes a long title WORSE by bolting 37 characters of suffix onto it.
 */
import { describe, expect, it } from "vitest"

import { composeLessonTitle, learnLessonMetadata } from "../learn-metadata"
import { listAllCatalogEntries } from "@/lib/tutorials/course-catalog"
import { LEARN_COURSE_LABEL } from "@/lib/tutorials/lesson-routes"
import { toPublicLessonPreview } from "@/lib/tutorials/public-preview"

/** What the root layout appends, and therefore what the searcher reads at the end of the line. */
const BRAND_SUFFIX = " | CodeSparring"
const TITLE_BUDGET = 60

const ENTRIES = listAllCatalogEntries()

/** The exact string Google renders: what the page declares, plus whatever the template adds. */
function renderedTitle(entry: (typeof ENTRIES)[number]): string {
  const preview = toPublicLessonPreview(entry)
  const title = learnLessonMetadata(preview).title
  if (typeof title === "string") return `${title}${BRAND_SUFFIX}`
  if (title && typeof title === "object" && "absolute" in title) return String(title.absolute)
  throw new Error(`${entry.lesson.id} produced an unusable title: ${JSON.stringify(title)}`)
}

describe("Learn lesson titles fit the SERP budget", () => {
  it("walks a real, non-empty corpus", () => {
    expect(ENTRIES.length).toBeGreaterThan(300)
  })

  it("never composes a title longer than the lesson's own name plus the brand", () => {
    // The composition must never make things worse. A 70-character lesson title renders as 70
    // characters, not as 107. This is the assertion that actually catches the regression, and
    // it holds regardless of how long any individual lesson title is.
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const rendered = renderedTitle(entry)
      const floor = entry.lesson.title.length
      if (rendered.length > Math.max(TITLE_BUDGET, floor)) {
        offenders.push(
          `${entry.courseId}/${entry.lesson.id}: rendered ${rendered.length} chars ` +
            `("${rendered}") for a ${floor}-char lesson title`
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it("fits the 60-character budget for every lesson whose own title leaves room", () => {
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      // A lesson whose bare name already exceeds the budget cannot be fixed here; that is a
      // content edit. Everything else has no excuse.
      if (entry.lesson.title.length + BRAND_SUFFIX.length > TITLE_BUDGET) continue
      const rendered = renderedTitle(entry)
      if (rendered.length > TITLE_BUDGET) {
        offenders.push(`${entry.lesson.id}: ${rendered.length} chars ("${rendered}")`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("never names the brand twice", () => {
    // The failure mode the root `title.template` invites: a page that helpfully adds the site
    // name renders "Lesson | CodeSparring | CodeSparring".
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const rendered = renderedTitle(entry)
      const occurrences = rendered.split("CodeSparring").length - 1
      if (occurrences > 1) offenders.push(`${entry.lesson.id}: "${rendered}"`)
    }
    expect(offenders).toEqual([])
  })

  it("never truncates or mangles the lesson's own name", () => {
    // Degrading the SUFFIX is the whole strategy. Degrading the title would defeat the point:
    // the lesson name is the only part of the string a searcher is scanning for.
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const rendered = renderedTitle(entry)
      if (!rendered.includes(entry.lesson.title)) {
        offenders.push(`${entry.lesson.id}: "${entry.lesson.title}" not intact in "${rendered}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("the title ladder degrades in the right order", () => {
  const label = LEARN_COURSE_LABEL["system-design"]

  it("keeps the course label when it fits", () => {
    const title = composeLessonTitle("Caching", label)
    expect(title).toBe("Caching · Learn System Design")
    expect(`${title}${BRAND_SUFFIX}`.length).toBeLessThanOrEqual(TITLE_BUDGET)
  })

  it("drops the course label before it drops the lesson name", () => {
    // The course is recoverable from the URL and from the breadcrumb rich result. The lesson
    // name is recoverable from nowhere, so it is the last thing to go. 33 chars of title plus
    // 22 of label plus 15 of brand is 70 and does not fit; 33 plus 15 is 48 and does.
    const title = composeLessonTitle("Leader Election and Fencing Tokens", label)
    expect(title).toBe("Leader Election and Fencing Tokens")
    expect(`${title}${BRAND_SUFFIX}`.length).toBeLessThanOrEqual(TITLE_BUDGET)
  })

  it("falls through to an absolute title when even the brand will not fit", () => {
    // 47 chars of title plus 15 of brand is 62, so the brand itself would be cut mid-word.
    // Dropping it leaves the searcher the whole lesson name, which is the part they scan for.
    const long = "Leader Election, Leases, Fencing and Split-Brain"
    const title = composeLessonTitle(long, label)
    // `absolute` is the only way to opt out of the root template, which Next.js otherwise
    // applies unconditionally.
    expect(title).toEqual({ absolute: long })
  })
})
