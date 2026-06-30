"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTutorialStore } from "@/lib/stores/tutorial-store"
import { fetchLessonProgress, saveLessonProgress } from "@/lib/tutorials/progress-client"
import type { PythonLevelId } from "@/lib/tutorials/types"

/**
 * Resumes saved progress on mount and debounce-autosaves changes. Mirrors
 * `components/labs/useCaseLabRunSync.ts`: a persistent `loadedKey` ref (StrictMode-safe), a 1s
 * debounce, and snapshot de-duplication so server timestamp stamps never trigger a save loop.
 *
 * Best-effort: signed-out users get null from the client wrappers (saves silently no-op), and a
 * pristine (untouched) lesson is never persisted — no empty docs for mere visits.
 */
const SAVE_DEBOUNCE_MS = 1000

export function useTutorialProgressSync(lessonId: string | null, levelId: PythonLevelId | null) {
  const initLesson = useTutorialStore((s) => s.initLesson)
  const hydrate = useTutorialStore((s) => s.hydrate)
  const setLoading = useTutorialStore((s) => s.setLoading)
  const setError = useTutorialStore((s) => s.setError)

  const storeLessonId = useTutorialStore((s) => s.lessonId)
  const sections = useTutorialStore((s) => s.sections)
  const lessonStatus = useTutorialStore((s) => s.lessonStatus)
  const lastExerciseScore = useTutorialStore((s) => s.lastExerciseScore)

  const [reloadNonce, setReloadNonce] = useState(0)
  const reload = useCallback(() => setReloadNonce((n) => n + 1), [])

  // Load-on-mount + resume. Persistent ref key guards against the StrictMode double-invoke
  // leaving isLoading stuck true.
  const loadedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!lessonId || !levelId) return
    const key = `${lessonId}:${reloadNonce}`
    if (loadedKey.current === key) return
    loadedKey.current = key

    initLesson(lessonId, levelId)
    setError(null)
    setLoading(true)
    fetchLessonProgress(lessonId)
      .then((progress) => {
        if (loadedKey.current === key && progress) hydrate(progress)
      })
      .catch(() => {
        if (loadedKey.current === key) setError("Couldn't load your saved progress.")
      })
      .finally(() => {
        if (loadedKey.current === key) setLoading(false)
      })
  }, [lessonId, levelId, reloadNonce, initLesson, hydrate, setLoading, setError])

  // Debounced autosave of the persisted fields only.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>("")
  useEffect(() => {
    if (!lessonId || !levelId) return
    // Only save once the store is pointed at THIS lesson (avoids a stale cross-lesson save).
    if (storeLessonId !== lessonId) return
    // Never persist a pristine, untouched lesson.
    const untouched =
      sections.teach === "not_started" &&
      sections.apply === "not_started" &&
      sections.practice === "not_started"
    if (untouched) return

    const snapshot = JSON.stringify({ sections, lessonStatus, lastExerciseScore })
    if (snapshot === lastSaved.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      lastSaved.current = snapshot
      saveLessonProgress({
        lessonId,
        levelId,
        sections,
        lessonStatus,
        ...(lastExerciseScore !== undefined ? { lastExerciseScore } : {}),
      }).catch(() => setError("Couldn't save your progress."))
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [lessonId, levelId, storeLessonId, sections, lessonStatus, lastExerciseScore, setError])

  return { reload }
}
