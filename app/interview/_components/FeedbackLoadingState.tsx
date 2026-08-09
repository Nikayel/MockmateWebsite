"use client"

import { useState, useEffect } from "react"
import { CheckCircle2 } from "lucide-react"
import { Sparra } from "@/components/brand/Sparra"
import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"

export interface FeedbackLoadingStateProps {
  onGoToDashboard: () => void
  interviewStats?: {
    testsPassed?: number
    totalTests?: number
    timeSpentMinutes?: number
    messagesExchanged?: number
    codeLines?: number
  }
  // Optional streaming phase info for more accurate progress display
  streamingPhase?: string
  phaseMessage?: string
}

const ANALYSIS_STEPS = [
  "Reading your code",
  "Evaluating solution",
  "Reviewing discussion",
  "Saving your results",
]

// Map streaming phases to step indices
const PHASE_TO_STEP: Record<string, number> = {
  calculating_scores: 0,
  analyzing: 1,
  generating: 2,
  persisting: 3,
  complete: 4,
}

// The determinate ring is tuned to the observed p95 of scoring (matches the
// fallback step timers below). It holds at 95% rather than closing — the
// result view replaces it when the answer actually lands (brand rule).
const SCORING_P95_MS = 15000

export function FeedbackLoadingState({
  interviewStats,
  streamingPhase,
  phaseMessage,
}: FeedbackLoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Use streaming phase if available, otherwise fall back to timed animation
  useEffect(() => {
    if (streamingPhase && PHASE_TO_STEP[streamingPhase] !== undefined) {
      // Use actual streaming progress
      setCurrentStep(Math.min(PHASE_TO_STEP[streamingPhase], ANALYSIS_STEPS.length - 1))
    }
  }, [streamingPhase])

  // Fallback: Progress through steps with animation if no streaming phase
  useEffect(() => {
    // If we have streaming phase info, don't use timed animation
    if (streamingPhase) return

    const stepDurations = [2000, 4000, 3000, 6000]
    const timers: NodeJS.Timeout[] = []
    let totalDelay = 0

    stepDurations.forEach((duration, index) => {
      if (index > 0) {
        const timer = setTimeout(() => setCurrentStep(index), totalDelay)
        timers.push(timer)
      }
      totalDelay += duration
    })

    return () => timers.forEach((t) => clearTimeout(t))
  }, [streamingPhase])

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Sparra scoring — determinate ring bounds the wait */}
        <div className="mb-8 flex justify-center" role="status">
          <Sparra
            state="scoring"
            size={88}
            scoreDurationMs={SCORING_P95_MS}
            label="Scoring your submission"
          />
        </div>

        {/* Header - Apple-style clean typography */}
        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-3 text-2xl font-semibold tracking-tight">
            Scoring your submission
            <AnimatedEllipsis />
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            {elapsedTime < 60
              ? `${elapsedTime}s`
              : `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`}
          </p>
        </div>

        {/* Progress Steps - Apple-style minimal */}
        <div className="mb-12 space-y-4">
          {ANALYSIS_STEPS.map((step, index) => {
            const isComplete = index < currentStep
            const isCurrent = index === currentStep

            return (
              <div
                key={step}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  index > currentStep ? "opacity-40" : "opacity-100"
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

        {/* Session Summary - Apple-style cards */}
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

        {/* Subtle footer - Apple style */}
        <p className="text-muted-foreground mt-10 text-center text-xs font-medium">
          Your results will be saved automatically
        </p>
      </div>
    </div>
  )
}
