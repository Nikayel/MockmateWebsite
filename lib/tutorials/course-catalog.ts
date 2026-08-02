/**
 * Course catalog — the course-agnostic read over all three curriculum registries.
 *
 * The three registries are deliberate near-duplicates (`listLevels` / `listSqlLevels` /
 * `listSystemDesignLevels`, and so on) because each is typed to its own exercise payload. Anything
 * that has to walk EVERY course (the sitemap, `generateStaticParams`, the sealing test, the public
 * reading routes) would otherwise triplicate that walk and drift the day a fourth course lands.
 * This module is that walk, written once, over the shared `TutorialLevel<AuthoredExercise>` view.
 *
 * The corpus is a moving target: a concurrent authoring loop commits new lessons to `main`, and the
 * Python track grew while this feature was being designed. So **nothing downstream may hardcode a
 * lesson id, a count, or a URL** — every list is derived here at build time.
 *
 * Server-only by construction: importing this pulls in the full authored curriculum (megabytes).
 * Client components must import `lesson-routes.ts` instead, which is pure string building.
 */
import { listLevels } from "./registry"
import { listSqlLevels } from "./sql/registry"
import { listSystemDesignLevels } from "./system-design/registry"
import type { AuthoredLesson, AuthoredLevel } from "./public-preview"
import type { CourseId } from "./types"

/** Every course id, in the order they should appear in navigation and in the sitemap. */
export const COURSE_IDS: readonly CourseId[] = ["python", "sql", "system-design"] as const

/** One lesson, together with the course and level that locate it. The unit every walk yields. */
export interface CatalogEntry {
  courseId: CourseId
  level: AuthoredLevel
  lesson: AuthoredLesson
}

/** One level, together with its course. */
export interface CatalogLevel {
  courseId: CourseId
  level: AuthoredLevel
}

/**
 * Every level of one course, widened to the shared view.
 *
 * The cast-free widening works because `TutorialLevel<E>` only ever produces `E` (it never consumes
 * one), so `TutorialLevel<PythonExercise>` is assignable to `TutorialLevel<AuthoredExercise>`.
 */
export function listCourseLevels(courseId: CourseId): AuthoredLevel[] {
  switch (courseId) {
    case "python":
      return listLevels()
    case "sql":
      return listSqlLevels()
    case "system-design":
      return listSystemDesignLevels()
  }
}

/** Every level across every course, in course then curriculum order. */
export function listAllCourseLevels(): CatalogLevel[] {
  return COURSE_IDS.flatMap((courseId) =>
    listCourseLevels(courseId).map((level) => ({ courseId, level }))
  )
}

/**
 * Every lesson across every course, in course then curriculum order. The spine behind the sitemap,
 * `generateStaticParams`, and the sealing test, so all three provably cover the same set.
 */
export function listAllCatalogEntries(): CatalogEntry[] {
  return listAllCourseLevels().flatMap(({ courseId, level }) =>
    level.modules.flatMap((mod) => mod.lessons.map((lesson) => ({ courseId, level, lesson })))
  )
}

/**
 * Resolve one lesson within one course. Returns `undefined` for an unknown id, which the routes turn
 * into a 404.
 *
 * Note the deliberate asymmetry with the existing per-course `get*LessonLocation` helpers: this one
 * also verifies `levelSlug`, so `/learn/python/engineering/py-l1-hello` does NOT render the lesson
 * under the wrong level. That would otherwise be an unbounded set of duplicate URLs for the same
 * content, which is exactly the canonicalization problem a 350-page public corpus cannot afford.
 */
export function findCatalogEntry(
  courseId: CourseId,
  levelSlug: string,
  lessonId: string
): CatalogEntry | undefined {
  for (const level of listCourseLevels(courseId)) {
    if (level.slug !== levelSlug) continue
    for (const mod of level.modules) {
      const lesson = mod.lessons.find((candidate) => candidate.id === lessonId)
      if (lesson) return { courseId, level, lesson }
    }
  }
  return undefined
}

/** Resolve one level by slug within one course. */
export function findCatalogLevel(courseId: CourseId, levelSlug: string): AuthoredLevel | undefined {
  return listCourseLevels(courseId).find((level) => level.slug === levelSlug)
}

/** Flat lesson list for one course, in curriculum order. */
export function listCourseEntries(courseId: CourseId): CatalogEntry[] {
  return listCourseLevels(courseId).flatMap((level) =>
    level.modules.flatMap((mod) => mod.lessons.map((lesson) => ({ courseId, level, lesson })))
  )
}
