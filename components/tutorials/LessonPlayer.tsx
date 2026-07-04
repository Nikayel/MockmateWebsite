"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  computeLessonProgress,
  LESSON_SECTION_ORDER,
  useTutorialStore,
} from "@/lib/stores/tutorial-store"
import {
  getFirstLessonOfNextLevel,
  getNextLessonInLevel,
  listLessonsInLevel,
} from "@/lib/tutorials/registry"
import { useCompletedLessons } from "./useCompletedLessons"
import { rememberLevel } from "@/lib/tutorials/level-preference"
import { TeachPanel } from "./TeachPanel"
import { ExerciseRunner } from "./ExerciseRunner"
import { WorkspaceExerciseRunner } from "./WorkspaceExerciseRunner"
import { useTutorialProgressSync } from "./useTutorialProgressSync"
import { LessonOutline, type UpNextLesson } from "./LessonOutline"
import { LessonHeader } from "./LessonHeader"
import { LessonErrorBanner, LessonLoadingState } from "./LessonProgressStates"
import { SectionDoneButton } from "./SectionDoneButton"
import { SableTutor } from "./SableTutor"
import { VerticalRail } from "./VerticalRail"
import { usePersistentState } from "./usePersistentState"
import type {
  LessonSection,
  PythonExercise,
  PythonLesson,
  PythonLevel,
} from "@/lib/tutorials/types"

/**
 * Screen 2 — the lesson workspace (HANDOFF §C). A full-height 3-column tool
 * `[248px outline | 1fr lesson | 300px tutor]`: the Read → Apply → Practice stepper + "Up next" on
 * the left, the active phase in the center, and Sable (the AI tutor) on the right. Section status
 * lives in `useTutorialStore` (persisted by `useTutorialProgressSync`); per-exercise editor text is
 * local UI state so it survives phase switches. Below 1080px the workspace scrolls as one unit.
 */
const UP_NEXT_COUNT = 5

export interface LessonPlayerProps {
  lesson: PythonLesson
  level: PythonLevel
  onSectionComplete?: (section: LessonSection) => void
}

/** What the post-Practice CTA offers, kept level-aware so a boundary is a deliberate hand-off. */
type NextStep =
  | { kind: "lesson"; id: string; title: string; slug: string }
  | {
      kind: "level-complete"
      id: string
      title: string
      slug: string
      levelId: PythonLevel["id"]
      levelTitle: string
    }
  | { kind: "finished" }

export function LessonPlayer({ lesson, level, onSectionComplete }: LessonPlayerProps) {
  const { reload } = useTutorialProgressSync(lesson.id, level.id)

  const sections = useTutorialStore((s) => s.sections)
  const isLoading = useTutorialStore((s) => s.isLoading)
  const error = useTutorialStore((s) => s.error)
  const completeSection = useTutorialStore((s) => s.completeSection)
  const startSection = useTutorialStore((s) => s.startSection)

  const [active, setActive] = useState<LessonSection>("teach")
  const centerRef = useRef<HTMLElement>(null)
  const [codeByExercise, setCodeByExercise] = useState<Record<string, string>>({
    [lesson.apply.id]: lesson.apply.starterCode,
    [lesson.practice.id]: lesson.practice.starterCode,
  })

  // Which exercises passed this session — gates the "Mark as done" control (grading stays the bar to
  // complete; the learner saves the section when they choose to).
  const [passedSections, setPassedSections] = useState<Partial<Record<LessonSection, boolean>>>({})
  const markPassed = (section: LessonSection) =>
    setPassedSections((prev) => ({ ...prev, [section]: true }))

  // The AI tutor (Sable) is locked / "coming soon"; its column is collapsible and the state persists.
  const [tutorOpen, setTutorOpen] = usePersistentState("cs_py_tutor_open", "1")

  // Remember this level for the Path's "continue" behavior whenever a lesson is open.
  useEffect(() => {
    rememberLevel(level.id)
  }, [level.id])

  // This route is a Client Component (no generateMetadata), so set the tab title from the lesson.
  useEffect(() => {
    const previous = document.title
    document.title = `${lesson.title} — Learn Python`
    return () => {
      document.title = previous
    }
  }, [lesson.title])

  // Position within the level + the cross-curriculum "Up next" list (completion hydrated best-effort).
  const completedIds = useCompletedLessons()

  const { lessonNumber, totalInLevel, upNext } = useMemo(() => {
    // "Up next" is scoped to the current level: it must never bleed into another level. At the
    // level's last lesson this is empty, and the deliberate level hand-off (`nextStep`) takes over.
    const inLevel = listLessonsInLevel(level)
    const idx = inLevel.findIndex((l) => l.id === lesson.id)
    const next: UpNextLesson[] = inLevel.slice(idx + 1, idx + 1 + UP_NEXT_COUNT).map((l) => ({
      id: l.id,
      title: l.title,
      levelSlug: level.slug,
      isCompleted: completedIds.has(l.id),
    }))
    return { lessonNumber: idx + 1, totalInLevel: inLevel.length, upNext: next }
  }, [level, lesson.id, completedIds])

  // Where the "Next lesson" CTA points after Practice: the next in-level lesson, a deliberate
  // level-complete hand-off at a boundary, or the end of the path. Crossing a level is never silent.
  const nextStep = useMemo((): NextStep => {
    const withinLevel = getNextLessonInLevel(lesson.id)
    if (withinLevel) {
      return { kind: "lesson", id: withinLevel.id, title: withinLevel.title, slug: level.slug }
    }
    const nextLevel = getFirstLessonOfNextLevel(lesson.id)
    if (nextLevel) {
      return {
        kind: "level-complete",
        id: nextLevel.lesson.id,
        title: nextLevel.lesson.title,
        slug: nextLevel.level.slug,
        levelId: nextLevel.level.id,
        levelTitle: nextLevel.level.title,
      }
    }
    return { kind: "finished" }
  }, [lesson.id, level.slug])

  // Resume: once saved progress loads, open the first not-completed section (once).
  const didResume = useRef(false)
  useEffect(() => {
    if (isLoading || didResume.current) return
    didResume.current = true
    const next = LESSON_SECTION_ORDER.find((s) => sections[s] !== "completed")
    if (next) setActive(next)
  }, [isLoading, sections])

  const goToSection = (section: LessonSection) => {
    setActive(section)
    // Entering a section is genuine engagement: mark it in-progress so partial work (read Read,
    // opened Apply) persists and resume returns here. No-op once completed. (Bare visits aren't
    // persisted because the default Read section is opened via useState, not this handler.)
    startSection(section)
  }

  // Reset the reading area to the top whenever the phase changes (revisit or advance).
  useEffect(() => {
    centerRef.current?.scrollTo({ top: 0 })
  }, [active])

  const markComplete = (section: LessonSection) => {
    completeSection(section, section === "practice" ? 100 : undefined)
    onSectionComplete?.(section)
  }

  const setCode = (exerciseId: string, value: string) =>
    setCodeByExercise((prev) => ({ ...prev, [exerciseId]: value }))

  const renderExercise = (
    exercise: PythonExercise,
    _section: LessonSection,
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

  const progress = computeLessonProgress(sections)

  return (
    <div className="flex h-[100dvh] flex-col">
      <a
        href="#lesson-main"
        className="bg-accent text-accent-foreground focus-visible:ring-accent/50 sr-only z-50 rounded-md px-3 py-1.5 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to lesson
      </a>
      {/* Top bar (§C): brand · level badge · title · lesson n/total + progress · theme · Levels. */}
      <header className="border-border bg-background/80 flex shrink-0 items-center gap-3 border-b px-4 py-2.5 backdrop-blur-md">
        <Link href="/learn/python" className="text-foreground text-sm font-semibold tracking-tight">
          CodeSparring
        </Link>
        <Link
          href={`/learn/python/${level.slug}`}
          className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/15 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
        >
          LEVEL {level.id}
        </Link>
        <span className="text-foreground hidden truncate text-sm font-medium sm:block">
          {lesson.title}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              Lesson {lessonNumber} / {totalInLevel}
            </span>
            <span
              className="bg-muted h-1.5 w-24 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Lesson progress"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="bg-accent block h-full rounded-full transition-[width] duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </span>
          </div>
          <ThemeToggle />
          <Link
            href="/learn/python"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Levels</span>
          </Link>
        </div>
      </header>

      {/* Below 1080px the whole workspace scrolls horizontally as one unit. The tutor column
          collapses to a slim rail, giving the lesson more room. */}
      <div className="flex-1 overflow-x-auto">
        <div
          className={[
            "grid h-full min-w-[1080px]",
            tutorOpen === "1"
              ? "grid-cols-[248px_minmax(400px,1fr)_300px]"
              : "grid-cols-[248px_minmax(400px,1fr)_2.5rem]",
          ].join(" ")}
        >
          <div className="border-border overflow-y-auto border-r px-4 py-6">
            <LessonOutline
              sections={sections}
              active={active}
              onSelect={goToSection}
              upNext={upNext}
              basePath="/learn/python"
            />
          </div>

          <main
            id="lesson-main"
            ref={centerRef}
            tabIndex={-1}
            className="overflow-y-auto px-6 py-6 focus:outline-none"
            aria-label="Lesson content"
          >
            <div className="mx-auto max-w-2xl">
              <LessonHeader lesson={lesson} />

              {error && <LessonErrorBanner error={error} onReload={reload} />}

              {isLoading && <LessonLoadingState />}

              {!isLoading && active === "teach" && (
                <TeachPanel
                  teach={lesson.teach}
                  onContinue={() => {
                    markComplete("teach")
                    goToSection("apply")
                  }}
                />
              )}

              {!isLoading && active === "apply" && (
                <div className="flex flex-col gap-4">
                  {renderExercise(lesson.apply, "apply", {
                    canRevealReference: true,
                    onPass: () => markPassed("apply"),
                  })}
                  <SectionDoneButton
                    passed={Boolean(passedSections.apply)}
                    completed={sections.apply === "completed"}
                    onMarkDone={() => markComplete("apply")}
                  />
                  {sections.apply === "completed" && (
                    <div>
                      <Button onClick={() => goToSection("practice")} className="gap-2">
                        Practice it
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && active === "practice" && (
                <div className="flex flex-col gap-4">
                  {renderExercise(lesson.practice, "practice", {
                    onPass: () => markPassed("practice"),
                  })}
                  <SectionDoneButton
                    passed={Boolean(passedSections.practice)}
                    completed={sections.practice === "completed"}
                    onMarkDone={() => markComplete("practice")}
                  />
                  {sections.practice === "completed" && (
                    <div className="flex flex-col gap-3">
                      <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Lesson complete. Nice work. This idea resurfaces in 3 days for spaced
                        practice.
                      </p>
                      <div>
                        {nextStep.kind === "lesson" && (
                          <Button asChild className="gap-2">
                            <Link href={`/learn/python/${nextStep.slug}/${nextStep.id}`}>
                              Next lesson: {nextStep.title}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {nextStep.kind === "level-complete" && (
                          <div className="border-accent/40 bg-accent/[0.07] flex flex-col gap-3 rounded-xl border p-4">
                            <p className="text-foreground text-sm font-semibold">
                              Level {level.id} complete. You finished {level.title}.
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Next up: Level {nextStep.levelId}, {nextStep.levelTitle}.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild className="gap-2">
                                <Link href={`/learn/python/${nextStep.slug}/${nextStep.id}`}>
                                  Start Level {nextStep.levelId}
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button asChild variant="outline" className="gap-2">
                                <Link href="/learn/python">
                                  <ArrowLeft className="h-4 w-4" />
                                  All levels
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                        {nextStep.kind === "finished" && (
                          <Button asChild variant="outline" className="gap-2">
                            <Link href="/learn/python">
                              <ArrowLeft className="h-4 w-4" />
                              You finished the path. Back to levels
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>

          {tutorOpen === "1" ? (
            <div className="border-border overflow-hidden border-l p-3">
              <SableTutor onCollapse={() => setTutorOpen("0")} />
            </div>
          ) : (
            <VerticalRail label="Sable" side="right" onExpand={() => setTutorOpen("1")} />
          )}
        </div>
      </div>
    </div>
  )
}
