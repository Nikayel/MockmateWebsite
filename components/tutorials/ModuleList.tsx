import { LessonRow } from "./LessonRow"
import type { PythonLevel } from "@/lib/tutorials/types"

/**
 * A level's modules with their lessons. Handles the empty (not-yet-authored) level shells.
 * `completedLessonIds` is an optional client-hydrated overlay (the server list renders without it).
 */
export function ModuleList({
  level,
  completedLessonIds,
}: {
  level: PythonLevel
  completedLessonIds?: Set<string>
}) {
  if (level.modules.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        Lessons for this level are coming soon.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {level.modules.map((mod) => (
        <section key={mod.id}>
          <h2 className="text-foreground text-lg font-semibold">{mod.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{mod.description}</p>
          <ul className="mt-3 space-y-2">
            {mod.lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                levelSlug={level.slug}
                lesson={lesson}
                isCompleted={completedLessonIds?.has(lesson.id) ?? false}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
