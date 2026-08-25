"use client"

import { CheckCircle2 } from "lucide-react"

import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"
import { Sparra } from "@/components/brand/Sparra"

export interface FeedbackLoadingStateProps {
  onGoToDashboard: () => void
  interviewStats?: {
    testsPassed?: number
    totalTests?: number
    timeSpentMinutes?: number
    messagesExchanged?: number
    codeLines?: number
  }
  /** Real progress 0..1, from useScoringProgress. */
  progress: number
  /** Current checklist row, derived from the same anchors as the ring. */
  stepIndex: number
  /** Rows before this index are done. */
  completedThrough: number
  /** Wall clock for the wait. Owned above this component so it survives re-renders. */
  elapsedMs: number
  /** The current stage is running long; the copy says so rather than pretending. */
  stalled?: boolean
  /** Ring tween for this frame. */
  ringTweenMs: number
  ringEase: string
  /** The server's own description of what it is doing right now. */
  phaseMessage?: string
}

/**
 * The scoring wait.
 *
 * This component holds NO state. Everything it draws is passed in, because the
 * wait outlives any single mount of this view and progress that restarts when a
 * parent re-renders is worse than no progress at all.
 */

/**
 * Rows name the work, not a workflow.
 *
 * These used to read "Reading your code / Evaluating solution / Reviewing
 * discussion / Saving your results". The third one was the problem: it named an
 * *input* while the machine was writing, and it sat over the single longest stage
 * in the pipeline. People grant time to writing. They do not grant it to
 * reviewing, so the longest part of the wait was also the part that read as
 * least justified.
 */
const ANALYSIS_STEPS = [
  "Reading your submission",
  "Reviewing code and transcript",
  "Writing your feedback",
  "Saving to your history",
]

/** Elapsed time is hidden until this point: a clock before then only adds anxiety. */
const SHOW_CLOCK_AFTER_MS = 10_000
/** Past this, offer a way out. It is an escape, not a cancel; scoring continues. */
const SHOW_EXIT_AFTER_MS = 30_000

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function FeedbackLoadingState({
  onGoToDashboard,
  interviewStats,
  progress,
  stepIndex,
  completedThrough,
  elapsedMs,
  stalled,
  ringTweenMs,
  ringEase,
  phaseMessage,
}: FeedbackLoadingStateProps) {
  const showClock = elapsedMs >= SHOW_CLOCK_AFTER_MS
  const showExit = elapsedMs >= SHOW_EXIT_AFTER_MS

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Sparra
            state="scoring"
            size={88}
            progress={progress}
            ringTweenMs={ringTweenMs}
            ringEase={ringEase}
            label="Scoring your submission"
          />
        </div>

        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-3 text-2xl font-semibold tracking-tight">
            Scoring your submission
            <AnimatedEllipsis />
          </h2>
          {/* The server has been narrating this the whole time ("Analyzing your
              interview...", "Generating personalized feedback..."). The copy was
              passed all the way down here and then thrown away. */}
          <p
            className="text-muted-foreground min-h-[1.25rem] text-sm font-medium"
            aria-live="polite"
          >
            {stalled
              ? "Still working. Longer sessions take longer to grade."
              : (phaseMessage ?? ANALYSIS_STEPS[stepIndex] ?? "")}
          </p>
          {showClock && (
            <p className="text-muted-foreground/70 mt-1 text-xs font-medium tabular-nums">
              {formatElapsed(elapsedMs)}
            </p>
          )}
        </div>

        <div className="mb-12 space-y-4">
          {ANALYSIS_STEPS.map((step, index) => {
            const isComplete = index < completedThrough
            const isCurrent = index === stepIndex && !isComplete

            return (
              <div
                key={step}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  index > stepIndex ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex h-6 w-6 items-center justify-center">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : isCurrent ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-[#8ab4f0]" />
                  ) : (
                    <div className="bg-muted h-2 w-2 rounded-full" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>

        {interviewStats && (
          <div className="flex justify-center gap-4">
            {interviewStats.testsPassed !== undefined &&
              interviewStats.totalTests !== undefined && (
                <div className="bg-muted/50 flex flex-col items-center rounded-2xl px-5 py-3">
                  <span className="text-foreground text-lg font-semibold">
                    {interviewStats.testsPassed}/{interviewStats.totalTests}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">tests</span>
                </div>
              )}
            {interviewStats.timeSpentMinutes !== undefined && (
              <div className="bg-muted/50 flex flex-col items-center rounded-2xl px-5 py-3">
                <span className="text-foreground text-lg font-semibold">
                  {interviewStats.timeSpentMinutes}m
                </span>
                <span className="text-muted-foreground text-xs font-medium">duration</span>
              </div>
            )}
            {interviewStats.codeLines !== undefined && (
              <div className="bg-muted/50 flex flex-col items-center rounded-2xl px-5 py-3">
                <span className="text-foreground text-lg font-semibold">
                  {interviewStats.codeLines}
                </span>
                <span className="text-muted-foreground text-xs font-medium">lines</span>
              </div>
            )}
          </div>
        )}

        {/* Was "Your results will be saved automatically" from the first frame. The
            checklist and the phase line already say that, and unprompted
            reassurance invites the suspicion it was meant to settle. It earns its
            place only once the wait is long enough to want a way out. */}
        {showExit && (
          <div className="mt-10 text-center">
            <p className="text-muted-foreground text-xs font-medium">
              Scoring runs on our servers. You can wait here, or pick this session up from your
              dashboard.
            </p>
            <button
              type="button"
              onClick={onGoToDashboard}
              className="text-muted-foreground hover:text-foreground mt-3 text-xs font-semibold underline underline-offset-4 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
