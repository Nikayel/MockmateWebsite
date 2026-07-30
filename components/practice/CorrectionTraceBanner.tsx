"use client"

import { useState } from "react"
import Link from "next/link"
import { Brain, X } from "lucide-react"

export interface CorrectionTrace {
  id: string
  problem_id: string
  scenario_id: string
  title: string
  reason: "typo" | "rushed" | "learned_elsewhere"
  status: "pending_verification" | "verified"
  passed: boolean | null
}

const REASON_LABEL: Record<CorrectionTrace["reason"], string> = {
  typo: "typo",
  rushed: "rushing",
  learned_elsewhere: "learned elsewhere",
}

/**
 * The Correct layer's visible trace on /practice: the model doesn't respond
 * silently — the learner sees what their correction changed. Deliberately a
 * one-liner per correction, no session-composition diffing.
 */
export function CorrectionTraceBanner({ corrections }: { corrections: CorrectionTrace[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = corrections.filter((c) => !dismissed.has(c.id))
  if (visible.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {visible.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-2 rounded-lg border border-purple-600/20 bg-purple-100 px-3 py-2 text-sm dark:border-purple-500/10 dark:bg-purple-500/5"
        >
          <Brain className="mt-0.5 h-4 w-4 shrink-0 text-purple-700 dark:text-purple-400" />
          <p className="text-muted-foreground flex-1">
            {c.status === "pending_verification" ? (
              <>
                Because you corrected{" "}
                <Link
                  href={`/interview?scenario=${c.scenario_id}&practice=true`}
                  className="text-foreground hover:underline"
                >
                  {c.title}
                </Link>{" "}
                ({REASON_LABEL[c.reason]}), it&apos;s scheduled for a verification review today.
              </>
            ) : c.passed ? (
              <>
                Your correction to <span className="text-foreground">{c.title}</span> checked out —
                the model updated.
              </>
            ) : (
              <>
                Your correction to <span className="text-foreground">{c.title}</span> didn&apos;t
                hold up — it&apos;s back on the normal schedule.
              </>
            )}
          </p>
          <button
            onClick={() => setDismissed(new Set(dismissed).add(c.id))}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
