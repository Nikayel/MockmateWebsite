"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface NPSSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (score: number, feedback?: string) => Promise<void>
}

export function NPSSurveyModal({ isOpen, onClose, onSubmit }: NPSSurveyModalProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (selectedScore === null) return

    setIsSubmitting(true)
    try {
      await onSubmit(selectedScore, feedback || undefined)
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        // Reset state after close
        setSelectedScore(null)
        setFeedback("")
        setSubmitted(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to submit NPS:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-green-500 hover:bg-green-600 text-white"
    if (score >= 7) return "bg-yellow-500 hover:bg-yellow-600 text-white"
    return "bg-red-500 hover:bg-red-600 text-white"
  }

  const getSelectedColor = (score: number) => {
    if (score >= 9) return "ring-green-500 bg-green-500 text-white"
    if (score >= 7) return "ring-yellow-500 bg-yellow-500 text-white"
    return "ring-red-500 bg-red-500 text-white"
  }

  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">Thank you!</div>
            <p className="text-muted-foreground">
              Your feedback helps us improve Mockmate.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How likely are you to recommend Mockmate?</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve. This takes 10 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Score selection */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            <div className="flex gap-1.5 justify-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setSelectedScore(score)}
                  className={cn(
                    "w-9 h-9 rounded-md text-sm font-medium transition-all",
                    "border border-border hover:border-transparent",
                    selectedScore === score
                      ? cn("ring-2 ring-offset-2", getSelectedColor(score))
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
            {selectedScore !== null && (
              <div className="text-center text-sm">
                {selectedScore >= 9 && (
                  <span className="text-green-600">Great! We&apos;re glad you love Mockmate!</span>
                )}
                {selectedScore >= 7 && selectedScore < 9 && (
                  <span className="text-yellow-600">Thanks! What could make it a 10?</span>
                )}
                {selectedScore < 7 && (
                  <span className="text-red-600">We&apos;d love to hear how we can improve.</span>
                )}
              </div>
            )}
          </div>

          {/* Optional feedback */}
          {selectedScore !== null && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                {selectedScore >= 9
                  ? "What do you love most? (optional)"
                  : "How can we improve? (optional)"}
              </label>
              <Textarea
                placeholder="Share your thoughts..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedScore === null || isSubmitting}
              className={cn(
                selectedScore !== null && getScoreColor(selectedScore)
              )}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
