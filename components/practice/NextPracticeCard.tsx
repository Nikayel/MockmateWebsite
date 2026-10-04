"use client"

import { ArrowRight, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNextPractice } from "@/lib/hooks/useNextPractice"
import { trackEvent } from "@/lib/analytics"
import { getTypeConfig } from "@/components/interview/scenario-display"

export function NextPracticeCard({ sessionId }: { sessionId: string }) {
  const { result, retry } = useNextPractice(sessionId)
  if (result.status === "signed_out" || result.status === "not_found") return null

  return (
    <section
      aria-label="Your next practice"
      className="border-border/50 bg-card/50 rounded-xl border p-4"
    >
      <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Target className="h-3.5 w-3.5" aria-hidden="true" /> Your next practice
      </h2>
      {result.status === "loading" ? (
        <p role="status" className="text-muted-foreground mt-2 text-sm">
          Finding your next task…
        </p>
      ) : result.status === "ready" ? (
        <>
          <h3 className="text-foreground mt-3 text-base leading-snug font-semibold break-words">
            {result.recommendation.title}
          </h3>
          <p className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5">
            <span>{getTypeConfig(result.recommendation.type).label}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{result.recommendation.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span>About {result.recommendation.estimatedMinutes} minutes</span>
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6 break-words">
            {result.recommendation.reason}
          </p>
          <div className="border-border/50 mt-4 border-t pt-3">
            <p className="text-foreground text-xs font-medium">Focus this time</p>
            <p className="text-foreground mt-1 text-sm leading-6 break-words">
              {result.recommendation.focus}
            </p>
          </div>
          {result.recommendation.feedbackNote && (
            <details className="text-muted-foreground mt-1 text-xs">
              <summary className="focus-visible:ring-ring min-h-11 cursor-pointer content-center rounded-md focus-visible:ring-2 focus-visible:outline-none">
                From your feedback
              </summary>
              <blockquote className="border-border mb-3 border-l-2 pl-3 text-sm leading-6 break-words">
                {result.recommendation.feedbackNote}
              </blockquote>
            </details>
          )}
          {/* A full navigation clears the completed interview's editor/feedback state. */}
          <Button asChild className="mt-4 min-h-11 w-full sm:w-auto">
            <a
              href={result.recommendation.href}
              aria-label={`Open practice: ${result.recommendation.title}`}
              onClick={() =>
                trackEvent("next_practice_click", {
                  source_session_id: sessionId,
                  scenario_id: result.recommendation.scenarioId,
                  scenario_type: result.recommendation.type,
                  focus_source: result.recommendation.focusSource,
                  recommendation_source: "feedback",
                })
              }
            >
              Open practice <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            Opening uses no sessions. Normal limits apply when you start.
          </p>
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
              : "We couldn’t load your next task. Your feedback is still available below."}
          </p>
          <Button variant="outline" className="mt-3 min-h-11 w-full sm:w-auto" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
    </section>
  )
}
