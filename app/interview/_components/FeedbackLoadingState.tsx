"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Clock } from "lucide-react"

export interface FeedbackLoadingStateProps {
  onGoToDashboard: () => void
}

export function FeedbackLoadingState({ onGoToDashboard }: FeedbackLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16">
      <div className="relative mb-6">
        <div className="border-accent/20 border-t-accent h-16 w-16 animate-spin rounded-full border-4" />
        <Sparkles className="text-accent absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white">Analyzing Your Performance</h3>
      <p className="mb-4 max-w-md text-center text-gray-400">
        We are evaluating your code, communication, and problem-solving approach to generate
        comprehensive feedback...
      </p>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>This usually takes 30 seconds to 2 minutes</span>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-xs text-gray-500">
          Don&apos;t want to wait? Your results will be saved.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToDashboard}
          className="text-gray-400 hover:text-white"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
