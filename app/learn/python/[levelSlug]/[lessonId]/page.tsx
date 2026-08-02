import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  PublicLessonArticle,
  type PublicLessonArticleNav,
} from "@/components/learn/PublicLessonArticle"
import { learnLessonMetadata } from "@/lib/seo/learn-metadata"
import { findCatalogEntry, listCourseEntries } from "@/lib/tutorials/course-catalog"
import { publicLessonPath } from "@/lib/tutorials/lesson-routes"
import { toPublicLessonPreview } from "@/lib/tutorials/public-preview"

const COURSE_ID = "python" as const

type Props = { params: Promise<{ levelSlug: string; lessonId: string }> }

/**
 * The PUBLIC Python lesson page: `/learn/python/{levelSlug}/{lessonId}`.
 *
 * ## The standing rule for this file
 *
 * This page must never read `cookies()`, `headers()`, auth, or Firestore, and must never become
 * `dynamic`. It is statically generated at build time and served from the CDN byte-identically to
 * every visitor. Two things depend on that:
 *
 *  1. **Correctness.** A single cached HTML document is shared by everyone who asks for this URL.
 *     Personalising it server-side would serve one learner's progress, name, or resume position to
 *     strangers. If this page ever needs to know something about the visitor, that belongs in a
 *     client component (see `LessonUnlockCard`), never here.
 *  2. **Honesty.** Users and crawlers receive the same bytes, which is what makes serving a
 *     reading-optimised page to Googlebot provably not cloaking. The graded half lives at
 *     `.../workspace`, which is auth-gated AND noindexed, so nothing indexed is unreachable and
 *     nothing reachable is hidden.
 *
 * `dynamicParams = false` means an id that `generateStaticParams` did not emit 404s at the CDN
 * before this module runs. That is also the canonicalization guarantee: a real lesson id under the
 * wrong level slug is not a redirect and not a duplicate page, it is a 404, because
 * `findCatalogEntry` only matches a lesson inside the level the URL names.
 */
export const dynamicParams = false

export async function generateStaticParams() {
  // Derived from the live registry on every build. The corpus grows constantly, so a hardcoded list
  // here would silently stop publishing new lessons the day it was written.
  return listCourseEntries(COURSE_ID).map(({ level, lesson }) => ({
    levelSlug: level.slug,
    lessonId: lesson.id,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug, lessonId } = await params
  const entry = findCatalogEntry(COURSE_ID, levelSlug, lessonId)
  // Unreachable while `dynamicParams` is false; kept so a future config change degrades to an
  // untitled page rather than a build crash.
  if (!entry) return {}
  return learnLessonMetadata(toPublicLessonPreview(entry))
}

/**
 * Previous/next in the course's reading order. Deliberately flat across the whole course rather than
 * scoped to the level, so a crawler can walk the entire track from any lesson and a reader who
 * finishes the last lesson of a level is offered the first of the next.
 */
function buildReadingNav(levelSlug: string, lessonId: string): PublicLessonArticleNav {
  const entries = listCourseEntries(COURSE_ID)
  const index = entries.findIndex(
    (entry) => entry.level.slug === levelSlug && entry.lesson.id === lessonId
  )
  if (index === -1) return { previous: null, next: null }

  const toLink = (offset: number) => {
    const neighbour = entries[index + offset]
    if (!neighbour) return null
    return {
      title: neighbour.lesson.title,
      href: publicLessonPath(COURSE_ID, neighbour.level.slug, neighbour.lesson.id),
    }
  }

  return { previous: toLink(-1), next: toLink(1) }
}

export default async function PublicPythonLessonPage({ params }: Props) {
  const { levelSlug, lessonId } = await params
  const entry = findCatalogEntry(COURSE_ID, levelSlug, lessonId)
  if (!entry) notFound()

  // `toPublicLessonPreview` is the allowlist projection. Nothing that grades or answers survives it,
  // so nothing this component receives can leak into the published HTML.
  const preview = toPublicLessonPreview(entry)

  return <PublicLessonArticle preview={preview} nav={buildReadingNav(levelSlug, lessonId)} />
}
