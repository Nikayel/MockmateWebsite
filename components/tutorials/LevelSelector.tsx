"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LevelCard } from "./LevelCard"
import { LevelPreviewPanel } from "./LevelPreviewPanel"
import { Reveal } from "./Reveal"
import { useCompletedLessons } from "./useCompletedLessons"
import { recallLevel, rememberLevel } from "@/lib/tutorials/level-preference"
import type { PythonLevel } from "@/lib/tutorials/types"

/**
 * Screen 1 — the Python Path (HANDOFF §B). A connected vertical spine of the four levels on the
 * left (numbered, with a clay fill on completed/selected nodes) and a sticky preview on the right
 * that reacts to the selected level. Selecting a node updates the preview; the preview's CTA stores
 * the chosen level (`localStorage[cs_py_level]`) and opens the level's first unfinished lesson.
 * Completion is hydrated best-effort from saved progress (empty when signed out).
 */
export function LevelSelector({ levels }: { levels: PythonLevel[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<PythonLevel["id"]>(levels[0]?.id ?? 1)
  const completedLessonIds = useCompletedLessons()

  // Preselect the level the learner last started, if any.
  useEffect(() => {
    const stored = recallLevel()
    if (stored && levels.some((l) => l.id === stored)) setSelectedId(stored)
  }, [levels])

  const selected = useMemo(
    () => levels.find((l) => l.id === selectedId) ?? levels[0],
    [levels, selectedId]
  )

  const completedCountFor = (level: PythonLevel) =>
    level.modules.reduce(
      (total, mod) => total + mod.lessons.filter((l) => completedLessonIds.has(l.id)).length,
      0
    )

  const lessonCountFor = (level: PythonLevel) =>
    level.modules.reduce((total, mod) => total + mod.lessons.length, 0)

  const handleStart = (level: PythonLevel) => {
    rememberLevel(level.id)
    // Open the first not-yet-completed lesson in the level (a "continue"), else lesson 1.
    const lessons = level.modules.flatMap((mod) => mod.lessons)
    const next = lessons.find((l) => !completedLessonIds.has(l.id)) ?? lessons[0]
    router.push(next ? `/learn/python/${level.slug}/${next.id}` : `/learn/python/${level.slug}`)
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

              <Reveal delayMs={i * 70} className="flex-1 pb-5">
                <LevelCard
                  level={level}
                  isSelected={isSelected}
                  isCompleted={isCompleted}
                  completedCount={completedCount}
                  onSelect={(l) => setSelectedId(l.id)}
                />
              </Reveal>
            </li>
          )
        })}
      </ol>

      <div className="lg:sticky lg:top-24">
        <LevelPreviewPanel
          level={selected}
          completedCount={completedCountFor(selected)}
          onStart={handleStart}
        />
      </div>
    </div>
  )
}
