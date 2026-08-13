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
import { levelPath, lessonWorkspacePath, trackPath } from "@/lib/tutorials/lesson-routes"
import { fetchDesignAnswer, saveDesignAnswer } from "@/lib/tutorials/design-answers-client"
import { useCompletedLessons } from "./useCompletedLessons"
import { SegmentedTeachPanel } from "./SegmentedTeachPanel"
import { DesignAnswerPanel } from "./DesignAnswerPanel"
import { useTutorialProgressSync } from "./useTutorialProgressSync"
import { LessonRail } from "./LessonRail"
import { type UpNextLesson } from "./LessonOutline"
import { LessonHeader } from "./LessonHeader"
import { LessonErrorBanner, LessonLoadingState } from "./LessonProgressStates"
import { SectionDoneButton } from "./SectionDoneButton"
import { SableTutor } from "./SableTutor"
import { LessonTelemetryProvider } from "./LessonTelemetryProvider"
import { VerticalRail } from "./VerticalRail"
import { usePersistentState } from "./usePersistentState"
import type { DesignLesson, LessonSection } from "@/lib/tutorials/types"

/**
 * System-Design Lesson Player — a thin fork of `SqlLessonPlayer`. The graded core is REUSED:
 * `useTutorialProgressSync` (same `user_tutorial_progress` collection, `sd-`-namespaced ids), the
 * tutorial store, `LessonRail`, `LessonHeader`, `SableTutor`, and `SectionDoneButton`. The Read
 * phase renders through `SegmentedTeachPanel` (progressive disclosure over the same
 * MarkdownRenderer) instead of the code courses' `TeachPanel`.
 *
 * It differs from the code players in two ways:
 *  - There is NO runner. The `DesignAnswerPanel` (free-text write → Save → reveal model answer)
 *    replaces the code runner; its "answer saved" gate replaces the runner's `onPass`.
 *  - The GRADED spine is Read → Design (the Apply), and marking Design done completes BOTH the
 *    `apply` and `practice` store sections, because the shared store keys `lessonStatus` off
 *    `practice`. That is load-bearing and must not change: every existing completion depends on it.
 *
 * ## Practice is an optional third phase, deliberately outside the store
 *
 * For a long time this player rendered `lesson.apply` and nothing else, so all 208 authored
 * `practice` exercises were unreachable to a signed-in learner and their `modelAnswerOutline`s were
 * reachable from nowhere at all (the public reading page publishes practice PROMPTS, but
 * `toPublicExercisePreview` seals every model answer). In a course whose entire assessment loop is
 * "write, then reveal and self-compare", that is the comparison half of the loop missing on the
 * harder problem.
 *
 * Practice now unlocks once the Apply answer is saved, with a full editor, its own persistence row,
 * and its own reveal. It is driven by LOCAL state rather than a `LessonSection`, which is the whole
 * trick: `sections.practice` is already flipped to "completed" by `completeDesign`, so routing this
 * through the store would either show a phase that is complete before it is opened, or require
 * changing the completion rule and regressing every lesson a learner has already finished. Keeping
 * it local means the transfer problem becomes reachable and nothing about progress moves.
 */
export interface SystemDesignLessonPlayerProps {
  lesson: DesignLesson
  /** Lean level (id/slug/title) resolved server-side — no modules / model answers reach the client. */
  level: LeanTutorialLevel
  /** Position + next-step navigation resolved server-side from the registry. */
  nav: LessonNavModel
  onSectionComplete?: (section: LessonSection) => void
}

export function SystemDesignLessonPlayer({
  lesson,
  level,
  nav,
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

  // Which exercise the Design view is showing. Apply is the graded one; Practice is the optional
  // harder transfer problem, unlocked after Apply is saved. Local state, not a `LessonSection` —
  // see the module comment for why routing it through the store would break completion.
  const [designPhase, setDesignPhase] = useState<"apply" | "practice">("apply")
  const designExercise = designPhase === "practice" ? lesson.practice : lesson.apply

  // Answer text is held per-exercise so it survives phase switches (mirrors the SQL player's
  // `codeByExercise`), which is what lets Apply and Practice each keep their own draft.
  const [answerByExercise, setAnswerByExercise] = useState<Record<string, string>>({
    [lesson.apply.id]: lesson.apply.starterAnswer ?? "",
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

  // Resume the learner's own saved answer for the Design exercise. A signed-out user (null) resolves the
  // load and just keeps the starter text; a real load FAILURE keeps answerLoading true so the editor
  // stays gated and Save can't clobber the unread server answer, mirroring the progress sync's
  // `hasLoaded` discipline. Never clobber an in-progress draft (the learner may type before it resolves).
  useEffect(() => {
    let cancelled = false
    setAnswerLoading(true)
    // A phase switch is a new exercise, so the "learner has typed" guard has to reset or the
    // incoming saved answer would be treated as a clobber of the OTHER exercise's draft.
    answerTouched.current = false
    fetchDesignAnswer(designExercise.id)
      .then((saved) => {
        if (cancelled) return
        if (saved) {
          setSavedAnswerByExercise((prev) => ({ ...prev, [designExercise.id]: saved.answer }))
          if (!answerTouched.current) {
            setAnswerByExercise((prev) => ({ ...prev, [designExercise.id]: saved.answer }))
          }
        } else if (!answerTouched.current) {
          // Seed the starter for an exercise the learner has not written yet. Switching to Practice
          // must not inherit the Apply draft that is still sitting in `answerByExercise`.
          setAnswerByExercise((prev) => ({
            ...prev,
            [designExercise.id]: prev[designExercise.id] ?? designExercise.starterAnswer ?? "",
          }))
        }
        // Only a resolved load (a saved answer or a genuine none) opens the editor.
        setAnswerLoading(false)
      })
      .catch(() => {
        // Leave answerLoading true: a failed load must NOT expose the editor, or a Save would overwrite
        // the unread saved answer with a reset draft.
      })
    return () => {
      cancelled = true
    }
    // `starterAnswer` is a constant of the authored exercise, so it only ever changes together with
    // the id; listing it keeps the lint rule satisfied without adding a real re-run.
  }, [designExercise.id, designExercise.starterAnswer])

  // The player is a Client Component and the route sets no metadata, so set the tab title here.
  useEffect(() => {
    const previous = document.title
    document.title = `${lesson.title} | Learn System Design`
    return () => {
      document.title = previous
    }
  }, [lesson.title])

  const completedIds = useCompletedLessons()

  // Navigation (position + next-step) is resolved server-side; the client only overlays the user's
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

  // Two-phase Read → Design loop: count only teach + apply so the header bar reads 50% → 100%.
  // Practice is optional and deliberately absent from this, so opening it cannot make a finished
  // lesson read as unfinished.
  const progress = computeLessonProgress(sections, ["teach", "apply"])
  const showDesign = active === "apply" || active === "practice"
  const lessonComplete = sections.practice === "completed"

  // Practice unlocks on a saved Apply answer, or on an Apply already marked done in a past session.
  // Gating on the write rather than on arrival keeps the harder problem from pre-empting the one the
  // lesson actually builds to.
  const practiceUnlocked =
    savedAnswerByExercise[lesson.apply.id] !== undefined || sections.apply === "completed"
  const practiceAnswered = savedAnswerByExercise[lesson.practice.id] !== undefined

  const openPractice = () => {
    setDesignPhase("practice")
    centerRef.current?.scrollTo({ top: 0 })
  }
  const backToApply = () => {
    setDesignPhase("apply")
    centerRef.current?.scrollTo({ top: 0 })
  }

  return (
    <LessonTelemetryProvider lessonId={lesson.id} levelId={level.id} skills={lesson.skills}>
      <div className="flex h-[100dvh] flex-col">
        <a
          href="#lesson-main"
          className="bg-accent text-accent-foreground focus-visible:ring-accent/50 sr-only z-50 rounded-md px-3 py-1.5 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          Skip to lesson
        </a>
        <header className="border-border bg-background/80 flex shrink-0 items-center gap-3 border-b px-4 py-2.5 backdrop-blur-md">
          <Link
            href={trackPath("system-design")}
            className="text-foreground text-sm font-semibold tracking-tight"
          >
            CodeSparring
          </Link>
          <Link
            href={levelPath("system-design", level.slug)}
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
              href={trackPath("system-design")}
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
              courseId="system-design"
              // System Design is a two-phase Read -> Design loop: show only those two dots (no phantom
              // Practice step) and label the design write "Design" to match the landing + center panel.
              sectionOrder={["teach", "apply"]}
              sectionLabels={{ apply: "Design" }}
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
                  <SegmentedTeachPanel
                    lessonId={lesson.id}
                    teach={lesson.teach}
                    teachCompleted={sections.teach === "completed"}
                    onContinue={() => {
                      completeTeach()
                      goToSection("apply")
                    }}
                  />
                )}

                {!isLoading && showDesign && (
                  <div className="flex flex-col gap-4">
                    {designPhase === "practice" && (
                      <button
                        type="button"
                        onClick={backToApply}
                        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to the Design question
                      </button>
                    )}

                    <DesignAnswerPanel
                      exercise={designExercise}
                      answer={
                        answerByExercise[designExercise.id] ?? designExercise.starterAnswer ?? ""
                      }
                      onAnswerChange={(value) => setAnswer(designExercise.id, value)}
                      onReady={() => markPassed("apply")}
                      brief={
                        designPhase === "practice"
                          ? { eyebrow: "Practice", title: "Push harder" }
                          : { eyebrow: "Design", title: "Your turn" }
                      }
                      savedAnswer={savedAnswerByExercise[designExercise.id]}
                      onSave={handleSaveAnswer}
                      loading={answerLoading}
                    />

                    {/* Practice never gates completion, so it gets no SectionDoneButton and does not
                        touch the store. Saving it persists the answer and reveals the model outline,
                        which is the whole loop this course runs on. */}
                    {designPhase === "apply" && (
                      <SectionDoneButton
                        passed={Boolean(passedSections.apply)}
                        completed={sections.apply === "completed"}
                        onMarkDone={completeDesign}
                      />
                    )}

                    {designPhase === "apply" && practiceUnlocked && (
                      <div className="border-border bg-muted/30 flex flex-col gap-2 rounded-xl border p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                            Optional
                          </span>
                          {practiceAnswered && (
                            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                              Answered
                            </span>
                          )}
                        </div>
                        <p className="text-foreground text-sm font-semibold">Push harder</p>
                        <p className="text-muted-foreground text-sm">
                          A second problem on the same skill, with tighter constraints. It does not
                          affect completing this lesson.
                        </p>
                        <div>
                          <Button variant="outline" className="gap-2" onClick={openPractice}>
                            {practiceAnswered
                              ? "Revisit the harder problem"
                              : "Try the harder problem"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {designPhase === "apply" && lessonComplete && (
                      <div className="flex flex-col gap-3">
                        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Lesson complete. Nice work. Revisit it in a few days to lock it in.
                        </p>
                        <div>
                          {/* Every hand-off from a finished lesson stays inside the workspace: the
                            learner is signed in and mid-path, so the reading page would be a step
                            backwards. */}
                          {nextStep.kind === "lesson" && (
                            <Button asChild className="gap-2">
                              <Link
                                href={lessonWorkspacePath(
                                  "system-design",
                                  nextStep.slug,
                                  nextStep.id
                                )}
                              >
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
                                  <Link
                                    href={lessonWorkspacePath(
                                      "system-design",
                                      nextStep.slug,
                                      nextStep.id
                                    )}
                                  >
                                    Start Level {nextStep.levelId}
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button asChild variant="outline" className="gap-2">
                                  <Link href={trackPath("system-design")}>
                                    <ArrowLeft className="h-4 w-4" />
                                    All levels
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          )}
                          {/* The drill bank on the course page, not `/interview`. This promised a
                              system design mock and pointed at a browse surface that has never had
                              one: the design scenarios were filed under a Debugging tab there, and
                              now that `/interview` is DSA or Debugging it has none at all. */}
                          {nextStep.kind === "finished" && (
                            <Button asChild variant="outline" className="gap-2">
                              <Link href={`${trackPath("system-design")}#drills`}>
                                <ArrowRight className="h-4 w-4" />
                                You finished the path. Practice a system design mock
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
