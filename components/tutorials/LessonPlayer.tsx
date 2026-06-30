"use client"

import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TeachPanel } from "./TeachPanel"
import { ExerciseRunner } from "./ExerciseRunner"
import type { LessonSection, PythonLesson, PythonLevel } from "@/lib/tutorials/types"

const SECTION_ORDER: LessonSection[] = ["teach", "apply", "practice"]
const SECTION_LABEL: Record<LessonSection, string> = {
  teach: "Read",
  apply: "Apply",
  practice: "Practice",
}

/**
 * Drives one lesson through the Read → Apply → Practice loop. Owns the section stepper, the
 * per-exercise editor content (so code survives switching phases), and section completion.
 *
 * `onSectionComplete` is where progress persistence hooks in (Slice B); here it stays a callback so
 * the player is usable on its own and testable without Firestore.
 */
export interface LessonPlayerProps {
  lesson: PythonLesson
  level: PythonLevel
  onSectionComplete?: (section: LessonSection) => void
}

export function LessonPlayer({ lesson, level, onSectionComplete }: LessonPlayerProps) {
  const [active, setActive] = useState<LessonSection>("teach")
  const [completed, setCompleted] = useState<Record<LessonSection, boolean>>({
    teach: false,
    apply: false,
    practice: false,
  })
  const [codeByExercise, setCodeByExercise] = useState<Record<string, string>>({
    [lesson.apply.id]: lesson.apply.starterCode,
    [lesson.practice.id]: lesson.practice.starterCode,
  })

  const markComplete = (section: LessonSection) => {
    setCompleted((prev) => (prev[section] ? prev : { ...prev, [section]: true }))
    onSectionComplete?.(section)
  }

  const setCode = (exerciseId: string, value: string) =>
    setCodeByExercise((prev) => ({ ...prev, [exerciseId]: value }))

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Lesson sections">
        <ol className="flex items-center gap-2">
          {SECTION_ORDER.map((section, i) => {
            const isActive = active === section
            const isDone = completed[section]
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
                {i < SECTION_ORDER.length - 1 && (
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
          <ExerciseRunner
            exercise={lesson.apply}
            code={codeByExercise[lesson.apply.id] ?? lesson.apply.starterCode}
            onCodeChange={(value) => setCode(lesson.apply.id, value)}
            canRevealReference
            onPass={() => markComplete("apply")}
          />
          {completed.apply && (
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
          <ExerciseRunner
            exercise={lesson.practice}
            code={codeByExercise[lesson.practice.id] ?? lesson.practice.starterCode}
            onCodeChange={(value) => setCode(lesson.practice.id, value)}
            onPass={() => markComplete("practice")}
          />
          {completed.practice && (
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
