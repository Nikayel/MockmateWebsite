/**
 * Which course a lesson belongs to, from its id prefix (`sd-` → system-design, `sql-`/`de-` → the
 * data-engineering track, else python). Persisted on progress docs, item-response rows, and
 * learn-time rollups so all three collections group identically without a backfill. `de-` is the
 * prefix for the Data Engineering levels (L7+); the frozen `sql-` ids share the same course.
 *
 * Single home for this derivation: progress, item telemetry, and time tracking must never
 * disagree about which course a lesson belongs to.
 */
import type { CourseId } from "./types"

export function courseIdFromLessonId(lessonId: string): CourseId {
  if (lessonId.startsWith("sd-")) return "system-design"
  if (lessonId.startsWith("sql-") || lessonId.startsWith("de-")) return "data-engineering"
  return "python"
}
