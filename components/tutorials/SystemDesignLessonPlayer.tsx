"use client"

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
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
  getNextSystemDesignLessonInLevel,
  getFirstLessonOfNextSystemDesignLevel,
  listSystemDesignLessonsInLevel,
} from "@/lib/tutorials/system-design/registry"
import { fetchDesignAnswer, saveDesignAnswer } from "@/lib/tutorials/design-answers-client"
import { useCompletedLessons } from "./useCompletedLessons"
import { TeachPanel } from "./TeachPanel"
import { DesignAnswerPanel } from "./DesignAnswerPanel"
import { useTutorialProgressSync } from "./useTutorialProgressSync"
import { LessonRail } from "./LessonRail"
import { type UpNextLesson } from "./LessonOutline"
import { LessonHeader } from "./LessonHeader"
import { LessonErrorBanner, LessonLoadingState } from "./LessonProgressStates"
import { SectionDoneButton } from "./SectionDoneButton"
import { SableTutor } from "./SableTutor"
import { VerticalRail } from "./VerticalRail"
import { usePersistentState } from "./usePersistentState"
import type { DesignLesson, DesignLevel, LessonSection } from "@/lib/tutorials/types"

/**
 * System-Design Lesson Player — a thin fork of `SqlLessonPlayer`. The graded core is REUSED:
 * `useTutorialProgressSync` (same `user_tutorial_progress` collection, `sd-`-namespaced ids), the
 * tutorial store, `TeachPanel`, `LessonRail`, `LessonHeader`, `SableTutor`, and `SectionDoneButton`.
 *
 * It differs from the code players in two ways:
 *  - There is NO runner. The `DesignAnswerPanel` (free-text write → Save → reveal model answer)
 *    replaces the code runner; its "answer saved" gate replaces the runner's `onPass`.
 *  - System design has ONE design write per lesson (the Apply). The UI shows the Read + Design spine
 *    only; marking the Design section done completes BOTH `apply` and `practice` so the shared store —
 *    which keys `lessonStatus` off the `practice` section — flips the lesson to completed. (Deviation
 *    noted vs a separate Practice phase.)
 */
const UP_NEXT_COUNT = 5

export interface SystemDesignLessonPlayerProps {
  lesson: DesignLesson
  level: DesignLevel
  onSectionComplete?: (section: LessonSection) => void
}

/** What the post-Design CTA offers, kept level-aware so a boundary is a deliberate hand-off. */
type NextStep =
  | { kind: "lesson"; id: string; title: string; slug: string }
  | {
      kind: "level-complete"
      id: string
      title: string
      slug: string
      levelId: DesignLevel["id"]
      levelTitle: string
    }
  | { kind: "finished" }

export function SystemDesignLessonPlayer({
  lesson,
  level,
  onSectionComplete,
}: SystemDesignLessonPlayerProps) {
  const { reload } = useTutorialProgressSync(lesson.id, level.id)

  const sections = useTutorialStore((s) => s.sections)
  const storeLessonId = useTutorialStore((s) => s.lessonId)
  const isLoading = useTutorialStore((s) => s.isLoading)
  const error = useTutorialStore((s) => s.error)
  const startSection = useTutorialStore((s) => s.startSection)
  const completeSection = useTutorialStore((s) => s.completeSection)

  // Only the Read + Design (apply) phases are navigable; "practice" is completed alongside "apply".
  const [active, setActive] = useState<LessonSection>("teach")
  const centerRef = useRef<HTMLElement>(null)

  // The single design write per lesson is the Apply exercise. Answer text is held per-exercise so it
  // survives phase switches (mirrors the SQL player's `codeByExercise`).
  const designExercise = lesson.apply
  const [answerByExercise, setAnswerByExercise] = useState<Record<string, string>>({
    [designExercise.id]: designExercise.starterAnswer ?? "",
  })
  const [savedAnswerByExercise, setSavedAnswerByExercise] = useState<Record<string, string>>({})
  const [answerLoading, setAnswerLoading] = useState(true)
  const answerTouched = useRef(false)

  const [tutorOpen, setTutorOpen] = usePersistentState("cs_sd_tutor_open", "1")
  const [rail, setRail] = usePersistentState("cs_sd_rail", "0")
  const railExpanded = rail === "1"

  const [passedSections, setPassedSections] = useState<Partial<Record<LessonSection, boolean>>>({})
  const markPassed = (section: LessonSection) =>
    setPassedSections((prev) => ({ ...prev, [section]: true }))

  // Resume the learner's own saved answer for the Design exercise. Best-effort: a signed-out or failed
  // fetch just leaves the starter text. Never clobber an in-progress draft (the learner may type before
  // the fetch resolves), mirroring the progress sync's `hasLoaded` discipline.
  useEffect(() => {
    let cancelled = false
    setAnswerLoading(true)
    fetchDesignAnswer(designExercise.id)
      .then((saved) => {
        if (cancelled || !saved) return
        setSavedAnswerByExercise((prev) => ({ ...prev, [designExercise.id]: saved.answer }))
        if (!answerTouched.current) {
          setAnswerByExercise((prev) => ({ ...prev, [designExercise.id]: saved.answer }))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAnswerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [designExercise.id])

  // This route is a Client Component (no generateMetadata), so set the tab title from the lesson.
  useEffect(() => {
    const previous = document.title
    document.title = `${lesson.title} — Learn System Design`
    return () => {
      document.title = previous
    }
  }, [lesson.title])

  const completedIds = useCompletedLessons()

  const { lessonNumber, totalInLevel, upNext } = useMemo(() => {
    const inLevel = listSystemDesignLessonsInLevel(level)
    const idx = inLevel.findIndex((l) => l.id === lesson.id)
    const next: UpNextLesson[] = inLevel.slice(idx + 1, idx + 1 + UP_NEXT_COUNT).map((l) => ({
      id: l.id,
      title: l.title,
      levelSlug: level.slug,
      isCompleted: completedIds.has(l.id),
    }))
    return { lessonNumber: idx + 1, totalInLevel: inLevel.length, upNext: next }
  }, [level, lesson.id, completedIds])

  const nextStep = useMemo((): NextStep => {
    const withinLevel = getNextSystemDesignLessonInLevel(lesson.id)
    if (withinLevel) {
      return { kind: "lesson", id: withinLevel.id, title: withinLevel.title, slug: level.slug }
    }
    const nextLevel = getFirstLessonOfNextSystemDesignLevel(lesson.id)
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
    if (storeLessonId !== lesson.id) return
    didResume.current = true
    const next = LESSON_SECTION_ORDER.find((s) => sections[s] !== "completed")
    // "practice" is never a standalone phase here; fall back to the Design (apply) view.
    if (next) setActive(next === "practice" ? "apply" : next)
  }, [isLoading, sections, storeLessonId, lesson.id])

  const goToSection = (section: LessonSection) => {
    const target = section === "practice" ? "apply" : section
    setActive(target)
    startSection(target)
  }

  useEffect(() => {
    centerRef.current?.scrollTo({ top: 0 })
  }, [active])

  const completeTeach = () => {
    completeSection("teach")
    onSectionComplete?.("teach")
  }

  // One design write per lesson: completing the Design section completes BOTH apply and practice so
  // the store flips `lessonStatus` to completed (it keys off `practice`).
  const completeDesign = () => {
    completeSection("apply")
    completeSection("practice")
    onSectionComplete?.("apply")
    onSectionComplete?.("practice")
  }

  const setAnswer = (exerciseId: string, value: string) => {
    answerTouched.current = true
    setAnswerByExercise((prev) => ({ ...prev, [exerciseId]: value }))
  }

  const handleSaveAnswer = (text: string) => {
    setSavedAnswerByExercise((prev) => ({ ...prev, [designExercise.id]: text }))
    void saveDesignAnswer({
      exerciseId: designExercise.id,
      lessonId: lesson.id,
      answer: text,
    })
  }

  const progress = computeLessonProgress(sections)
  const showDesign = active === "apply" || active === "practice"
  const lessonComplete = sections.practice === "completed"

  return (
    <div className="flex h-[100dvh] flex-col">
      <a
        href="#lesson-main"
        className="bg-accent text-accent-foreground focus-visible:ring-accent/50 sr-only z-50 rounded-md px-3 py-1.5 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to lesson
      </a>
      <header className="border-border bg-background/80 flex shrink-0 items-center gap-3 border-b px-4 py-2.5 backdrop-blur-md">
        <Link
          href="/learn/system-design"
          className="text-foreground text-sm font-semibold tracking-tight"
        >
          CodeSparring
        </Link>
        <Link
          href={`/learn/system-design/${level.slug}`}
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
            href="/learn/system-design"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Levels</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto">
        <div
          className="grid h-full min-w-[1080px] transition-[grid-template-columns] duration-200 ease-out"
          style={
            {
              gridTemplateColumns: `var(--railw, 58px) minmax(400px,1fr) ${tutorOpen === "1" ? "300px" : "2.5rem"}`,
              "--railw": railExpanded ? "248px" : "58px",
            } as CSSProperties
          }
        >
          <LessonRail
            collapsed={!railExpanded}
            onToggle={() => setRail(railExpanded ? "0" : "1")}
            sections={sections}
            active={active}
            onSelect={goToSection}
            upNext={upNext}
            basePath="/learn/system-design"
          />

          <main
            id="lesson-main"
            ref={centerRef}
            tabIndex={-1}
            className="overflow-y-auto px-8 py-6 focus:outline-none"
            aria-label="Lesson content"
          >
            <div className={active === "teach" ? "mx-auto w-full max-w-[45rem]" : "w-full"}>
              <LessonHeader lesson={lesson} />

              {error && <LessonErrorBanner error={error} onReload={reload} />}

              {isLoading && <LessonLoadingState />}

              {!isLoading && active === "teach" && (
                <TeachPanel
                  teach={lesson.teach}
                  onContinue={() => {
                    completeTeach()
                    goToSection("apply")
                  }}
                />
              )}

              {!isLoading && showDesign && (
                <div className="flex flex-col gap-4">
                  <DesignAnswerPanel
                    exercise={designExercise}
                    answer={
                      answerByExercise[designExercise.id] ?? designExercise.starterAnswer ?? ""
                    }
                    onAnswerChange={(value) => setAnswer(designExercise.id, value)}
                    onReady={() => markPassed("apply")}
                    brief={{ eyebrow: "Design", title: "Your turn" }}
                    savedAnswer={savedAnswerByExercise[designExercise.id]}
                    onSave={handleSaveAnswer}
                    loading={answerLoading}
                  />
                  <SectionDoneButton
                    passed={Boolean(passedSections.apply)}
                    completed={sections.apply === "completed"}
                    onMarkDone={completeDesign}
                  />
                  {lessonComplete && (
                    <div className="flex flex-col gap-3">
                      <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Lesson complete. Nice work. This idea resurfaces in 3 days for spaced
                        practice.
                      </p>
                      <div>
                        {nextStep.kind === "lesson" && (
                          <Button asChild className="gap-2">
                            <Link href={`/learn/system-design/${nextStep.slug}/${nextStep.id}`}>
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
                                <Link href={`/learn/system-design/${nextStep.slug}/${nextStep.id}`}>
                                  Start Level {nextStep.levelId}
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button asChild variant="outline" className="gap-2">
                                <Link href="/learn/system-design">
                                  <ArrowLeft className="h-4 w-4" />
                                  All levels
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                        {nextStep.kind === "finished" && (
                          <Button asChild variant="outline" className="gap-2">
                            <Link href="/learn/system-design">
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
