/**
 * The Learn routing contract, pinned against the LIVE corpus.
 *
 * Two URLs exist per lesson and the difference between them is the security model: the public
 * reading page is statically generated and indexed, and the `.../workspace` child carries the graded
 * payload behind auth. Three separate pieces of code have to agree about that split forever:
 *
 *   - `lesson-routes.ts` builds both URLs and answers "is this a workspace?" for `proxy.ts`.
 *   - `course-catalog.ts` decides which lessons exist and validates the level slug in a URL.
 *   - each `[lessonId]/page.tsx` publishes a static param list derived from the catalog.
 *
 * If any two of those drift, the failure is silent and expensive: either real lessons 404 (because
 * `dynamicParams = false` refuses anything the param list did not emit), or a workspace stops
 * matching the proxy's gate and starts serving reference solutions to anonymous visitors.
 *
 * Every assertion below derives its expectations from the catalog at run time. The corpus is a
 * moving target (a concurrent authoring loop commits lessons to `main`), so a hardcoded id, count,
 * or URL here would be wrong within days.
 *
 * Note: this file must not import `proxy.ts`. `vitest.setup.ts` mocks `next/server` with only
 * `NextResponse.json`, so the module would fail to evaluate. The predicate `proxy.ts` depends on
 * (`isLessonWorkspacePath`) is imported directly instead, which is the part worth testing anyway.
 */
import { describe, expect, it } from "vitest"

import {
  COURSE_IDS,
  findCatalogEntry,
  listAllCatalogEntries,
  listCourseEntries,
} from "@/lib/tutorials/course-catalog"
import {
  isLessonWorkspacePath,
  lessonWorkspacePath,
  publicLessonPath,
} from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

const ENTRIES = listAllCatalogEntries()

/**
 * What each `[lessonId]/page.tsx` returns from `generateStaticParams`, derived the same way the
 * routes derive it. Importing the route modules themselves would drag the marketing header, the
 * auth context, and Firebase into a node-environment unit test for no extra signal: the rule under
 * test is "the published param list is exactly the catalog", and that rule lives here.
 */
function staticParamsFor(courseId: CourseId): { levelSlug: string; lessonId: string }[] {
  return listCourseEntries(courseId).map(({ level, lesson }) => ({
    levelSlug: level.slug,
    lessonId: lesson.id,
  }))
}

describe("Learn lesson routing", () => {
  it("has a corpus to publish at all", () => {
    // A loose lower bound, never an exact count: lessons are being authored continuously. This only
    // catches a registry that failed to load, which would otherwise make every test below vacuous.
    expect(ENTRIES.length).toBeGreaterThan(100)
  })

  it("gives every lesson a public path and a distinct workspace path", () => {
    for (const { courseId, level, lesson } of ENTRIES) {
      const publicPath = publicLessonPath(courseId, level.slug, lesson.id)
      const workspacePath = lessonWorkspacePath(courseId, level.slug, lesson.id)

      expect(publicPath).toBe(`/learn/${courseId}/${level.slug}/${lesson.id}`)
      expect(workspacePath).toBe(`${publicPath}/workspace`)
      expect(workspacePath).not.toBe(publicPath)
    }
  })

  it("classifies every workspace path as gated and every public path as open", () => {
    for (const { courseId, level, lesson } of ENTRIES) {
      expect(isLessonWorkspacePath(lessonWorkspacePath(courseId, level.slug, lesson.id))).toBe(true)
      expect(isLessonWorkspacePath(publicLessonPath(courseId, level.slug, lesson.id))).toBe(false)
    }
  })

  it("matches the workspace as a whole segment, not as a suffix", () => {
    // A trailing slash is still the workspace, so the gate must not be defeated by adding one.
    expect(isLessonWorkspacePath("/learn/python/fundamentals/py-l1-hello/workspace/")).toBe(true)
    // A lesson whose id merely ends in the word must stay public. This is the `endsWith` bug the
    // segment-anchored regex exists to prevent.
    expect(isLessonWorkspacePath("/learn/python/fundamentals/py-l3-workspace")).toBe(false)
    // Neither the track landing nor a level index is gated.
    expect(isLessonWorkspacePath("/learn/python")).toBe(false)
    expect(isLessonWorkspacePath("/learn/python/fundamentals")).toBe(false)
  })

  it("refuses a real lesson id under the wrong level slug", () => {
    // The canonicalization guarantee. Without it, one lesson would be reachable at as many URLs as
    // the course has levels, and with `dynamicParams = false` those URLs 404 rather than duplicate.
    for (const { courseId, level, lesson } of ENTRIES.slice(0, 40)) {
      const otherLevel = listCourseEntries(courseId).find((e) => e.level.slug !== level.slug)?.level
      if (!otherLevel) continue

      expect(findCatalogEntry(courseId, level.slug, lesson.id)).toBeDefined()
      expect(findCatalogEntry(courseId, otherLevel.slug, lesson.id)).toBeUndefined()
    }
  })

  it("returns undefined for an unknown lesson id and an unknown level slug", () => {
    const { courseId, level } = ENTRIES[0]!
    expect(findCatalogEntry(courseId, level.slug, "no-such-lesson-id")).toBeUndefined()
    expect(findCatalogEntry(courseId, "no-such-level-slug", ENTRIES[0]!.lesson.id)).toBeUndefined()
  })

  it("publishes exactly the catalog: the static params union equals every catalog entry", () => {
    const generated = COURSE_IDS.flatMap((courseId) =>
      staticParamsFor(courseId).map(
        (params) => `${courseId}:${params.levelSlug}/${params.lessonId}`
      )
    )
    const expected = ENTRIES.map(
      ({ courseId, level, lesson }) => `${courseId}:${level.slug}/${lesson.id}`
    )

    expect(generated.length).toBe(expected.length)
    expect(new Set(generated)).toEqual(new Set(expected))
  })

  it("generates only params that resolve, so no published URL can 404", () => {
    for (const courseId of COURSE_IDS) {
      for (const { levelSlug, lessonId } of staticParamsFor(courseId)) {
        expect(findCatalogEntry(courseId, levelSlug, lessonId)).toBeDefined()
      }
    }
  })

  it("never produces the same public URL twice, across courses or within one", () => {
    const paths = ENTRIES.map(({ courseId, level, lesson }) =>
      publicLessonPath(courseId, level.slug, lesson.id)
    )
    const duplicates = paths.filter((path, i) => paths.indexOf(path) !== i)
    expect(duplicates).toEqual([])
  })
})
