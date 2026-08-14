"use client"

import { useEffect } from "react"
import { startLearnTimeTracking } from "@/lib/tutorials/learn-time-client"
import type { TutorialLevelId } from "@/lib/tutorials/types"

/**
 * Meters active time on a lesson for the admin learn-usage view. All behavior lives in
 * `lib/tutorials/learn-time-client.ts`; this is only the mount/unmount binding. Level 0 is a
 * real level (System Design's interview-method level), hence the explicit null checks.
 *
 * This time feeds `users/{uid}/learn_usage` + `learn_daily` ONLY — never the dashboard's
 * practice-hours stat, which remains interview-session wall clock by contract.
 */
export function useLearnTimeTracker(
  lessonId: string | null,
  levelId: TutorialLevelId | null
): void {
  useEffect(() => {
    if (lessonId === null || lessonId === "" || levelId === null) return
    return startLearnTimeTracking(lessonId, levelId)
  }, [lessonId, levelId])
}
