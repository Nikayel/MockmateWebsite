"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LESSON_SECTION_ORDER, useTutorialStore } from "@/lib/stores/tutorial-store"
import { TeachPanel } from "./TeachPanel"
import { ExerciseRunner } from "./ExerciseRunner"
import { WorkspaceExerciseRunner } from "./WorkspaceExerciseRunner"
import { useTutorialProgressSync } from "./useTutorialProgressSync"
import type {
  LessonSection,
  PythonExercise,
  PythonLesson,
  PythonLevel,
} from "@/lib/tutorials/types"

const SECTION_LABEL: Record<LessonSection, string> = {
  teach: "Read",
  apply: "Apply",
  practice: "Practice",
}

/**
 * Drives one lesson through the Read → Apply → Practice loop. Section completion + lesson status
 * live in `useTutorialStore` (persisted by `useTutorialProgressSync`); per-exercise editor text is
 * local UI state so it survives switching phases. On resume, opens the first incomplete section.
 */
export interface LessonPlayerProps {
  lesson: PythonLesson
  level: PythonLevel
  onSectionComplete?: (section: LessonSection) => void
}

export function LessonPlayer({ lesson, level, onSectionComplete }: LessonPlayerProps) {
  useTutorialProgressSync(lesson.id, level.id)

  const sections = useTutorialStore((s) => s.sections)
  const isLoading = useTutorialStore((s) => s.isLoading)
  const completeSection = useTutorialStore((s) => s.completeSection)

  const [active, setActive] = useState<LessonSection>("teach")
  const [codeByExercise, setCodeByExercise] = useState<Record<string, string>>({
    [lesson.apply.id]: lesson.apply.starterCode,
    [lesson.practice.id]: lesson.practice.starterCode,
  })

  // Resume: once the saved progress has loaded, open the first not-completed section (once).
  const didResume = useRef(false)
  useEffect(() => {
    if (isLoading || didResume.current) return
    didResume.current = true
    const next = LESSON_SECTION_ORDER.find((s) => sections[s] !== "completed")
    if (next) setActive(next)
  }, [isLoading, sections])

  const markComplete = (section: LessonSection) => {
    // onPass fires only when every test passes, so practice completion is a 100% score.
    completeSection(section, section === "practice" ? 100 : undefined)
    onSectionComplete?.(section)
  }

  const setCode = (exerciseId: string, value: string) =>
    setCodeByExercise((prev) => ({ ...prev, [exerciseId]: value }))

  // Single-file vs workspace exercises use different editor surfaces but the same grading path.
  const renderExercise = (
    exercise: PythonExercise,
    opts: { canRevealReference?: boolean; onPass: () => void }
  ) => {
    if (exercise.executionMode === "workspace" && exercise.workspace) {
      return (
        <WorkspaceExerciseRunner
          exercise={exercise}
          workspace={exercise.workspace}
          onPass={opts.onPass}
        />
      )
    }
    return (
      <ExerciseRunner
        exercise={exercise}
        code={codeByExercise[exercise.id] ?? exercise.starterCode}
        onCodeChange={(value) => setCode(exercise.id, value)}
        canRevealReference={opts.canRevealReference}
        onPass={opts.onPass}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Lesson sections">
        <ol className="flex items-center gap-2">
          {LESSON_SECTION_ORDER.map((section, i) => {
            const isActive = active === section
            const isDone = sections[section] === "completed"
            return (
              <li key={section} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(section)}
                  aria-current={isActive ? "step" : undefined}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      isDone ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {SECTION_LABEL[section]}
                </button>
                {i < LESSON_SECTION_ORDER.length - 1 && (
                  <span className="bg-border h-px w-4" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {active === "teach" && (
        <TeachPanel
          teach={lesson.teach}
          onContinue={() => {
            markComplete("teach")
            setActive("apply")
          }}
        />
      )}

      {active === "apply" && (
        <div className="flex flex-col gap-4">
          {renderExercise(lesson.apply, {
            canRevealReference: true,
            onPass: () => markComplete("apply"),
          })}
          {sections.apply === "completed" && (
            <div>
              <Button onClick={() => setActive("practice")} className="gap-2">
                Practice it
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {active === "practice" && (
        <div className="flex flex-col gap-4">
          {renderExercise(lesson.practice, { onPass: () => markComplete("practice") })}
          {sections.practice === "completed" && (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Lesson complete — nice work. This idea resurfaces in 3 days for spaced practice.
            </p>
          )}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {level.title} · Lesson: {lesson.title}
      </p>
    </div>
  )
}
