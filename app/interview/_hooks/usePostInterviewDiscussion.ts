import { toast } from "sonner"
import type { Dispatch, SetStateAction } from "react"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { User, Profile } from "@/lib/types"
import {
  analyzeCodeEfficiency,
  analyzeComplexityWithLLM,
  type LLMComplexityResult,
} from "@/lib/interview"
import type { Scenario } from "@/lib/scenarios"
import type { ConversationTracker } from "@/lib/interview/interview-phases"
import type { InterviewTargetCompany } from "@/lib/stores"
import type { ChatMessage, ConsoleLogEntry, EfficiencyMetrics, TestResult } from "../_types"

export interface UsePostInterviewDiscussionOptions {
  // Auth / entitlement
  user: User | null
  usageLimit: { used?: number } | null
  experienceLevel: string

  // Page state reads
  selectedScenario: Scenario | null
  code: string
  selectedLanguage: string
  elapsedTime: number
  interviewerMessages: ChatMessage[]
  consoleLogs: ConsoleLogEntry[]
  conversationTracker: ConversationTracker
  recentNudgeTopics: string[]
  targetCompany: InterviewTargetCompany
  chatWorkspaceContext: unknown

  // Page state setters
  setIsGeneratingDiscussion: Dispatch<SetStateAction<boolean>>
  setEfficiencyMetrics: Dispatch<SetStateAction<EfficiencyMetrics | null>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>

  // Injected cross-cutting effects / helpers
  getCachedUserProfile: () => Promise<Profile | null>
  getEdgeCasesForInterviewer: () => { description: string; input: unknown }[]
  updateTrackerOnMessage: (message: string, role: "user" | "interviewer") => void
}

export interface UsePostInterviewDiscussionResult {
  triggerPostInterviewDiscussion: (testResults: TestResult[], summary: any) => Promise<void>
}

/**
 * Owns the post-interview discussion kickoff lifted verbatim from
 * `app/interview/page.tsx`: it computes solution complexity (LLM with regex
 * fallback), updates the displayed efficiency metrics, then fires the
 * `POST /api/chat` debrief prompt. Split out of `useInterviewFeedback` to keep
 * each hook file focused; the `/api/chat` request body is preserved byte-identical.
 */
export function usePostInterviewDiscussion(
  opts: UsePostInterviewDiscussionOptions
): UsePostInterviewDiscussionResult {
  const triggerPostInterviewDiscussion = async (testResults: TestResult[], summary: any) => {
    opts.setIsGeneratingDiscussion(true)

    try {
      if (!opts.selectedScenario) {
        return
      }

      const optimalComplexity = (opts.selectedScenario as any)?.optimalComplexity

      // Firebase ID token for authenticated API calls (null for guests)
      const authToken = await getCurrentUserToken()

      // Use LLM-based complexity analysis for accurate semantic understanding
      // Falls back to regex-based analysis if LLM fails
      let llmComplexity: LLMComplexityResult | null = null
      try {
        llmComplexity = await analyzeComplexityWithLLM({
          code: opts.code,
          language: opts.selectedLanguage,
          problemTitle: opts.selectedScenario.title,
          problemDescription: opts.selectedScenario.description,
          optimalTimeComplexity: optimalComplexity?.time,
          optimalSpaceComplexity: optimalComplexity?.space,
          authToken,
        })
      } catch (llmError) {
        console.warn("LLM complexity analysis failed, using regex fallback:", llmError)
      }

      // Build metrics: prefer LLM results, fall back to regex for missing values
      const regexMetrics = analyzeCodeEfficiency(opts.code, optimalComplexity)

      // Use LLM complexity if available and confident, otherwise use regex
      let finalTimeComplexity = regexMetrics.estimatedTimeComplexity
      let finalSpaceComplexity = regexMetrics.estimatedSpaceComplexity

      if (llmComplexity && llmComplexity.confidence !== "low") {
        if (llmComplexity.timeComplexity !== "Unknown") {
          finalTimeComplexity = llmComplexity.timeComplexity
        }
        if (llmComplexity.spaceComplexity !== "Unknown") {
          finalSpaceComplexity = llmComplexity.spaceComplexity
        }
      }

      const metrics = {
        ...regexMetrics,
        estimatedTimeComplexity: finalTimeComplexity,
        estimatedSpaceComplexity: finalSpaceComplexity,
      }

      // Update state so PostInterviewView shows accurate complexity
      opts.setEfficiencyMetrics(metrics)

      // Trigger interviewer to discuss the solution
      // NOTE: Feedback generation is now DEFERRED until user clicks "View Detailed Feedback"
      // This allows post-interview discussion to be included in the final scoring
      const userProfile = await opts.getCachedUserProfile()

      const discussionPrompt = `[POST-INTERVIEW DISCUSSION - CONTINUE CONVERSATION] This is a continuation of our interview conversation. The candidate has just completed their coding solution.

TEST RESULTS: ${summary.passed}/${summary.total} tests passed (${summary.passRate}% pass rate)
TIME SPENT: ${Math.floor(opts.elapsedTime / 60)} minutes ${opts.elapsedTime % 60} seconds
EFFICIENCY METRICS:
- Time Complexity: ${metrics.estimatedTimeComplexity} (Optimal: ${metrics.optimalTimeComplexity})
- Space Complexity: ${metrics.estimatedSpaceComplexity} (Optimal: ${metrics.optimalSpaceComplexity})
- Efficiency Score: ${metrics.efficiencyScore}/100
- Code Complexity: ${metrics.complexity}
- Lines of Code: ${metrics.linesOfCode}

IMPORTANT: This is a POST-INTERVIEW DISCUSSION phase. You should:
1. Continue the conversation naturally - reference previous discussion points if relevant
2. Discuss the results and solution quality
3. Ask about edge cases, optimizations, or alternative approaches
4. Probe their understanding of time/space complexity
5. Be conversational - this is a debrief, not a restart

Do NOT reintroduce yourself. Continue as if we're in the middle of a discussion about their completed solution.

Be conversational and thorough - like a real interviewer debriefing after a coding interview. The candidate's responses during this discussion will be factored into their final score.`

      const chatHeaders: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) chatHeaders.Authorization = `Bearer ${authToken}`
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: chatHeaders,
        body: JSON.stringify({
          message: discussionPrompt,
          context: opts.interviewerMessages,
          role: "interviewer",
          userContext: userProfile
            ? {
                email: opts.user?.email,
                subscription_tier: userProfile.subscription_tier,
                sessions_used: opts.usageLimit?.used || 0,
                skill_level: opts.experienceLevel,
              }
            : { skill_level: opts.experienceLevel },
          workspaceContext: opts.chatWorkspaceContext,
          currentCode: opts.code,
          scenarioTitle: opts.selectedScenario?.title,
          scenarioType: opts.selectedScenario?.type,
          scenarioCompany: opts.targetCompany,
          isProactive: false,
          edgeCases: opts.getEdgeCasesForInterviewer(),
          recentNudgeTopics: opts.recentNudgeTopics,
          // Pass test results and console logs for interviewer awareness
          testResults: testResults,
          consoleLogs: opts.consoleLogs,
          // Phase-aware interview tracking
          // NOTE: Explicitly set hasSubmitted=true and interviewPhase='post_interview'
          // because React state may not have updated yet when this is called
          interviewPhase: "post_interview" as const,
          conversationTracker: opts.conversationTracker,
          hasSubmitted: true, // Explicit - don't rely on state timing
          // Use freshly computed metrics (not stale state)
          solutionComplexity: {
            estimated: metrics.estimatedTimeComplexity,
            optimal: metrics.optimalTimeComplexity,
            isOptimal: metrics.estimatedTimeComplexity === metrics.optimalTimeComplexity,
            // Include space complexity for real-time validation of user claims
            estimatedSpace: metrics.estimatedSpaceComplexity,
            optimalSpace: metrics.optimalSpaceComplexity,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.warn("[API] Request failed:", response.status, response.url, data)
      }

      if (data.reply) {
        opts.setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        // Track interviewer response for conversation context
        opts.updateTrackerOnMessage(data.reply, "interviewer")
      }
    } catch (error) {
      console.error("Error in post-interview discussion:", error)
      toast.error("Failed to start discussion")
    } finally {
      opts.setIsGeneratingDiscussion(false)
    }
  }

  return { triggerPostInterviewDiscussion }
}
