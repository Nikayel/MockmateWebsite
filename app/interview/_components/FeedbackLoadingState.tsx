"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"

export interface FeedbackLoadingStateProps {
  onGoToDashboard: () => void
  interviewStats?: {
    testsPassed?: number
    totalTests?: number
    timeSpentMinutes?: number
    messagesExchanged?: number
    codeLines?: number
  }
}

const ANALYSIS_STEPS = [
  "Reading your code",
  "Evaluating solution",
  "Reviewing discussion",
  "Generating feedback",
]

export function FeedbackLoadingState({
  onGoToDashboard,
  interviewStats,
}: FeedbackLoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Progress through steps
  useEffect(() => {
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
  }, [])

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-xl font-semibold text-white">Generating Feedback</h2>
          <p className="text-sm text-gray-500">
            {elapsedTime < 60
              ? `${elapsedTime}s elapsed`
              : `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s elapsed`}
          </p>
        </div>

        {/* Progress Steps - Terminal Style */}
        <div className="mb-10 rounded-lg border border-gray-800 bg-gray-900 p-4 font-mono text-sm">
          {ANALYSIS_STEPS.map((step, index) => {
            const isComplete = index < currentStep
            const isCurrent = index === currentStep

            return (
              <div
                key={step}
                className={`flex items-center gap-3 py-1.5 transition-opacity duration-300 ${
                  index > currentStep ? "opacity-30" : "opacity-100"
                }`}
              >
                <span className="w-4 text-gray-600">
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : isCurrent ? (
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-gray-700" />
                  )}
                </span>
                <span className={isComplete ? "text-gray-500 line-through" : "text-gray-300"}>
                  {step}
                </span>
                {isCurrent && <span className="animate-pulse text-gray-500">...</span>}
              </div>
            )
          })}
        </div>

        {/* Session Summary - Compact */}
        {interviewStats && (
          <div className="mb-8 flex justify-center gap-6 text-center text-sm">
            {interviewStats.testsPassed !== undefined &&
              interviewStats.totalTests !== undefined && (
                <div>
                  <div className="font-medium text-white">
                    {interviewStats.testsPassed}/{interviewStats.totalTests}
                  </div>
                  <div className="text-xs text-gray-500">tests passed</div>
                </div>
              )}
            {interviewStats.timeSpentMinutes !== undefined && (
              <div>
                <div className="font-medium text-white">{interviewStats.timeSpentMinutes}m</div>
                <div className="text-xs text-gray-500">duration</div>
              </div>
            )}
            {interviewStats.codeLines !== undefined && (
              <div>
                <div className="font-medium text-white">{interviewStats.codeLines}</div>
                <div className="text-xs text-gray-500">lines</div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Option */}
        <div className="text-center">
          <p className="mb-3 text-xs text-gray-600">Results will be saved to your dashboard</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToDashboard}
            className="text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Go to Dashboard
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
