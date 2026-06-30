"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  computeLessonProgress,
  LESSON_SECTION_ORDER,
  useTutorialStore,
} from "@/lib/stores/tutorial-store"
import { getLessonLocation, listAllLessons } from "@/lib/tutorials/registry"
import { fetchAllProgress } from "@/lib/tutorials/progress-client"
import { rememberLevel } from "@/lib/tutorials/level-preference"
import { TeachPanel } from "./TeachPanel"
import { ExerciseRunner } from "./ExerciseRunner"
import { WorkspaceExerciseRunner } from "./WorkspaceExerciseRunner"
import { useTutorialProgressSync } from "./useTutorialProgressSync"
import { LessonOutline, type UpNextLesson } from "./LessonOutline"
import { LessonHeader } from "./LessonHeader"
import { SableTutor, type SableEvent, type SableEventInput } from "./SableTutor"
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

  // Sable's reaction stream — the player is the single source of events; ids keep React keys stable.
  const [events, setEvents] = useState<SableEvent[]>([])
  const eventId = useRef(0)
  const pushEvent = useCallback((event: SableEventInput) => {
    setEvents((prev) => [...prev, { ...event, id: eventId.current++ } as SableEvent])
  }, [])

  // Remember this level for the Path's "continue" behavior whenever a lesson is open.
  useEffect(() => {
    rememberLevel(level.id)
  }, [level.id])

  // Position within the level + the cross-curriculum "Up next" list (completion hydrated best-effort).
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    let active = true
    fetchAllProgress()
      .then((items) => {
        if (active)
          setCompletedIds(
            new Set(items.filter((p) => p.lessonStatus === "completed").map((p) => p.lessonId))
          )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const { lessonNumber, totalInLevel, upNext } = useMemo(() => {
    const inLevel = level.modules.flatMap((mod) => mod.lessons)
    const idx = inLevel.findIndex((l) => l.id === lesson.id)
    const all = listAllLessons()
    const globalIdx = all.findIndex((l) => l.id === lesson.id)
    const next: UpNextLesson[] = all
      .slice(globalIdx + 1, globalIdx + 1 + UP_NEXT_COUNT)
      .map((l) => ({
        id: l.id,
        title: l.title,
        levelSlug: getLessonLocation(l.id)?.level.slug ?? level.slug,
        isCompleted: completedIds.has(l.id),
      }))
    return { lessonNumber: idx + 1, totalInLevel: inLevel.length, upNext: next }
  }, [level, lesson.id, completedIds])

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
    pushEvent({ kind: "phase", section })
  }

  const markComplete = (section: LessonSection) => {
    completeSection(section, section === "practice" ? 100 : undefined)
    pushEvent({ kind: "complete", section })
    onSectionComplete?.(section)
  }

  const setCode = (exerciseId: string, value: string) =>
    setCodeByExercise((prev) => ({ ...prev, [exerciseId]: value }))

  const renderExercise = (
    exercise: PythonExercise,
    section: LessonSection,
    opts: { canRevealReference?: boolean; onPass: () => void }
  ) => {
    const shared = {
      onRunResult: (passed: boolean) => pushEvent({ kind: "run", passed, section }),
    }
    if (exercise.executionMode === "workspace" && exercise.workspace) {
      return (
        <WorkspaceExerciseRunner
          exercise={exercise}
          workspace={exercise.workspace}
          onPass={opts.onPass}
          {...shared}
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
        onHintReveal={(index, total) => pushEvent({ kind: "hint", index, total })}
        onReferenceReveal={() => pushEvent({ kind: "reference" })}
        {...shared}
      />
    )
  }

  const progress = computeLessonProgress(sections)

  return (
    <div className="flex h-[100dvh] flex-col">
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
            <span className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
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

      {/* Below 1080px the whole workspace scrolls horizontally as one unit. */}
      <div className="flex-1 overflow-x-auto">
        <div className="grid h-full min-w-[1080px] grid-cols-[248px_minmax(400px,1fr)_300px]">
          <div className="border-border overflow-y-auto border-r px-4 py-6">
            <LessonOutline
              sections={sections}
              active={active}
              onSelect={goToSection}
              upNext={upNext}
            />
          </div>

          <div className="overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl">
              <LessonHeader lesson={lesson} />

              {active === "teach" && (
                <TeachPanel teach={lesson.teach} onContinue={() => goToSection("apply")} />
              )}

              {active === "apply" && (
                <div className="flex flex-col gap-4">
                  {renderExercise(lesson.apply, "apply", {
                    canRevealReference: true,
                    onPass: () => markComplete("apply"),
                  })}
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

              {active === "practice" && (
                <div className="flex flex-col gap-4">
                  {renderExercise(lesson.practice, "practice", {
                    onPass: () => markComplete("practice"),
                  })}
                  {sections.practice === "completed" && (
                    <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Lesson complete — nice work. This idea resurfaces in 3 days for spaced
                      practice.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-border overflow-hidden border-l p-3">
            <SableTutor level={level} lesson={lesson} events={events} />
          </div>
        </div>
      </div>
    </div>
  )
}
