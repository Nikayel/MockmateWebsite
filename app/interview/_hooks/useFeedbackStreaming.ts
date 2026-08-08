import { useCallback, useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
import { computeFallbackScores } from "@/lib/interview/fallback-feedback"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { useStreamingFeedback } from "@/lib/hooks/use-streaming-feedback"

type ScoreBreakdown = {
  understandingScore?: number
  problemSolvingScore?: number
  codeQualityScore?: number
  communicationScore?: number
} | null

type StructuredFeedback = {
  whatWorked?: string[]
  fixNext?: string[]
  actionPlan?: string[]
  tldr?: string
} | null

type StreamingFeedbackController = ReturnType<typeof useStreamingFeedback>

export interface UseFeedbackStreamingOptions {
  currentSessionId: string | null

  // Streaming feedback (injected — do not import the hook at runtime)
  streamingFeedback: StreamingFeedbackController

  // Page state setters
  setScoreBreakdown: Dispatch<SetStateAction<ScoreBreakdown>>
  setPerformanceScore: Dispatch<SetStateAction<number | null>>
  setTechnicalScore: Dispatch<SetStateAction<number | null>>
  setComprehensiveFeedback: Dispatch<SetStateAction<string>>
  setStructuredFeedback: Dispatch<SetStateAction<StructuredFeedback>>
  setIsGeneratingFeedback: Dispatch<SetStateAction<boolean>>
}

export interface UseFeedbackStreamingResult {
  applyFallbackFeedback: (request: any) => Promise<void>
  lastFeedbackRequestRef: React.MutableRefObject<any>
}

/**
 * Owns the streaming-feedback plumbing lifted verbatim from `app/interview/page.tsx`:
 * the `lastFeedbackRequestRef`, the completion-toast guard ref, the automated
 * fallback-scoring path (`applyFallbackFeedback`), and the `streamingFeedback.state`
 * → page-state mapping `useEffect`. The `/api/feedback/persist` body is preserved
 * byte-identical. `applyFallbackFeedback` + `lastFeedbackRequestRef` are returned so
 * `useInterviewFeedback` can wire them into `proceedToFinalFeedback`. `streamingFeedback`
 * is injected via opts (do not import the hook at runtime); widely-shared state stays
 * in the page (injected setters).
 */
export function useFeedbackStreaming(
  opts: UseFeedbackStreamingOptions
): UseFeedbackStreamingResult {
  // Track the last feedback request for fallback scoring if streaming fails
  const lastFeedbackRequestRef = useRef<any>(null)

  // Track if we've already shown completion toast to prevent duplicates
  const feedbackCompletionToastShown = useRef(false)

  const applyFallbackFeedback = useCallback(
    async (request: any) => {
      try {
        const { scoreBreakdown: mappedBreakdown, performanceScore } = computeFallbackScores(request)

        opts.setScoreBreakdown(mappedBreakdown)
        opts.setPerformanceScore(performanceScore)

        const fallbackText =
          "Automated scoring applied. Detailed AI feedback is unavailable due to a service error."
        opts.setComprehensiveFeedback(fallbackText)

        if (opts.currentSessionId) {
          const idToken = await getCurrentUserToken()
          if (!idToken) {
            throw new Error("You must be signed in to save feedback.")
          }
          await fetch("/api/feedback/persist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              sessionId: request.sessionId,
              userId: request.userId,
              scores: {
                understanding: mappedBreakdown.understandingScore,
                problemSolving: mappedBreakdown.problemSolvingScore,
                codeQuality: mappedBreakdown.codeQualityScore,
                communication: mappedBreakdown.communicationScore,
                overall: performanceScore,
              },
              feedback: {
                raw: fallbackText,
                tldr: "Service Error",
                whatWorked: [],
                fixNext: [],
                actionPlan: [],
              },
              testsPassed: request.testsPassed,
              testsTotal: request.testsTotal,
              timeSpentMinutes: Math.round((request.elapsedTimeSeconds || 0) / 60),
              hintsUsed: request.hintsUsed || 0,
              difficulty: request.scenarioDifficulty || "medium",
              scenarioType: request.scenarioType || "dsa",
              scenarioTitle: request.scenarioTitle || "Unknown",
              scenarioId: request.scenarioId,
              scenarioPattern: request.scenarioPattern,
            }),
          })
        }
      } catch (e) {
        console.error("Fallback logic failed", e)
      }
    },
    [opts.currentSessionId]
  )

  useEffect(() => {
    const feedbackState = opts.streamingFeedback.state

    // IMPORTANT: Only update scores/feedback when fully persisted to avoid showing partial data
    // During streaming, we just track progress via the phase message

    // Wait for feedback to be persisted before showing final scores
    // This prevents the "flickering scores" issue where instant scores show then get replaced
    if (feedbackState.isPersisted && feedbackState.feedback) {
      // Use the final scores from the feedback (which includes refined scores)
      const finalScores = feedbackState.feedback.scores
      if (finalScores) {
        opts.setScoreBreakdown({
          understandingScore: finalScores.understanding,
          problemSolvingScore: finalScores.problemSolving,
          codeQualityScore: finalScores.codeQuality,
          communicationScore: finalScores.communication,
        })
        opts.setPerformanceScore(finalScores.overall)
      }

      // Use mastery/technical scores from persist endpoint (properly calculated)
      if (feedbackState.technicalScore !== null) {
        opts.setTechnicalScore(feedbackState.technicalScore)
      }

      // Update feedback content
      opts.setComprehensiveFeedback(feedbackState.feedback.raw || "")
      opts.setStructuredFeedback({
        whatWorked: feedbackState.feedback.whatWorked || [],
        fixNext: feedbackState.feedback.fixNext || [],
        actionPlan: feedbackState.feedback.actionPlan || [],
        tldr: feedbackState.feedback.tldr || "",
      })
    }

    // Handle completion - only show toast once AND only after persist completes
    if (
      feedbackState.phase === "complete" &&
      feedbackState.isPersisted &&
      !feedbackState.error &&
      !feedbackCompletionToastShown.current
    ) {
      feedbackCompletionToastShown.current = true
      opts.setIsGeneratingFeedback(false)
      toast.success("Feedback ready!", {
        description: "Your personalized analysis is complete.",
      })
    } else if (feedbackState.error && !feedbackCompletionToastShown.current) {
      feedbackCompletionToastShown.current = true
      opts.setIsGeneratingFeedback(false)
      // If we have feedback but persist failed, still show success (feedback is in UI)
      if (feedbackState.feedback) {
        toast.warning("Feedback generated", {
          description: "Results may not be saved to history.",
        })
      } else {
        // This is the only place a feedback failure reaches the screen, and it
        // used to say the same thing whatever happened. A refusal the server
        // NAMED (a rate limit, a monthly or daily budget, a platform-wide
        // capacity pause) is temporary and has its own remedy, so it gets its
        // own words. Only an unnamed failure is genuinely "something went
        // wrong", and that is the case the fallback-scoring line belongs to.
        // Fallback scoring runs either way, so the user still gets scores.
        const refusal = feedbackState.refusal
        toast.error(refusal?.title ?? "Feedback generation failed", {
          description: refusal?.message ?? "Applying automated fallback scoring.",
          // Longer than the usual 6s: a refusal carries a decision, not news.
          duration: refusal ? 12000 : 6000,
        })
        if (lastFeedbackRequestRef.current) {
          applyFallbackFeedback(lastFeedbackRequestRef.current)
        }
      }
    }

    // Reset toast flag when state resets to idle
    if (feedbackState.phase === "idle") {
      feedbackCompletionToastShown.current = false
    }
  }, [opts.streamingFeedback.state])

  return { applyFallbackFeedback, lastFeedbackRequestRef }
}
