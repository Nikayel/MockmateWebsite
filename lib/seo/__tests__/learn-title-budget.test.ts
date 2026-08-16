/**
 * Every Learn title, as the searcher actually sees it, must fit the SERP.
 *
 * Covers both public Learn page shapes: the 425 lesson pages and the 28 level indexes above them.
 * The level indexes were added after the lesson fix shipped and left them behind: 24 of 28 rendered
 * past the budget, the worst at 98 characters, because `learnLevelMetadata` still composed its
 * title inline instead of going through the ladder. One builder, one test.
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
import type { Metadata } from "next"
import { describe, expect, it } from "vitest"

import { composeLearnTitle, learnLessonMetadata, learnLevelMetadata } from "../learn-metadata"
import { listAllCatalogEntries, listAllCourseLevels } from "@/lib/tutorials/course-catalog"
import { LEARN_COURSE_LABEL } from "@/lib/tutorials/lesson-routes"
import { toPublicLessonPreview } from "@/lib/tutorials/public-preview"

/** What the root layout appends, and therefore what the searcher reads at the end of the line. */
const BRAND_SUFFIX = " | CodeSparring"
const TITLE_BUDGET = 60

const ENTRIES = listAllCatalogEntries()
const LEVELS = listAllCourseLevels()

/**
 * The exact string Google renders: what the page declares, plus whatever the template adds.
 *
 * `title.absolute` opts out of the template, so it is the rendered string on its own. Anything else
 * is a bug in the builder rather than a value to interpret, hence the throw.
 */
function renderTitle(title: Metadata["title"], label: string): string {
  if (typeof title === "string") return `${title}${BRAND_SUFFIX}`
  if (title && typeof title === "object" && "absolute" in title) return String(title.absolute)
  throw new Error(`${label} produced an unusable title: ${JSON.stringify(title)}`)
}

function renderedLessonTitle(entry: (typeof ENTRIES)[number]): string {
  const preview = toPublicLessonPreview(entry)
  return renderTitle(learnLessonMetadata(preview).title, entry.lesson.id)
}

function renderedLevelTitle(level: (typeof LEVELS)[number]): string {
  const metadata = learnLevelMetadata({
    courseId: level.courseId,
    levelSlug: level.level.slug,
    levelTitle: level.level.title,
    levelTagline: level.level.tagline,
  })
  return renderTitle(metadata.title, `${level.courseId}/${level.level.slug}`)
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
      const rendered = renderedLessonTitle(entry)
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
      const rendered = renderedLessonTitle(entry)
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
      const rendered = renderedLessonTitle(entry)
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
      const rendered = renderedLessonTitle(entry)
      if (!rendered.includes(entry.lesson.title)) {
        offenders.push(`${entry.lesson.id}: "${entry.lesson.title}" not intact in "${rendered}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("Learn level index titles fit the SERP budget", () => {
  it("walks every level of every course", () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(28)
    expect(new Set(LEVELS.map((level) => level.courseId)).size).toBe(3)
  })

  it("never renders a level index title past 60 characters", () => {
    // Unconditional, unlike the lesson assertion. Every authored level title is at most 58
    // characters today, so the ladder can always land inside the budget; a level title long
    // enough to break this is a content edit, and failing here is how that gets noticed.
    const offenders: string[] = []
    for (const level of LEVELS) {
      const rendered = renderedLevelTitle(level)
      if (rendered.length > TITLE_BUDGET) {
        offenders.push(
          `${level.courseId}/${level.level.slug}: ${rendered.length} chars ("${rendered}")`
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it("never truncates the level's own name and never names the brand twice", () => {
    const offenders: string[] = []
    for (const level of LEVELS) {
      const rendered = renderedLevelTitle(level)
      const id = `${level.courseId}/${level.level.slug}`
      if (!rendered.includes(level.level.title)) {
        offenders.push(`${id}: "${level.level.title}" not intact in "${rendered}"`)
      }
      if (rendered.split("CodeSparring").length - 1 > 1) {
        offenders.push(`${id}: brand twice in "${rendered}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("keeps the course label on the level indexes that have room for it", () => {
    // The ladder is only worth having if its top rung still fires. Python's short level titles
    // are the ones that keep it, and a change that dropped the label everywhere would pass the
    // budget assertion above while quietly making every level index less descriptive.
    const withLabel = LEVELS.filter((level) =>
      renderedLevelTitle(level).includes(` · Learn ${LEARN_COURSE_LABEL[level.courseId]}`)
    )
    expect(withLabel.length).toBeGreaterThan(0)
  })

  it("gives the level index a canonical of its own", () => {
    // The root layout sets none, and the ladder change rebuilds this object, so the canonical is
    // the thing most likely to be dropped by accident on the way through.
    for (const level of LEVELS) {
      const metadata = learnLevelMetadata({
        courseId: level.courseId,
        levelSlug: level.level.slug,
        levelTitle: level.level.title,
        levelTagline: level.level.tagline,
      })
      expect(metadata.alternates?.canonical, `${level.courseId}/${level.level.slug}`).toBe(
        `https://www.codesparring.dev/learn/${level.courseId}/${level.level.slug}`
      )
    }
  })
})

describe("the title ladder degrades in the right order", () => {
  const label = LEARN_COURSE_LABEL["system-design"]

  it("keeps the course label when it fits", () => {
    const title = composeLearnTitle("Caching", label)
    expect(title).toBe("Caching · Learn System Design")
    expect(`${title}${BRAND_SUFFIX}`.length).toBeLessThanOrEqual(TITLE_BUDGET)
  })

  it("drops the course label before it drops the lesson name", () => {
    // The course is recoverable from the URL and from the breadcrumb rich result. The lesson
    // name is recoverable from nowhere, so it is the last thing to go. 33 chars of title plus
    // 22 of label plus 15 of brand is 70 and does not fit; 33 plus 15 is 48 and does.
    const title = composeLearnTitle("Leader Election and Fencing Tokens", label)
    expect(title).toBe("Leader Election and Fencing Tokens")
    expect(`${title}${BRAND_SUFFIX}`.length).toBeLessThanOrEqual(TITLE_BUDGET)
  })

  it("falls through to an absolute title when even the brand will not fit", () => {
    // 47 chars of title plus 15 of brand is 62, so the brand itself would be cut mid-word.
    // Dropping it leaves the searcher the whole lesson name, which is the part they scan for.
    const long = "Leader Election, Leases, Fencing and Split-Brain"
    const title = composeLearnTitle(long, label)
    // `absolute` is the only way to opt out of the root template, which Next.js otherwise
    // applies unconditionally.
    expect(title).toEqual({ absolute: long })
  })
})
