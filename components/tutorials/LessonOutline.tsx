"use client"

import Link from "next/link"
import { Check, PanelLeftClose } from "lucide-react"
import { LESSON_SECTION_ORDER } from "@/lib/stores/tutorial-store"
import { PHASE_ICON, SECTION_HINT, SECTION_LABEL } from "./lessonPhases"
import type { LessonSection, SectionStatus } from "@/lib/tutorials/types"

/**
 * The lesson workspace's left outline (HANDOFF §C), shown when the rail is expanded: the Read →
 * Apply → Practice stepper (each step iconned, with a clay spine-fill and a check on completed
 * steps; every step is clickable to revisit) plus an "Up next" list of the lessons that follow. When
 * `onCollapse` is provided a collapse control sits by the heading, folding the rail to its slim
 * strip. Purely presentational — the player owns section state and the collapsed/expanded choice.
 */
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
  basePath,
  onCollapse,
  sectionOrder = LESSON_SECTION_ORDER,
  sectionLabels,
}: {
  sections: Record<LessonSection, SectionStatus>
  active: LessonSection
  onSelect: (section: LessonSection) => void
  upNext: UpNextLesson[]
  /** Route prefix for "Up next" links, e.g. "/learn/python" or "/learn/sql". */
  basePath: string
  /** When set, renders a control by the heading that folds the rail to its slim strip. */
  onCollapse?: () => void
  /** Which phases to show, in order. Defaults to the code-course Read → Apply → Practice loop; System
   * Design overrides it to just Read → Design (it has no standalone Practice phase). */
  sectionOrder?: LessonSection[]
  /** Per-phase label overrides merged over the shared defaults (e.g. apply -> "Design"). */
  sectionLabels?: Partial<Record<LessonSection, string>>
}) {
  const labelFor = (section: LessonSection) => sectionLabels?.[section] ?? SECTION_LABEL[section]
  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Lesson sections">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            This lesson
          </p>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse lesson outline"
              aria-expanded={true}
              title="Collapse outline"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-accent/50 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <ol className="relative">
          {sectionOrder.map((section, i) => {
            const isActive = active === section
            const isDone = sections[section] === "completed"
            const isLast = i === sectionOrder.length - 1
            const Icon = PHASE_ICON[section]
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
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
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
                    "focus-visible:ring-accent/50 mb-3 flex-1 rounded-lg px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    isActive ? "bg-accent/[0.07]" : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {labelFor(section)}
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
                  href={`${basePath}/${lesson.levelSlug}/${lesson.id}`}
                  className="group focus-visible:ring-accent/50 hover:bg-muted/50 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
