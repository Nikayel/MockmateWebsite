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

/** `/learn/{track}/{levelSlug}` — the level index. The tagline is the authored one-line pitch. */
export function learnLevelMetadata(args: {
  courseId: CourseId
  levelSlug: string
  levelTitle: string
  levelTagline: string
}): Metadata {
  return headFor({
    path: levelPath(args.courseId, args.levelSlug),
    title: `${args.levelTitle} · Learn ${LEARN_COURSE_LABEL[args.courseId]}`,
    description: truncateForDescription(
      args.levelTagline || `A guided level in the free ${LEARN_COURSE_LABEL[args.courseId]} course.`
    ),
  })
}

/**
 * `/learn/{track}/{levelSlug}/{lessonId}` — the canonical reading page.
 *
 * Takes the already-projected {@link PublicLessonPreview} rather than the authored lesson, so the
 * only lesson text that can reach a meta tag is text the public projection already publishes.
 */
export function learnLessonMetadata(preview: PublicLessonPreview): Metadata {
  return headFor({
    path: publicLessonPath(preview.courseId, preview.levelSlug, preview.id),
    title: `${preview.title} · Learn ${LEARN_COURSE_LABEL[preview.courseId]}`,
    description: truncateForDescription(preview.summary),
  })
}
