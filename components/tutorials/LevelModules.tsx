"use client"

import { useMemo } from "react"
import { ModuleList } from "./ModuleList"
import { useCompletedLessons } from "./useCompletedLessons"
import type { PythonLevel } from "@/lib/tutorials/types"

/**
 * Client island for the level's module list: hydrates per-lesson completion from saved progress
 * (best-effort — empty when signed out) and shows a small "n of total done" summary. Lets the
 * module-list PAGE stay a Server Component (HANDOFF §C hard rule) while still overlaying progress.
 */
export function LevelModules({ level }: { level: PythonLevel }) {
  const completedLessonIds = useCompletedLessons()

  const { total, done } = useMemo(() => {
    const lessons = level.modules.flatMap((mod) => mod.lessons)
    return {
      total: lessons.length,
      done: lessons.filter((l) => completedLessonIds.has(l.id)).length,
    }
  }, [level, completedLessonIds])

  return (
    <div className="flex flex-col gap-6">
      {total > 0 && done > 0 && (
        <div className="flex items-center gap-3">
          <span
            className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Level progress"
            aria-valuenow={Math.round((done / total) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="bg-accent block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </span>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {done} / {total} done
          </span>
        </div>
      )}
      <ModuleList level={level} completedLessonIds={completedLessonIds} />
    </div>
  )
}
