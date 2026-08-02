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
import type { LeanTutorialLevel, LessonNavModel } from "@/lib/tutorials/level-path"
import { useCompletedLessons } from "./useCompletedLessons"
import { rememberLevel } from "@/lib/tutorials/level-preference"
import { TeachPanel } from "./TeachPanel"
import { ExerciseRunner } from "./ExerciseRunner"
import { WorkspaceExerciseRunner, type WorkspaceEditorState } from "./WorkspaceExerciseRunner"
import { useTutorialProgressSync } from "./useTutorialProgressSync"
import { LessonRail } from "./LessonRail"
import { type UpNextLesson } from "./LessonOutline"
import { LessonHeader } from "./LessonHeader"
import type { ExerciseBriefMeta } from "./ExerciseBrief"
import { ExtraPracticeSection } from "./ExtraPracticeSection"
import { LessonErrorBanner, LessonLoadingState } from "./LessonProgressStates"
import { SectionDoneButton } from "./SectionDoneButton"
import { SableTutor } from "./SableTutor"
import { LessonTelemetryProvider } from "./LessonTelemetryProvider"
import { VerticalRail } from "./VerticalRail"
import { usePersistentState } from "./usePersistentState"
import type {
  LessonSection,
  PythonExercise,
  PythonLesson,
  PythonLevelId,
} from "@/lib/tutorials/types"

/**
 * Screen 2 — the lesson workspace (HANDOFF §C). A full-height 3-column tool
 * `[248px outline | 1fr lesson | 300px tutor]`: the Read → Apply → Practice stepper + "Up next" on
 * the left, the active phase in the center, and Sable (the AI tutor) on the right. Section status
 * lives in `useTutorialStore` (persisted by `useTutorialProgressSync`); per-exercise editor text is
 * local UI state so it survives phase switches. Below 1080px the workspace scrolls as one unit.
 */
export interface LessonPlayerProps {
  lesson: PythonLesson
  /** Lean level (id/slug/title) resolved server-side — no modules / exercise payloads reach the client. */
  level: LeanTutorialLevel<PythonLevelId>
  /** Position + next-step navigation resolved server-side from the registry. */
  nav: LessonNavModel<PythonLevelId>
  onSectionComplete?: (section: LessonSection) => void
}

export function LessonPlayer({ lesson, level, nav, onSectionComplete }: LessonPlayerProps) {
  const { reload } = useTutorialProgressSync(lesson.id, level.id)

  const sections = useTutorialStore((s) => s.sections)
  const storeLessonId = useTutorialStore((s) => s.lessonId)
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
  // Workspace (multi-file) edits live here too, so switching Apply ↔ Practice — which unmounts the
  // runner — doesn't reset the learner's code back to starter. Keyed by exercise id, seeded lazily.
  const [workspaceStateByExercise, setWorkspaceStateByExercise] = useState<
    Record<string, WorkspaceEditorState>
  >({})

  // Which exercises passed this session — gates the "Mark as done" control (grading stays the bar to
  // complete; the learner saves the section when they choose to).
  const [passedSections, setPassedSections] = useState<Partial<Record<LessonSection, boolean>>>({})
  const markPassed = (section: LessonSection) =>
    setPassedSections((prev) => ({ ...prev, [section]: true }))

  // The last graded pass rate per section. `lastExerciseScore` used to be written as a hardcoded
  // 100 while its type documented it as "% of tests passed", so the one performance number in the
  // Learn data model was a constant. It now carries the real score.
  const [scoreBySection, setScoreBySection] = useState<Partial<Record<LessonSection, number>>>({})
  const recordScore = (section: LessonSection, score: number) =>
    setScoreBySection((prev) => ({ ...prev, [section]: score }))

  // The AI tutor (Sable) is locked / "coming soon"; its column is collapsible and the state persists.
  const [tutorOpen, setTutorOpen] = usePersistentState("cs_py_tutor_open", "1")

  // The left outline defaults to its slim strip: a three-step tracker doesn't earn 248px of permanent
  // width, and the reclaimed space goes to the editor. The choice persists across reloads.
  const [rail, setRail] = usePersistentState("cs_py_rail", "0")
  const railExpanded = rail === "1"

  // Remember this level for the Path's "continue" behavior whenever a lesson is open.
  useEffect(() => {
    rememberLevel(level.id)
  }, [level.id])

  // The player is a Client Component and the route sets no metadata, so set the tab title here.
  useEffect(() => {
    const previous = document.title
    document.title = `${lesson.title} | Learn Python`
    return () => {
      document.title = previous
    }
  }, [lesson.title])

  // Position within the level + the cross-curriculum "Up next" list (completion hydrated best-effort).
  const completedIds = useCompletedLessons()

  // Navigation (position + next-step) is resolved server-side; "Up next" is scoped to the current
  // level and the level hand-off (`nextStep`) is deliberate. The client only overlays the user's
  // completion set onto the "Up next" refs so it never re-imports the whole curriculum registry.
  const { lessonNumber, totalInLevel, nextStep } = nav
  const upNext: UpNextLesson[] = useMemo(
    () => nav.upNext.map((l) => ({ ...l, isCompleted: completedIds.has(l.id) })),
    [nav.upNext, completedIds]
  )

  // Resume: once saved progress loads, open the first not-completed section (once).
  const didResume = useRef(false)
  useEffect(() => {
    if (isLoading || didResume.current) return
    // Wait until the store actually holds THIS lesson's progress. The tutorial store is global, so on
    // a fresh player mount (new lesson via `key`) it still carries the previous lesson's snapshot for
    // one commit — resuming off that would jump a brand-new lesson to the prior lesson's open section
    // (e.g. Practice instead of Read). Gating on the loaded lesson id defaults a new lesson to Read.
    if (storeLessonId !== lesson.id) return
    didResume.current = true
    const next = LESSON_SECTION_ORDER.find((s) => sections[s] !== "completed")
    if (next) setActive(next)
  }, [isLoading, sections, storeLessonId, lesson.id])

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
    completeSection(section, section === "practice" ? scoreBySection.practice : undefined)
    onSectionComplete?.(section)
  }

  const setCode = (exerciseId: string, value: string) =>
    setCodeByExercise((prev) => ({ ...prev, [exerciseId]: value }))

  const renderExercise = (
    exercise: PythonExercise,
    opts: {
      canRevealReference?: boolean
      brief?: ExerciseBriefMeta
      onPass: () => void
      section: LessonSection
      onScore?: (score: number) => void
    }
  ) => {
    if (exercise.executionMode === "workspace" && exercise.workspace) {
      return (
        <WorkspaceExerciseRunner
          exercise={exercise}
          workspace={exercise.workspace}
          brief={opts.brief}
          onPass={opts.onPass}
          onScore={opts.onScore}
          section={opts.section}
          persistedState={workspaceStateByExercise[exercise.id]}
          onPersistState={(state) =>
            setWorkspaceStateByExercise((prev) => ({ ...prev, [exercise.id]: state }))
          }
        />
      )
    }
    return (
      <ExerciseRunner
        exercise={exercise}
        code={codeByExercise[exercise.id] ?? exercise.starterCode}
        onCodeChange={(value) => setCode(exercise.id, value)}
        canRevealReference={opts.canRevealReference}
        brief={opts.brief}
        onPass={opts.onPass}
        onScore={opts.onScore}
        section={opts.section}
      />
    )
  }

  const progress = computeLessonProgress(sections)

  return (
    <LessonTelemetryProvider lessonId={lesson.id} levelId={level.id} skills={lesson.skills}>
      <div className="flex h-[100dvh] flex-col">
        <a
          href="#lesson-main"
          className="bg-accent text-accent-foreground focus-visible:ring-accent/50 sr-only z-50 rounded-md px-3 py-1.5 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          Skip to lesson
        </a>
        {/* Top bar (§C): brand · level badge · title · lesson n/total + progress · theme · Levels. */}
        <header className="border-border bg-background/80 flex shrink-0 items-center gap-3 border-b px-4 py-2.5 backdrop-blur-md">
          <Link
            href="/learn/python"
            className="text-foreground text-sm font-semibold tracking-tight"
          >
            CodeSparring
          </Link>
          <Link
            href={`/learn/python/${level.slug}`}
            className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/15 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
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

        {/* Below 1080px the whole workspace scrolls horizontally as one unit. Both side columns
          collapse to slim rails, giving the lesson more room. The outline (--railw) and tutor track
          widths are inline so the grid can animate between the collapsed and expanded states. */}
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
              basePath="/learn/python"
            />

            <main
              id="lesson-main"
              ref={centerRef}
              tabIndex={-1}
              className="overflow-y-auto px-8 py-6 focus:outline-none"
              aria-label="Lesson content"
            >
              {/* Read keeps a ~720px reading measure; Apply/Practice go full-width so the two-column
                workspace can give the editor the room it needs. */}
              <div className={active === "teach" ? "mx-auto w-full max-w-[45rem]" : "w-full"}>
                <LessonHeader lesson={lesson} />

                {error && <LessonErrorBanner error={error} onReload={reload} />}

                {isLoading && <LessonLoadingState />}

                {!isLoading && active === "teach" && (
                  <TeachPanel
                    lessonId={lesson.id}
                    teach={lesson.teach}
                    teachCompleted={sections.teach === "completed"}
                    onContinue={() => {
                      markComplete("teach")
                      goToSection("apply")
                    }}
                  />
                )}

                {!isLoading && active === "apply" && (
                  <div className="flex flex-col gap-4">
                    {renderExercise(lesson.apply, {
                      canRevealReference: true,
                      brief: { eyebrow: "Apply", title: "Your turn" },
                      onPass: () => markPassed("apply"),
                      onScore: (score) => recordScore("apply", score),
                      section: "apply",
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
                    {renderExercise(lesson.practice, {
                      brief: { eyebrow: "Practice", title: "Make it stick", resurfaces: true },
                      onPass: () => markPassed("practice"),
                      onScore: (score) => recordScore("practice", score),
                      section: "practice",
                    })}
                    <SectionDoneButton
                      passed={Boolean(passedSections.practice)}
                      completed={sections.practice === "completed"}
                      onMarkDone={() => markComplete("practice")}
                    />
                    {lesson.extraPractice && lesson.extraPractice.length > 0 && (
                      <ExtraPracticeSection
                        exercises={lesson.extraPractice}
                        renderExercise={(exercise) =>
                          renderExercise(exercise, {
                            canRevealReference: true,
                            brief: { eyebrow: "Drill", title: "Extra practice" },
                            onPass: () => {},
                            // Drills are ungated bonus work: they report telemetry under the
                            // practice phase but must never move the section's saved score.
                            section: "practice",
                          })
                        }
                      />
                    )}
                    {sections.practice === "completed" && (
                      <div className="flex flex-col gap-3">
                        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Lesson complete. Nice work. Revisit it in a few days to lock it in.
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
                                You finished {level.title}.
                              </p>
                              <p className="text-muted-foreground text-sm">
                                Next up: {nextStep.levelTitle}.
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
                              <Link href="/practice">
                                <ArrowLeft className="h-4 w-4" />
                                You finished the path. Start practicing
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
    </LessonTelemetryProvider>
  )
}
