"use client"

import { ArrowRight, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNextPractice } from "@/lib/hooks/useNextPractice"
import { useRecommendationTracking } from "@/lib/hooks/useRecommendationTracking"
import { trackEvent } from "@/lib/analytics"
import { getTypeConfig } from "@/components/interview/scenario-display"
import { PracticeSaveControls } from "./PracticeSaveControls"

export function NextPracticeCard({ sessionId }: { sessionId: string }) {
  const { result, retry } = useNextPractice(sessionId)
  const tracking = useRecommendationTracking(
    result.status === "ready" ? result.recommendation.decisionId : undefined,
    "feedback"
  )
  if (result.status === "signed_out" || result.status === "not_found") return null

  return (
    <section
      ref={tracking.ref}
      aria-label="Your next practice"
      className="border-border/50 bg-card/50 rounded-xl border p-4 sm:p-5"
    >
      <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Target className="h-3.5 w-3.5" aria-hidden="true" /> Recommended next step
      </h2>
      {result.status === "loading" ? (
        <p role="status" className="text-muted-foreground mt-2 text-sm">
          Finding your next task…
        </p>
      ) : result.status === "ready" ? (
        <>
          <h3 className="text-foreground mt-3 text-base leading-relaxed font-semibold break-words sm:text-lg">
            {result.recommendation.focus}
          </h3>
          <p className="text-muted-foreground mt-4 text-xs">Practice with</p>
          <p className="text-foreground mt-1 text-sm leading-6 font-medium break-words">
            {result.recommendation.title}
          </p>
          <p className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5">
            <span>{getTypeConfig(result.recommendation.type).label}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{result.recommendation.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span>About {result.recommendation.estimatedMinutes} minutes</span>
          </p>
          <div className="mt-4 grid grid-cols-1 items-start gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-3">
            {/* A full navigation clears the completed interview's editor/feedback state. */}
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <a
                href={result.recommendation.href}
                aria-label={`Open practice: ${result.recommendation.title}`}
                onClick={() => {
                  tracking.reportClick()
                  if (!result.recommendation.decisionId)
                    trackEvent("next_practice_click", {
                      source_session_id: sessionId,
                      scenario_id: result.recommendation.scenarioId,
                      scenario_type: result.recommendation.type,
                      focus_source: result.recommendation.focusSource,
                      recommendation_source: "feedback",
                    })
                }}
              >
                Open practice <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <PracticeSaveControls
              key={`${sessionId}:${result.recommendation.scenarioId}`}
              sourceSessionId={sessionId}
              recommendation={result.recommendation}
            />
          </div>
          <details className="text-muted-foreground mt-2 text-xs">
            <summary className="focus-visible:ring-ring min-h-11 cursor-pointer content-center rounded-md focus-visible:ring-2 focus-visible:outline-none">
              Why this task?
            </summary>
            <div className="space-y-3 pb-1 text-sm leading-6 break-words">
              <p>{result.recommendation.reason}</p>
              {result.recommendation.feedbackNote && (
                <blockquote className="border-border border-l-2 pl-3">
                  <p className="text-foreground text-xs font-medium">From your feedback</p>
                  {result.recommendation.feedbackNote}
                </blockquote>
              )}
              <p className="text-xs leading-5">
                Opening uses no sessions. Normal limits apply when you start.
              </p>
            </div>
          </details>
        </>
      ) : result.status === "reauth_required" ? (
        <p role="status" className="text-muted-foreground mt-2 text-sm">
          Your sign-in expired. Sign in again to see your next task.
        </p>
      ) : result.status === "no_match" ? (
        <div className="mt-2">
          <p className="text-muted-foreground text-sm leading-6">
            No matching task is available in this track and language.
          </p>
          <Button asChild variant="outline" className="mt-3 min-h-11 w-full sm:w-auto">
            <a href="/interview">Browse problems</a>
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <p role="status" className="text-muted-foreground text-sm">
            {result.status === "not_ready"
              ? "Your feedback is still being saved. Try again shortly."
              : "We couldn’t load your next task. You can still review your feedback."}
          </p>
          <Button variant="outline" className="mt-3 min-h-11 w-full sm:w-auto" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
    </section>
  )
}
