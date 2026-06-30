"use client"

import { useEffect, useState } from "react"
import { fetchAllProgress } from "@/lib/tutorials/progress-client"

/**
 * The set of the current user's completed lesson ids, hydrated once from saved progress. Shared by
 * every Learn-Python surface that overlays completion (the Path, the module list, the workspace's
 * Up-next, the resume affordance) so the fetch + map lives in exactly one place. Best-effort: stays
 * empty when signed out or on failure — completion overlays are never load-blocking.
 */
export function useCompletedLessons(): Set<string> {
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    fetchAllProgress()
      .then((items) => {
        if (active)
          setCompleted(
            new Set(items.filter((p) => p.lessonStatus === "completed").map((p) => p.lessonId))
          )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return completed
}
