/**
 * The one place a Learn track becomes a schema.org `Course`.
 *
 * The hub's `Course list` (the ItemList carousel, the only Course treatment Google still awards)
 * and each track page's standalone `Course` must describe the same course identically, or the
 * structured data contradicts itself across pages. Both surfaces therefore build their
 * `CourseSchemaInput` here and nowhere else.
 *
 * Server-only: this imports the course catalog, which pulls the full authored curriculum. Pages
 * import it at build time; client components never should.
 *
 * Everything variable is derived from the live corpus at build time. `workloadMinutes` sums the
 * authored per-lesson estimates and `teaches` lists the level subjects, because a concurrent
 * authoring loop keeps growing the curriculum and any hand-written number or list here would be
 * stale within the week.
 */
import type { CourseSchemaInput } from "@/components/seo/JsonLd"
import { listCourseEntries, listCourseLevels } from "@/lib/tutorials/course-catalog"
import { LEARN_COURSE_LABEL, trackPath } from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * Course descriptions are the one hand-written part: they state what is true of the track as a
 * whole (free, in-browser, graded), not counts that drift. Google displays ~60 characters, so the
 * substance leads.
 */
const COURSE_DESCRIPTIONS: Record<CourseId, string> = {
  python:
    "Free interactive Python course in the browser: read a concept, apply it on a guided exercise, then practice it on an interview-shaped problem with automated grading.",
  sql: "Free interactive SQL course in the browser: real queries against seeded tables, graded instantly, from SELECT basics to the window functions and pipeline patterns data engineering interviews test.",
  "system-design":
    "Free system design course: read each concept, then write your own design answer and compare it against a model answer, from the interview method to distributed systems and case studies.",
}

/** Strip the numbering prefix from a level title, e.g. "Level 5: Judging Code..." -> "Judging Code...". */
function levelSubject(levelTitle: string): string {
  return levelTitle.replace(/^Level\s+\d+\s*[:—-]\s*/i, "").trim()
}

/** Build the shared `Course` input for one Learn track, from the live corpus. */
export function learnCourseSchemaInput(courseId: CourseId): CourseSchemaInput {
  const workloadMinutes = listCourseEntries(courseId).reduce(
    (sum, entry) => sum + entry.lesson.estimatedMinutes,
    0
  )
  const teaches = listCourseLevels(courseId).map((level) => levelSubject(level.title))

  return {
    name: `Learn ${LEARN_COURSE_LABEL[courseId]}`,
    description: COURSE_DESCRIPTIONS[courseId],
    url: trackPath(courseId),
    workloadMinutes,
    teaches,
  }
}
