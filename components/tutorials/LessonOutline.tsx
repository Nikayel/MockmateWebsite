"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { LESSON_SECTION_ORDER } from "@/lib/stores/tutorial-store"
import type { LessonSection, SectionStatus } from "@/lib/tutorials/types"

/**
 * The lesson workspace's left outline (HANDOFF §C): the Read → Apply → Practice stepper (numbered,
 * with a clay spine-fill and a check on completed steps; every step is clickable to revisit) plus an
 * "Up next" list of the lessons that follow. Purely presentational — the player owns section state.
 */
const SECTION_LABEL: Record<LessonSection, string> = {
  teach: "Read",
  apply: "Apply",
  practice: "Practice",
}

const SECTION_HINT: Record<LessonSection, string> = {
  teach: "Understand it",
  apply: "Write it yourself",
  practice: "A real-world variant",
}

export interface UpNextLesson {
  id: string
  title: string
  levelSlug: string
  isCompleted: boolean
}

export function LessonOutline({
  sections,
  active,
  onSelect,
  upNext,
}: {
  sections: Record<LessonSection, SectionStatus>
  active: LessonSection
  onSelect: (section: LessonSection) => void
  upNext: UpNextLesson[]
}) {
  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Lesson sections">
        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
          This lesson
        </p>
        <ol className="relative">
          {LESSON_SECTION_ORDER.map((section, i) => {
            const isActive = active === section
            const isDone = sections[section] === "completed"
            const isLast = i === LESSON_SECTION_ORDER.length - 1
            return (
              <li key={section} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      isDone
                        ? "bg-accent text-accent-foreground border-transparent"
                        : isActive
                          ? "border-accent text-accent"
                          : "border-border text-muted-foreground",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {!isLast && (
                    <span
                      className={[
                        "my-1 w-px flex-1 transition-colors",
                        isDone ? "bg-accent" : "bg-border",
                      ].join(" ")}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(section)}
                  aria-current={isActive ? "step" : undefined}
                  className={[
                    "mb-3 flex-1 rounded-lg px-3 py-2 text-left transition-colors",
                    isActive ? "bg-accent/[0.07]" : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {SECTION_LABEL[section]}
                  </span>
                  <span className="text-muted-foreground/80 block text-xs">
                    {SECTION_HINT[section]}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {upNext.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Up next
          </p>
          <ul className="space-y-1">
            {upNext.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/learn/python/${lesson.levelSlug}/${lesson.id}`}
                  className="group hover:bg-muted/50 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors"
                >
                  <span
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      lesson.isCompleted
                        ? "bg-accent text-accent-foreground"
                        : "border-border border",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {lesson.isCompleted && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground truncate text-sm transition-colors">
                    {lesson.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
