"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTutorialStore } from "@/lib/stores/tutorial-store"
import { fetchLessonProgress, saveLessonProgress } from "@/lib/tutorials/progress-client"
import type { TutorialProgressInput } from "@/lib/tutorials/progress"
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
  // Gate autosave until the initial load RESOLVES (progress hydrated, or a genuine "none"). If the load
  // FAILS, this stays false so autosave never overwrites the unread server doc with a reset state. (Audit #4.)
  const hasLoaded = useRef(false)
  useEffect(() => {
    if (!lessonId || !levelId) return
    const key = `${lessonId}:${reloadNonce}`
    if (loadedKey.current === key) return
    loadedKey.current = key
    hasLoaded.current = false

    initLesson(lessonId, levelId)
    setError(null)
    setLoading(true)
    fetchLessonProgress(lessonId)
      .then((progress) => {
        if (loadedKey.current !== key) return
        if (progress) hydrate(progress)
        // Load confirmed (saved progress or a genuine none) — autosave may now persist changes.
        hasLoaded.current = true
      })
      .catch(() => {
        // Leave hasLoaded false: a failed load must NOT enable autosave, or it would clobber the doc.
        if (loadedKey.current === key) setError("Couldn't load your saved progress.")
      })
      .finally(() => {
        if (loadedKey.current === key) setLoading(false)
      })
  }, [lessonId, levelId, reloadNonce, initLesson, hydrate, setLoading, setError])

  // Debounced autosave of the persisted fields only.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>("")
  // The latest save-eligible payload, mirrored to a ref so the unmount flush can read it. Non-null
  // only while a change is scheduled but not yet written.
  const pending = useRef<{ snapshot: string; payload: TutorialProgressInput } | null>(null)
  useEffect(() => {
    if (!lessonId || !levelId) return
    // Never autosave before the initial load resolved, or a failed/in-flight load would let a reset
    // store overwrite the real server doc (audit #4).
    if (!hasLoaded.current) return
    // Only save once the store is pointed at THIS lesson (avoids a stale cross-lesson save).
    if (storeLessonId !== lessonId) return
    // Never persist a pristine, untouched lesson.
    const untouched =
      sections.teach === "not_started" &&
      sections.apply === "not_started" &&
      sections.practice === "not_started"
    if (untouched) return

    const snapshot = JSON.stringify({ sections, lessonStatus, lastExerciseScore })
    if (snapshot === lastSaved.current) {
      pending.current = null
      return
    }

    const payload: TutorialProgressInput = {
      lessonId,
      levelId,
      sections,
      lessonStatus,
      ...(lastExerciseScore !== undefined ? { lastExerciseScore } : {}),
    }
    pending.current = { snapshot, payload }

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      lastSaved.current = snapshot
      pending.current = null
      saveLessonProgress(payload).catch(() => setError("Couldn't save your progress."))
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [lessonId, levelId, storeLessonId, sections, lessonStatus, lastExerciseScore, setError])

  // Flush a pending save on unmount or when the tab is hidden. Marking a section complete (especially
  // the final Practice) and then clicking "Next lesson" unmounts the player within the 1s debounce;
  // hiding/closing the tab does the same. Without a flush the scheduled save is cleared and the
  // completion is lost. It fires only when there is a genuine unsaved change (`pending`), so a plain
  // tab switch is a no-op. Client navigation does not unload the page, so the fetch completes.
  useEffect(() => {
    const flushPending = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      const flush = pending.current
      if (flush) {
        lastSaved.current = flush.snapshot
        pending.current = null
        void saveLessonProgress(flush.payload).catch(() => {})
      }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPending()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      flushPending()
    }
  }, [])

  return { reload }
}
