"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Clock, Code, MessageSquare, Brain, CheckCircle } from "lucide-react"

export interface FeedbackLoadingStateProps {
  onGoToDashboard: () => void
}

// Progressive stages that feel more tangible
const ANALYSIS_STAGES = [
  { icon: Code, label: "Analyzing code structure", duration: 3000 },
  { icon: Brain, label: "Evaluating algorithm efficiency", duration: 4000 },
  { icon: MessageSquare, label: "Reviewing discussion quality", duration: 5000 },
  { icon: Sparkles, label: "Generating personalized feedback", duration: 8000 },
]

export function FeedbackLoadingState({ onGoToDashboard }: FeedbackLoadingStateProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Progress through stages
  useEffect(() => {
    const stageTimers: NodeJS.Timeout[] = []
    let totalDelay = 0

    ANALYSIS_STAGES.forEach((stage, index) => {
      if (index > 0) {
        const timer = setTimeout(() => {
          setCurrentStage(index)
        }, totalDelay)
        stageTimers.push(timer)
      }
      totalDelay += stage.duration
    })

    return () => stageTimers.forEach((timer) => clearTimeout(timer))
  }, [])

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  return (
    <div className="flex flex-col items-center justify-center px-8 py-16">
      {/* Main spinner */}
      <div className="relative mb-8">
        <div className="border-accent/20 border-t-accent h-20 w-20 animate-spin rounded-full border-4" />
        <Sparkles className="text-accent absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>

      <h3 className="mb-2 text-xl font-semibold text-white">Generating Your Feedback</h3>
      <p className="mb-6 max-w-md text-center text-gray-400">
        Our AI is analyzing your interview performance across multiple dimensions.
      </p>

      {/* Progressive stages */}
      <div className="mb-6 w-full max-w-sm space-y-3">
        {ANALYSIS_STAGES.map((stage, index) => {
          const StageIcon = stage.icon
          const isComplete = index < currentStage
          const isCurrent = index === currentStage
          const isPending = index > currentStage

          return (
            <div
              key={stage.label}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-all duration-300 ${
                isComplete
                  ? "bg-green-900/20 text-green-400"
                  : isCurrent
                    ? "bg-accent/10 text-accent"
                    : "text-gray-500"
              }`}
            >
              {isComplete ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <StageIcon
                  className={`h-4 w-4 flex-shrink-0 ${isCurrent ? "animate-pulse" : ""}`}
                />
              )}
              <span className="text-sm">{stage.label}</span>
              {isCurrent && (
                <div className="ml-auto flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time elapsed */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>Elapsed: {formatTime(elapsedTime)}</span>
      </div>

      {/* Dashboard option */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-xs text-gray-500">
          Don&apos;t want to wait? Your results will be saved automatically.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToDashboard}
          className="text-gray-400 hover:text-white"
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  )
}
