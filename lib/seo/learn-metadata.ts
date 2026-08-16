/**
 * Metadata builders for the public Learn corpus (track, level, lesson).
 *
 * ## Why these live in one module
 *
 * Publishing several hundred lesson pages means several hundred `<title>`, `<meta description>`,
 * `rel=canonical`, and Open Graph blocks. Written inline per route they drift within a week: two
 * tracks get canonicals and the third does not, one uses the apex and another the `www` host, and a
 * lesson title ends up duplicating the site name twice. Every Learn page now derives its head from
 * here, so a fix lands once.
 *
 * ## Two rules the root layout forces on us
 *
 * 1. `app/layout.tsx` sets `title.template = "%s | CodeSparring"`, so a page must NOT put the site
 *    name in its own title. The pre-existing Learn pages did (`"Learn Python — CodeSparring"`),
 *    which rendered as `Learn Python — CodeSparring | CodeSparring`. Titles built here carry only
 *    the page's own identity and let the template add the brand exactly once.
 * 2. The root layout deliberately sets no `alternates.canonical` (a root canonical is inherited and
 *    would point every page at the homepage), so each page must declare its own. Absolute URLs come
 *    from {@link canonicalPageMetadata} rather than from a relative path, so the emitted canonical
 *    cannot pick up a preview host or a redirecting `www`.
 *
 * Nothing here reads the curriculum: callers pass already-resolved content. That keeps the module
 * importable from any route without dragging the multi-megabyte registries behind it.
 */
import type { Metadata } from "next"

import { canonicalPageMetadata } from "./page-metadata"
import {
  LEARN_COURSE_LABEL,
  levelPath,
  publicLessonPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import type { PublicLessonPreview } from "@/lib/tutorials/public-preview"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * Google truncates descriptions around 155-160 characters. Cutting mid-word looks broken in the
 * SERP, so we cut at the last word boundary that fits and add an ellipsis.
 */
const DESCRIPTION_MAX = 155

/** Trim a description to `DESCRIPTION_MAX`, breaking on a word boundary rather than mid-word. */
export function truncateForDescription(text: string, max: number = DESCRIPTION_MAX): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= max) return normalized

  // Reserve one character for the ellipsis so the final string still fits the budget.
  const clipped = normalized.slice(0, max - 1)
  const lastSpace = clipped.lastIndexOf(" ")
  const body = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[,;:.\s]+$/, "")
  return `${body}…`
}

/**
 * The Learn corpus head block.
 *
 * The canonical-plus-social-cards shape now lives in `page-metadata.ts`, because the same three tags
 * are what every public route outside Learn was missing. Learn's only local decision is the Open
 * Graph type: a lesson is `article`, not `website`.
 */
function headFor(args: { path: string; title: string; description: string }): Metadata {
  return canonicalPageMetadata({ ...args, openGraphType: "article" })
}

/** `/learn/{track}` — the course landing. Title is the course label alone; the template adds the brand. */
export function learnTrackMetadata(args: { courseId: CourseId; description: string }): Metadata {
  return headFor({
    path: trackPath(args.courseId),
    title: `Learn ${LEARN_COURSE_LABEL[args.courseId]}`,
    description: truncateForDescription(args.description),
  })
}

/**
 * `/learn/{track}/{levelSlug}` — the level index. The tagline is the authored one-line pitch.
 *
 * The title runs through the same ladder the lesson pages use. It did not, and the omission was
 * worth 24 of 28 level indexes over the 60-character budget, the worst at 98:
 *
 *     Level 5: Advanced & Company-Specific SQL for DE Interviews · Learn Data Engineering | CodeSparring
 *
 * A level index is the page a searcher lands on for a whole topic, so it is exactly the page that
 * cannot afford to be cut before it names its subject.
 */
export function learnLevelMetadata(args: {
  courseId: CourseId
  levelSlug: string
  levelTitle: string
  levelTagline: string
}): Metadata {
  const label = LEARN_COURSE_LABEL[args.courseId]
  const base = headFor({
    path: levelPath(args.courseId, args.levelSlug),
    // As with lessons, the Open Graph title keeps the full label: no OG consumer enforces a
    // 60-character budget, so naming the course there is a gain rather than a truncation risk.
    title: `${args.levelTitle} · Learn ${label}`,
    description: truncateForDescription(
      args.levelTagline || `A guided level in the free ${label} course.`
    ),
  })
  return { ...base, title: composeLearnTitle(args.levelTitle, label) }
}

/**
 * Google shows roughly 60 characters of a title before truncating it. That budget has to cover the
 * page's own name, whatever course label we add, AND the ` | CodeSparring` the root template
 * appends, because the searcher sees the composed string, not ours.
 */
const TITLE_BUDGET = 60
const BRAND_SUFFIX = " | CodeSparring"

/**
 * Compose a Learn title that fits the SERP, degrading the suffix rather than the page's own name.
 *
 * ## The measurement that forced this
 *
 * Five system design lesson pages sat on page one of Google for 28 days and returned ZERO clicks:
 * roughly 97 impressions at an average position near 7, where 2 to 4 percent CTR is normal, so two
 * to four clicks were expected. Titles rendered like this in production:
 *
 *     Design a Stock Exchange / Order-Matching Engine · Learn System Design | CodeSparring   (84)
 *     Leader Election, Leases, Fencing & Split-Brain · Learn System Design | CodeSparring    (83)
 *
 * The suffix ` · Learn System Design | CodeSparring` is 37 characters on its own, so at a
 * 60-character display budget the searcher saw neither the brand nor the end of the lesson title.
 * Every one of those pages was truncated before it said what it was about.
 *
 * ## The ladder
 *
 * Three rungs, each dropped only when the one above does not fit:
 *
 *  1. Full label: `Page · Learn System Design` + the template's ` | CodeSparring`.
 *  2. Brand only: `Page` + ` | CodeSparring`. The course is recoverable from the URL and from
 *     the breadcrumb rich result; the page's own name is not recoverable from anywhere.
 *  3. Bare title via `title.absolute`, which bypasses the root template entirely. Reached only by
 *     a page whose own name is already at or past the budget, where adding the brand would cut
 *     into the words the searcher is scanning for.
 *
 * Rung 3 is why this returns `Metadata["title"]` rather than a string: `absolute` is the only way
 * to opt out of a template Next.js otherwise applies unconditionally.
 *
 * ## Why one function serves lessons and level indexes
 *
 * The first fix shipped this for lessons only, under the name `composeLessonTitle`, and
 * `learnLevelMetadata` kept building its title inline. The level indexes then carried the exact
 * defect the ladder exists to retire, on the pages that sit one hop above 425 lessons. The budget,
 * the suffix, and the degrade order are identical for both, so the rule lives in one place and the
 * name says "Learn", not "lesson".
 *
 * The page title itself is NEVER truncated here. A title too long for the budget is a content
 * defect (SEO-01's sibling ticket) and shortening it silently would hide that from the corpus test
 * rather than fix it.
 */
export function composeLearnTitle(pageTitle: string, courseLabel: string): Metadata["title"] {
  const withLabel = `${pageTitle} · Learn ${courseLabel}`
  if (withLabel.length + BRAND_SUFFIX.length <= TITLE_BUDGET) return withLabel
  if (pageTitle.length + BRAND_SUFFIX.length <= TITLE_BUDGET) return pageTitle
  return { absolute: pageTitle }
}

/**
 * The snippet copy for one lesson: the authored `seoDescription` when it exists, otherwise the
 * summary.
 *
 * The fallback is the summary and not something cleverer because the summary is the only other
 * sentence that is true about the lesson. It is written to orient a learner already inside the
 * course, though, so it tends to open with curriculum framing rather than with the answer the query
 * asked for. `seoDescription` is the override for the pages where that costs a click (SEO-02).
 *
 * Both paths run through {@link truncateForDescription}. An authored `seoDescription` should never
 * need it (`lib/seo/__tests__/learn-description-budget.test.ts` fails at 156 characters), but a
 * clean word-boundary cut is a better production failure than a tag Google discards and rewrites.
 *
 * Exported because the lesson's `Article` JSON-LD describes the same page and should not describe it
 * differently. `components/learn/PublicLessonArticle.tsx` still calls `truncateForDescription` on
 * the summary directly and should move to this once per-lesson values land.
 */
export function lessonMetaDescription(preview: PublicLessonPreview): string {
  return truncateForDescription(preview.seoDescription ?? preview.summary)
}

/**
 * `/learn/{track}/{levelSlug}/{lessonId}` — the canonical reading page.
 *
 * Takes the already-projected {@link PublicLessonPreview} rather than the authored lesson, so the
 * only lesson text that can reach a meta tag is text the public projection already publishes.
 */
export function learnLessonMetadata(preview: PublicLessonPreview): Metadata {
  const path = publicLessonPath(preview.courseId, preview.levelSlug, preview.id)
  // `headFor` takes a plain string because every other Learn page fits comfortably; a lesson can
  // reach the `absolute` rung, so it composes its own head and overrides just the title. The
  // Open Graph title keeps the full label: no OG consumer enforces a 60-character budget, and
  // Slack or LinkedIn showing the course is a gain rather than a truncation risk.
  const title = composeLearnTitle(preview.title, LEARN_COURSE_LABEL[preview.courseId])
  const base = headFor({
    path,
    title: `${preview.title} · Learn ${LEARN_COURSE_LABEL[preview.courseId]}`,
    description: lessonMetaDescription(preview),
  })
  return { ...base, title }
}
