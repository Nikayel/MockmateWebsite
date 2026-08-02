"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LevelCard } from "./LevelCard"
import { LevelPreviewPanel } from "./LevelPreviewPanel"
import { Reveal } from "./Reveal"
import { useCompletedLessons } from "./useCompletedLessons"
import { recallLevel, rememberLevel } from "@/lib/tutorials/level-preference"
import { levelPath, lessonWorkspacePath, publicLessonPath } from "@/lib/tutorials/lesson-routes"
import { useAuth } from "@/lib/auth-context"
import type { PythonLevelId } from "@/lib/tutorials/types"
import type { PathLevelSummary } from "@/lib/tutorials/level-path"

/**
 * Screen 1 — the Python Path (HANDOFF §B). A connected vertical spine of the four levels on the
 * left (numbered, with a clay fill on completed/selected nodes) and a sticky preview on the right
 * that reacts to the selected level. Selecting a node updates the preview; the preview's CTA stores
 * the chosen level (`localStorage[cs_py_level]`) and opens the level's first unfinished lesson.
 * Completion is hydrated best-effort from saved progress (empty when signed out).
 *
 * The Path landing is public, so Start has two possible destinations: a visitor with no account is
 * sent to the lesson's public reading page, a signed-in learner to their workspace. The choice
 * happens at click time, in the browser, so nothing about the rendered page depends on who is
 * looking at it.
 */
export function LevelSelector({ levels }: { levels: PathLevelSummary<PythonLevelId>[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<PythonLevelId>(levels[0]?.id ?? 1)
  const completedLessonIds = useCompletedLessons()
  const { user, initialized } = useAuth()
  const signedIn = initialized && Boolean(user)

  // Preselect the level the learner last started, if any.
  useEffect(() => {
    const stored = recallLevel()
    if (stored && levels.some((l) => l.id === stored)) setSelectedId(stored)
  }, [levels])

  const selected = useMemo(
    () => levels.find((l) => l.id === selectedId) ?? levels[0],
    [levels, selectedId]
  )

  const completedCountFor = (level: PathLevelSummary<PythonLevelId>) =>
    level.lessons.filter((l) => completedLessonIds.has(l.id)).length

  const lessonCountFor = (level: PathLevelSummary<PythonLevelId>) => level.lessons.length

  const handleStart = (level: PathLevelSummary<PythonLevelId>) => {
    rememberLevel(level.id)
    // Open the first not-yet-completed lesson in the level (a "continue"), else lesson 1.
    const lessons = level.lessons
    const next = lessons.find((l) => !completedLessonIds.has(l.id)) ?? lessons[0]
    if (!next) {
      router.push(levelPath("python", level.slug))
      return
    }
    router.push(
      signedIn
        ? lessonWorkspacePath("python", level.slug, next.id)
        : publicLessonPath("python", level.slug, next.id)
    )
  }

  if (!selected) return null

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_minmax(360px,420px)]">
      <ol className="relative">
        {levels.map((level, i) => {
          const lessonCount = lessonCountFor(level)
          const completedCount = completedCountFor(level)
          const isCompleted = lessonCount > 0 && completedCount === lessonCount
          const isSelected = level.id === selected.id
          return (
            <li key={level.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    isCompleted
                      ? "bg-accent text-accent-foreground border-transparent"
                      : isSelected
                        ? "border-accent text-accent"
                        : "border-border text-muted-foreground",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {level.id}
                </span>
                {i < levels.length - 1 && (
                  <span
                    className={[
                      "my-2 w-px flex-1 transition-colors",
                      isCompleted ? "bg-accent" : "bg-border",
                    ].join(" ")}
                  />
                )}
              </div>

              <div className="flex-1 pb-5">
                <Reveal delayMs={i * 70}>
                  <LevelCard
                    level={level}
                    isSelected={isSelected}
                    isCompleted={isCompleted}
                    completedCount={completedCount}
                    onSelect={(l) => setSelectedId(l.id)}
                  />
                </Reveal>
                {/* On mobile there's no sticky panel, so the preview drops in under the open card. */}
                {isSelected && (
                  <div className="mt-4 lg:hidden">
                    <LevelPreviewPanel
                      level={level}
                      completedCount={completedCount}
                      onStart={handleStart}
                    />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="hidden lg:sticky lg:top-24 lg:block">
        <LevelPreviewPanel
          level={selected}
          completedCount={completedCountFor(selected)}
          onStart={handleStart}
        />
      </div>
    </div>
  )
}
