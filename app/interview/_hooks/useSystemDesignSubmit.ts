import { toast } from "sonner"
import type { Dispatch, SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { Scenario } from "@/lib/scenarios"

interface RoadmapWithId {
  id: string
}

export interface UseSystemDesignSubmitOptions {
  // Auth / entitlement
  firebaseUser: FirebaseUser | null
  isGuestMode: boolean

  // Routing / roadmap
  isFromRoadmap: boolean
  activeRoadmap: RoadmapWithId | null

  // Page state reads
  selectedScenario: Scenario | null

  // Page state setters
  setIsRunningTests: Dispatch<SetStateAction<boolean>>

  // Injected cross-cutting effects / helpers
  playSound: (type: "hint" | "success" | "fail" | "milestone") => void
  markQuestionEvaluating: (scenarioId: string) => void
  triggerSystemDesignFeedback: () => Promise<void>
}

export interface UseSystemDesignSubmitResult {
  submitSystemDesign: () => Promise<void>
}

/**
 * Owns the system-design submission entry point (`submitSystemDesign`) lifted
 * verbatim from `app/interview/page.tsx`: UI gating, autosave-storage teardown,
 * the roadmap "evaluating" mark, and the success/Retry toast wiring. The actual
 * feedback generation lives in `useSystemDesignFeedback` and is injected as
 * `triggerSystemDesignFeedback`. The Retry `onClick` re-calls the local
 * `submitSystemDesign`, preserving the original recursive behavior byte-identically.
 */
export function useSystemDesignSubmit(
  opts: UseSystemDesignSubmitOptions
): UseSystemDesignSubmitResult {
  const submitSystemDesign = async () => {
    if (!opts.selectedScenario || opts.selectedScenario.type !== "system-design") return

    opts.setIsRunningTests(true) // Reuse this state for loading indicator

    // Clear auto-save data immediately on submission to prevent session restoration
    if (opts.firebaseUser && opts.selectedScenario) {
      const storageKey = `interview_autosave_${opts.firebaseUser.uid}_${opts.selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure - localStorage might be unavailable
      }
    } else if (opts.isGuestMode && opts.selectedScenario) {
      const storageKey = `interview_autosave_guest_${opts.selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure
      }
    }

    try {
      // Mark question as evaluating in roadmap (if from roadmap)
      if (opts.isFromRoadmap && opts.selectedScenario && opts.activeRoadmap) {
        opts.markQuestionEvaluating(opts.selectedScenario.id)
      }

      // Generate feedback for system design based on conversation and design notes
      await opts.triggerSystemDesignFeedback()

      // Show success feedback
      opts.playSound("success")
      toast.success("Design submitted!", {
        description: "Your design notes have been saved. Review your feedback below.",
      })
    } catch (error) {
      console.error("System design submission error:", error)
      toast.error("Failed to submit design", {
        description: "There was a problem submitting your design. Please try again.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => submitSystemDesign(),
        },
      })
    } finally {
      opts.setIsRunningTests(false)
    }
  }

  return { submitSystemDesign }
}
