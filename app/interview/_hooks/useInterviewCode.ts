/**
 * useInterviewCode Hook
 *
 * Handles code execution, test running, and submission logic.
 * ~350 lines - focused on code/test handling only.
 */

import { useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useInterviewStore } from "@/lib/stores"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import {
  getUserProfile,
  updateInterviewSession,
  markSessionEvaluating,
} from "@/lib/firestore-helpers"
import { saveGuestSessionData } from "@/lib/guest-session"
import { analyzeCodeEfficiency } from "@/lib/interview"
import { validateCodeProtection } from "@/lib/code-protection"
import { toast } from "sonner"
import type { ChatMessage, TestResult, TestSummary, EfficiencyMetrics } from "../_providers"
import type { ConversationTracker } from "@/lib/interview/interview-phases"

interface UseInterviewCodeProps {
  // State
  selectedScenario: { id: string; title: string; type: string; difficulty?: string } | null
  currentSessionId: string | null
  code: string
  selectedLanguage: string
  starterCode: string
  protectedElements: ReturnType<
    typeof import("@/lib/code-protection").extractProtectedElements
  > | null
  interviewerMessages: ChatMessage[]
  chatMessages: ChatMessage[]
  testResults: TestResult[]
  efficiencyMetrics: EfficiencyMetrics | null
  conversationTracker: ConversationTracker
  elapsedTime: number
  revealedHints: number
  isGuestMode: boolean
  guestId: string | null
  // Setters
  setTestResults: React.Dispatch<React.SetStateAction<TestResult[]>>
  setConsoleLogs: React.Dispatch<
    React.SetStateAction<
      Array<{
        type: "log" | "error" | "warn" | "info" | "result"
        message: string
        timestamp?: number
      }>
    >
  >
  setIsRunningTests: (running: boolean) => void
  setTestSummary: (summary: TestSummary) => void
  setEfficiencyMetrics: (metrics: EfficiencyMetrics | null) => void
  setShowPostInterviewDiscussion: (show: boolean) => void
  setConversationTracker: React.Dispatch<React.SetStateAction<ConversationTracker>>
  // Callbacks
  triggerPostInterviewDiscussion: (results: TestResult[], summary: TestSummary) => Promise<void>
}

export function useInterviewCode(props: UseInterviewCodeProps) {
  const { user, firebaseUser } = useAuth()
  const { targetCompany } = useInterviewStore()
  const { activeRoadmap, markQuestionCompleted, addActualTime } = useRoadmapStore()

  // Run code and tests
  const runCode = useCallback(async () => {
    if (!props.selectedScenario) return

    props.setIsRunningTests(true)
    props.setTestResults([])
    props.setConsoleLogs([])

    // Analyze efficiency
    const metrics = analyzeCodeEfficiency(props.code)
    props.setEfficiencyMetrics(metrics)

    // Update tracker
    props.setConversationTracker((prev: ConversationTracker) => ({ ...prev, hasRunTests: true }))

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: props.code,
          scenarioId: props.selectedScenario.id,
          language: props.selectedLanguage,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error("Execution error", { description: data.error })
        props.setConsoleLogs([{ type: "error" as const, message: data.error }])
      } else {
        props.setTestResults(data.results || [])
        if (data.consoleLogs) {
          props.setConsoleLogs(data.consoleLogs)
        }

        const results = data.results || []
        const passed = results.filter((r: TestResult) => r.passed).length
        const total = results.length
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

        props.setTestSummary({ total, passed, failed: total - passed, passRate })

        if (passRate === 100) {
          toast.success("All tests passed!", { description: "Great job!" })
        } else if (passRate > 0) {
          toast.info(`${passed}/${total} tests passed`, {
            description: "Keep working on the failing cases.",
          })
        } else {
          toast.warning("No tests passed", { description: "Check your solution logic." })
        }
      }
    } catch (error) {
      console.error("Error running code:", error)
      toast.error("Failed to run tests")
    } finally {
      props.setIsRunningTests(false)
    }
  }, [props.selectedScenario, props.code, props.selectedLanguage])

  // Submit code for final evaluation
  const submitCode = useCallback(async () => {
    if (!props.selectedScenario) return

    // Validate code protection
    if (props.protectedElements) {
      const validation = validateCodeProtection(
        props.code,
        props.protectedElements,
        props.selectedLanguage
      )
      if (!validation.valid) {
        toast.error("Code validation failed", {
          description: validation.errors.join(", "),
        })
        return
      }
    }

    props.setIsRunningTests(true)

    try {
      // Run final tests
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: props.code,
          scenarioId: props.selectedScenario.id,
          language: props.selectedLanguage,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error("Submission failed", { description: data.error })
        return
      }

      const results = data.results || []
      const passed = results.filter((r: TestResult) => r.passed).length
      const total = results.length
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
      const summary = { total, passed, failed: total - passed, passRate }

      props.setTestResults(results)
      props.setTestSummary(summary)
      if (data.consoleLogs) {
        props.setConsoleLogs(data.consoleLogs)
      }

      // Update session in database
      if (props.currentSessionId && user) {
        try {
          await markSessionEvaluating(props.currentSessionId, {
            code: props.code,
            language: props.selectedLanguage,
            elapsedTime: props.elapsedTime,
            testResults: results,
            testSummary: summary,
          })
        } catch (error) {
          console.error("Error updating session:", error)
        }
      } else if (props.isGuestMode && props.guestId) {
        try {
          saveGuestSessionData({
            scenarioId: props.selectedScenario.id,
            code: props.code,
            testResults: results,
            passRate,
          } as any)
        } catch (error) {
          console.error("Error saving guest data:", error)
        }
      }

      // Update roadmap progress
      if (activeRoadmap && props.selectedScenario) {
        const performanceScore = passRate
        markQuestionCompleted(props.selectedScenario.id, performanceScore)
        const minutesSpent = Math.round(props.elapsedTime / 60)
        if (minutesSpent > 0) {
          addActualTime(minutesSpent)
        }
      }

      // Start post-interview discussion
      props.setShowPostInterviewDiscussion(true)
      await props.triggerPostInterviewDiscussion(results, summary)
    } catch (error) {
      console.error("Error submitting code:", error)
      toast.error("Failed to submit")
    } finally {
      props.setIsRunningTests(false)
    }
  }, [
    props.selectedScenario,
    props.code,
    props.selectedLanguage,
    props.protectedElements,
    props.currentSessionId,
    props.elapsedTime,
    props.revealedHints,
    props.isGuestMode,
    props.guestId,
    user,
    activeRoadmap,
    props.triggerPostInterviewDiscussion,
  ])

  // Submit system design (no code execution)
  const submitSystemDesign = useCallback(async () => {
    if (!props.selectedScenario) return

    props.setShowPostInterviewDiscussion(true)

    // For system design, create a simple summary
    const summary: TestSummary = {
      total: 1,
      passed: 1, // System design counts as "passed" for triggering discussion
      failed: 0,
      passRate: 100,
    }

    await props.triggerPostInterviewDiscussion([], summary)
  }, [props.selectedScenario, props.triggerPostInterviewDiscussion])

  return {
    runCode,
    submitCode,
    submitSystemDesign,
  }
}

export type UseInterviewCodeReturn = ReturnType<typeof useInterviewCode>
