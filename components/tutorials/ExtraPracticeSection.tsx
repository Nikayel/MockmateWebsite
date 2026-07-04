"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, Dumbbell } from "lucide-react"

/**
 * Collapsible "Extra practice (optional)" list rendered below the main practice problem. Drills are
 * authored easy → hard and graded by the same runner the lesson already uses, but they do NOT gate
 * lesson completion, so the progress model is unchanged. Renders nothing when a lesson has no drills.
 * Shared by the Python and SQL players (only SQL ships drills today).
 */
const DIFFICULTY_LABEL = ["Easy", "Medium", "Hard"]

export function ExtraPracticeSection<E extends { id: string }>({
  exercises,
  renderExercise,
}: {
  exercises: E[]
  /** How to render one drill — the caller supplies its course-specific runner. */
  renderExercise: (exercise: E) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (exercises.length === 0) return null

  return (
    <section className="border-border rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-visible:ring-accent/50 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <Dumbbell className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-foreground text-sm font-medium">Extra practice (optional)</span>
        <span className="text-muted-foreground text-xs">
          {exercises.length} {exercises.length === 1 ? "drill" : "drills"}, easy to hard
        </span>
        <ChevronDown
          className={[
            "text-muted-foreground ml-auto h-4 w-4 shrink-0 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="flex flex-col gap-8 px-3 pt-1 pb-4">
          {exercises.map((exercise, i) => (
            <div key={exercise.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-foreground text-sm font-semibold">Drill {i + 1}</span>
                <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                  {DIFFICULTY_LABEL[i] ?? "Hard"}
                </span>
              </div>
              {renderExercise(exercise)}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
