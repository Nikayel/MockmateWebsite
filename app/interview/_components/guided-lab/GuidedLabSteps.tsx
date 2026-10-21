"use client"

import { CheckCircle2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuidedLabConfig, GuidedLabProgress } from "@/lib/bugfix/guided-lab/types"

export function GuidedLabSteps({
  config,
  progress,
  viewedId,
  onReview,
}: {
  config: GuidedLabConfig
  progress: GuidedLabProgress
  viewedId: string
  onReview: (id: string) => void
}) {
  return (
    <ol aria-label="Lab phases" className="space-y-1">
      {config.milestones.map((milestone, index) => {
        const status = progress.milestoneStatus[milestone.id]
        const previous = config.milestones[index - 1]
        const opensAfter =
          previous?.gate.kind === "manual-ack"
            ? `Opens after you continue from ${previous.title}.`
            : `Opens after ${previous?.title ?? "the previous phase"} passes.`
        return (
          <li key={milestone.id} aria-current={status === "active" ? "step" : undefined}>
            <button
              type="button"
              disabled={status === "locked"}
              onClick={() => onReview(milestone.id)}
              aria-label={`${milestone.title}: ${status === "done" ? "completed, review phase" : status === "active" ? "current phase" : opensAfter}`}
              className={cn(
                "focus-visible:ring-ring flex min-h-11 w-full items-center gap-2 rounded-lg border p-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none",
                viewedId === milestone.id ? "border-accent/40 bg-accent/10" : "border-transparent",
                status === "locked" && "text-muted-foreground"
              )}
            >
              <span
                className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                aria-hidden="true"
              >
                {status === "done" ? (
                  <CheckCircle2 className="text-accent-strong h-4 w-4" />
                ) : status === "locked" ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">
                  {index + 1}. {milestone.title}
                </span>
                <span className="text-muted-foreground mt-0.5 block leading-relaxed">
                  {status === "done"
                    ? "Completed · review instructions"
                    : status === "locked"
                      ? opensAfter
                      : milestone.gate.kind === "manual-ack"
                        ? "Read the brief, then Continue"
                        : "Fix the code, then Run Tests"}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
