"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useCompletedLessons } from "./useCompletedLessons"
import { recallLevel } from "@/lib/tutorials/level-preference"
import { lessonWorkspacePath } from "@/lib/tutorials/lesson-routes"
import type { PythonLevelId } from "@/lib/tutorials/types"
import type { PathLevelSummary } from "@/lib/tutorials/level-path"

/**
 * "Continue where you left off" — a Path-hero island shown only when the learner has a remembered
 * level (`cs_py_level`) AND an unfinished lesson in it. Deep-links to the first not-yet-completed
 * lesson of that level. Renders nothing for first-timers (the Path is the entry) or once a level is
 * fully done. Best-effort: degrades to silent when signed out.
 *
 * It links straight into the WORKSPACE rather than the public reading page, and does not need to
 * check auth to do so: the render condition already requires `completed.size > 0`, and completed
 * lessons only ever come back from `fetchAllProgress()` for a signed-in user. "Continue" for someone
 * mid-level means the editor, not the article they have already read.
 */
export function ResumeLearning({ levels }: { levels: PathLevelSummary<PythonLevelId>[] }) {
  const completed = useCompletedLessons()

  const target = useMemo(() => {
    const levelId = recallLevel()
    if (!levelId) return null
    const level = levels.find((l) => l.id === levelId)
    if (!level) return null
    const lessons = level.lessons
    const next = lessons.find((l) => !completed.has(l.id))
    // Only offer a resume when there's real, partially-done progress left in the level.
    if (next && completed.size > 0)
      return { levelId: level.id, slug: level.slug, lessonId: next.id }
    return null
  }, [levels, completed])

  if (!target) return null

  return (
    <div className="mt-6 flex justify-center">
      <Link
        href={lessonWorkspacePath("python", target.slug, target.lessonId)}
        className="border-accent/30 bg-accent/10 text-accent-strong hover:bg-accent/15 group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
      >
        Continue Level {target.levelId}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
