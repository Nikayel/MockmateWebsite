/**
 * useInterviewSession Hook
 *
 * Provides session-related state and actions from stores.
 * Simplified to just expose store values without complex logic.
 * ~50 lines - delegates to stores.
 */

import { useAuth } from "@/lib/auth-context"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { useInterviewStore } from "@/lib/stores"

export function useInterviewSession() {
  const { user, firebaseUser, loading: authLoading } = useAuth()
  const { activeRoadmap, markQuestionCompleted, addActualTime } = useRoadmapStore()
  const { targetCompany } = useInterviewStore()

  return {
    user,
    firebaseUser,
    authLoading,
    targetCompany,
    activeRoadmap,
    markQuestionCompleted,
    addActualTime,
  }
}

export type UseInterviewSessionReturn = ReturnType<typeof useInterviewSession>
