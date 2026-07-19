"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { X } from "lucide-react"
import { logger } from "@/lib/logger"

/**
 * In-app NPS survey. Self-gating: it asks GET /api/nps whether this user is due (the server enforces
 * the cadence via shouldShowNPSSurvey), renders a dismissible corner card if so, and posts the 0-10
 * score plus optional feedback to POST /api/nps. Mounted on the dashboard so it never interrupts an
 * interview or a lesson. This is the collection surface that feeds the admin Growth NPS dashboard.
 */
export function NpsSurvey() {
  const { firebaseUser } = useAuth()
  const [shouldShow, setShouldShow] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await firebaseUser.getIdToken()
        const res = await fetch("/api/nps", { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && data.shouldShow) setShouldShow(true)
      } catch (error) {
        logger.error("NPS eligibility check failed", { error })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [firebaseUser])

  if (!shouldShow || dismissed) return null

  const submit = async () => {
    if (score === null || !firebaseUser) return
    setSubmitting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback: feedback.trim() || undefined }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => setDismissed(true), 2500)
      }
    } catch (error) {
      logger.error("NPS submit failed", { error })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[min(92vw,22rem)] rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss survey"
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-300"
      >
        <X className="h-4 w-4" />
      </button>

      {submitted ? (
        <p className="py-2 text-sm text-gray-200">Thanks for the feedback!</p>
      ) : (
        <>
          <p className="pr-4 text-sm font-medium text-white">
            How likely are you to recommend CodeSparring to a friend or colleague?
          </p>
          <div
            className="mt-3 grid grid-cols-11 gap-1"
            role="radiogroup"
            aria-label="Score from 0 to 10"
          >
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                role="radio"
                aria-checked={score === n}
                aria-label={String(n)}
                className={`rounded py-1 text-xs font-medium transition-colors ${
                  score === n
                    ? "bg-[#c4703f] text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-500">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>

          {score !== null && (
            <>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What is the main reason for your score? (optional)"
                rows={2}
                className="mt-3 w-full resize-none rounded-lg border border-gray-800 bg-gray-950 p-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-[#c4703f] focus:outline-none"
              />
              <button
                onClick={submit}
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-[#c4703f] py-2 text-sm font-semibold text-black hover:bg-[#c4703f]/90 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
