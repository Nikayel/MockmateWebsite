"use client"
import { useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePracticePlan } from "@/lib/hooks/usePracticePlan"
import { trackEvent } from "@/lib/analytics"

export function SavedPracticeCard({ isPro = false }: { isPro?: boolean }) {
  const { result, remove, writing, error, retry } = usePracticePlan()
  const reported = useRef(new Set<string>())
  useEffect(() => {
    if (
      (result.status === "ready" || result.status === "complete") &&
      !reported.current.has(`${result.plan.revision}:${result.status}`)
    ) {
      reported.current.add(`${result.plan.revision}:${result.status}`)
      trackEvent(
        result.status === "complete" ? "practice_plan_completed" : "practice_plan_return_viewed",
        {
          source_session_id: result.plan.sourceSessionId,
          scenario_id: result.plan.recommendation.scenarioId,
        }
      )
    }
  }, [result])
  if (result.status === "empty" || result.status === "signed_out") return null
  return (
    <section
      aria-label="Saved next practice"
      className="border-border/50 bg-card/50 mb-6 rounded-xl border p-4 sm:p-5"
    >
      <h2 className="text-foreground text-base font-semibold">
        {result.status === "complete" ? "You completed your saved practice" : "Your next practice"}
      </h2>
      {result.status === "loading" ? (
        <p role="status" className="text-muted-foreground mt-2 text-sm">
          Loading your saved task…
        </p>
      ) : result.status === "error" || result.status === "reauth_required" ? (
        <div className="mt-2">
          <p role="status" className="text-muted-foreground text-sm">
            {result.status === "reauth_required"
              ? "Sign in again to see your saved task."
              : "We couldn't load your saved task. Your sessions are still available below."}
          </p>
          <Button className="mt-3 min-h-11" variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <h3 className="mt-3 font-medium">{result.plan.recommendation.title}</h3>
          {result.status === "complete" ? (
            <>
              {result.observations.length ? (
                result.observations.map((observation) => (
                  <p key={observation} className="text-muted-foreground mt-2 text-sm leading-6">
                    {observation}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground mt-2 text-sm">
                  You completed this task. Review your session for feedback and next steps.
                </p>
              )}
              <Button asChild className="mt-4 min-h-11">
                <Link href={`/sessions/${encodeURIComponent(result.completedSessionId)}`}>
                  Review feedback and choose your next task
                </Link>
              </Button>
              {!isPro && (
                <p className="text-muted-foreground mt-4 text-sm">
                  Preparing for an interview?{" "}
                  <Link
                    href="/upgrade?source=practice-plan"
                    className="text-foreground underline underline-offset-4"
                    onClick={() =>
                      trackEvent("practice_plan_pro_cta_clicked", {
                        source_session_id: result.plan.sourceSessionId,
                      })
                    }
                  >
                    Explore Pro's company and role tailored roadmap.
                  </Link>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-muted-foreground mt-1 text-sm">
                About {result.plan.recommendation.estimatedMinutes} minutes
              </p>
              <p className="mt-3 text-sm leading-6">{result.plan.recommendation.focus}</p>
              <Button asChild className="mt-4 min-h-11">
                <a
                  href={`${result.plan.recommendation.href}&return=dashboard`}
                  onClick={() =>
                    trackEvent("practice_plan_return_clicked", {
                      source_session_id: result.plan.sourceSessionId,
                      scenario_id: result.plan.recommendation.scenarioId,
                    })
                  }
                >
                  Open saved practice
                </a>
              </Button>
              <p className="text-muted-foreground mt-2 text-xs">
                Opening uses no sessions. Normal limits apply when you start.
              </p>
              {result.plan.reminderStatus === "pending" && (
                <p className="text-muted-foreground mt-3 text-sm">
                  Reminder scheduled after {new Date(result.plan.reminderAt!).toLocaleString()}.
                </p>
              )}
              {(result.plan.reminderStatus === "failed" ||
                result.plan.reminderStatus === "uncertain") && (
                <p className="text-muted-foreground mt-3 text-sm">
                  We couldn't confirm your email reminder. Your saved task is still available.
                </p>
              )}
            </>
          )}
          <Button
            variant="ghost"
            className="mt-3 min-h-11"
            disabled={writing}
            onClick={() => void remove(result.plan.revision)}
          >
            {writing ? "Removing…" : "Remove saved task"}
          </Button>
          {error && (
            <p role="alert" className="text-destructive mt-2 text-sm">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  )
}
