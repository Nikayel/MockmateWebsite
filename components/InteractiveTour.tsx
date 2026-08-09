"use client"

import { useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useFocusTrap } from "@/lib/hooks"
import {
  ArrowRight,
  ArrowLeft,
  X,
  Terminal,
  Brain,
  Route,
  MessageSquare,
  RotateCcw,
  Zap,
  Target,
  Clock,
  TrendingUp,
} from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface InteractiveTourProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: () => void
  onSkip: () => void
}

interface TourStep {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  details?: string[]
  visual?: "forgetting-curve" | "roadmap" | "interview" | "review"
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    icon: Terminal,
    title: "This is not another problem list",
    description:
      "CodeSparring is an interview practice loop: attempt, explain, test, get scored, then review before the skill decays.",
  },
  {
    id: "problem",
    icon: Brain,
    title: "Cramming hides weak signals",
    description:
      "Solving a problem once is not the same as being able to explain it under interview pressure a week later.",
    details: [
      "You may remember the code but lose the decision path",
      "You may pass tests but struggle to explain tradeoffs",
      "You may repeat easy reps while weak patterns fade",
    ],
    visual: "forgetting-curve",
  },
  {
    id: "solution",
    icon: TrendingUp,
    title: "Review is scheduled from your performance",
    description:
      "The platform turns sessions into review timing, so practice becomes a system instead of a streak counter.",
    details: [
      "Harder sessions return sooner",
      "Mastered patterns move farther apart",
      "Short, honest reps beat vague grinding",
    ],
  },
  {
    id: "roadmap",
    icon: Route,
    title: "Roadmaps tied to the interview clock",
    description:
      "Your plan should answer one question: what is the next best rep before the interview date?",
    details: [
      "Target date and company shape the path",
      "Daily work stays small enough to finish",
      "Progress exposes what still needs evidence",
    ],
    visual: "roadmap",
  },
  {
    id: "interview",
    icon: MessageSquare,
    title: "The interviewer listens for reasoning",
    description:
      "The AI is useful when it acts like a skeptical interviewer, not when it sprays generic tips.",
    details: [
      "Talk through assumptions before coding",
      "Get follow-ups when the explanation is thin",
      "Ask for nudges without spoiling the round",
    ],
    visual: "interview",
  },
  {
    id: "review",
    icon: RotateCcw,
    title: "Reviews close the loop",
    description:
      "After a session, CodeSparring keeps the useful signal alive: what you solved, what you explained, and what needs another pass.",
    details: [
      "Review timing follows actual performance",
      "Weak patterns stay visible",
      "Readiness becomes a trend, not a mood",
    ],
    visual: "review",
  },
  {
    id: "start",
    icon: Zap,
    title: "Start with a real rep",
    description:
      "Pick a format, start the clock, explain your choices, and leave with a sharper next step.",
    details: [
      "DSA for pattern fluency",
      "Bugfix for evidence and root-cause thinking",
      "Feature rounds for practical engineering judgment",
    ],
  },
]

// Forgetting Curve Visualization
function ForgettingCurveVisual() {
  return (
    <div className="bg-muted/50 relative h-40 w-full overflow-hidden rounded-lg p-4">
      <div className="absolute inset-0 p-4">
        {/* Y-axis label */}
        <div className="text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2 -rotate-90 text-xs">
          Memory
        </div>
        {/* X-axis label */}
        <div className="text-muted-foreground absolute bottom-1 left-1/2 -translate-x-1/2 text-xs">
          Time (days)
        </div>

        {/* The forgetting curve */}
        <svg className="h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          {/* Without review - steep decline */}
          <motion.path
            d="M 10 10 Q 50 20, 80 60 T 190 90"
            fill="none"
            className="text-destructive"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />
          {/* With spaced repetition - maintained */}
          <motion.path
            d="M 10 10 Q 30 15, 40 25 L 50 15 Q 70 20, 80 30 L 90 20 Q 120 25, 140 30 L 150 22 Q 170 25, 190 28"
            fill="none"
            className="text-accent"
            stroke="currentColor"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
          {/* Review points */}
          {[50, 90, 150].map((x, i) => (
            <motion.circle
              key={x}
              cx={x}
              cy={i === 0 ? 15 : i === 1 ? 20 : 22}
              r="4"
              className="text-accent"
              fill="currentColor"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 + i * 0.3 }}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute right-2 bottom-2 flex gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="bg-destructive h-0.5 w-3" style={{ borderStyle: "dashed" }} />
          <span className="text-muted-foreground">No review</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-accent h-0.5 w-3" />
          <span className="text-muted-foreground">With review</span>
        </div>
      </div>
    </div>
  )
}

// Roadmap Visual
function RoadmapVisual() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const topics = ["Two Pointers", "Sliding Window", "Binary Search", "Review Day", "Hash Maps"]

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
        <Target className="text-accent-strong h-4 w-4" />
        <span>Google Interview - 14 days away</span>
      </div>
      <div className="space-y-2">
        {days.map((day, i) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="text-muted-foreground w-8 text-xs">{day}</span>
            <div
              className={`flex-1 rounded px-3 py-1.5 text-sm ${
                i === 3
                  ? "border-accent/40 bg-accent/10 text-accent-strong border"
                  : "bg-muted text-foreground"
              }`}
            >
              {topics[i]}
            </div>
            {i < 2 && (
              <div className="bg-neural/15 flex h-5 w-5 items-center justify-center rounded-full">
                <span className="text-neural text-xs">✓</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Interview Visual
function InterviewVisual() {
  const messages = [
    { role: "ai", text: "Let's solve Two Sum. Can you explain your approach?" },
    { role: "user", text: "I'll use a hash map to store complements..." },
    { role: "ai", text: "Good start! What's the time complexity?" },
  ]

  return (
    <div className="bg-muted/50 space-y-3 rounded-lg p-4">
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.4 }}
          className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
        >
          {msg.role === "ai" && (
            <div className="bg-accent/10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full">
              <MessageSquare className="text-accent-strong h-3 w-3" />
            </div>
          )}
          <div
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "ai" ? "bg-muted text-foreground" : "bg-accent/10 text-foreground"
            }`}
          >
            {msg.text}
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-muted-foreground flex items-center gap-2 text-xs"
      >
        <div className="bg-neural h-2 w-2 animate-pulse rounded-full" />
        Voice enabled - talk through your solution
      </motion.div>
    </div>
  )
}

// Review Visual
function ReviewVisual() {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="text-accent-strong h-4 w-4" />
        <span className="text-foreground text-sm">Upcoming Reviews</span>
      </div>
      <div className="space-y-2">
        {[
          { topic: "Two Pointers", time: "Today", retention: 85 },
          { topic: "Sliding Window", time: "Tomorrow", retention: 70 },
          { topic: "Binary Search", time: "In 3 days", retention: 55 },
        ].map((item, i) => (
          <motion.div
            key={item.topic}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-muted flex items-center justify-between rounded p-2"
          >
            <div>
              <div className="text-foreground text-sm">{item.topic}</div>
              <div className="text-muted-foreground text-xs">{item.time}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-border h-1.5 w-16 overflow-hidden rounded-full">
                <motion.div
                  className={`h-full rounded-full ${
                    item.retention > 80
                      ? "bg-neural"
                      : item.retention > 60
                        ? "bg-amber-500"
                        : "bg-destructive"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.retention}%` }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                />
              </div>
              <span className="text-muted-foreground w-8 text-xs">{item.retention}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function InteractiveTour({
  isOpen,
  userId,
  userName,
  onComplete,
  onSkip,
}: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const { containerRef, handleKeyDown: handleFocusTrapKeyDown } = useFocusTrap(isOpen)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0
  const Icon = step.icon

  const handleComplete = useCallback(async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(
        profileRef,
        {
          tour_completed: true,
          tour_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (error) {
      console.error("Failed to save tour completion:", error)
    }
    onComplete()
  }, [onComplete, userId])

  const handleSkip = useCallback(async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(
        profileRef,
        {
          tour_completed: true,
          tour_skipped: true,
          tour_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (error) {
      console.error("Failed to save tour skip:", error)
    }
    onSkip()
  }, [onSkip, userId])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      void handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }, [handleComplete, isLastStep])

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [isFirstStep])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "Escape") handleSkip()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleNext, handlePrev, handleSkip, isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-background/90 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md"
        ref={containerRef}
        onKeyDown={handleFocusTrapKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interactive-tour-title"
        aria-describedby="interactive-tour-description"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          aria-label="Skip interactive tour"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-accent/50 absolute top-6 right-6 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Skip tour
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mx-4 w-full max-w-xl">
          {/* Progress bar */}
          <div className="mb-6 flex justify-center gap-1.5">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to tour step ${idx + 1}`}
                aria-current={idx === currentStep ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "bg-accent w-8"
                    : idx < currentStep
                      ? "bg-accent/50 hover:bg-accent/70 w-3"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-3"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border-border bg-card overflow-hidden rounded-2xl border shadow-2xl"
          >
            {/* Icon header */}
            <div className="border-border bg-accent/10 border-b p-6">
              <div className="relative flex flex-col items-center text-center">
                <div className="border-accent/25 bg-accent/10 mb-3 rounded-xl border p-3">
                  <Icon className="text-accent-strong h-8 w-8" aria-hidden="true" />
                </div>
                <h2
                  id="interactive-tour-title"
                  className="font-heading text-foreground mb-1 text-xl font-bold"
                >
                  {step.id === "welcome" && userName
                    ? `Hey ${userName}, welcome to CodeSparring!`
                    : step.title}
                </h2>
                <p
                  id="interactive-tour-description"
                  className="text-muted-foreground max-w-md text-sm"
                >
                  {step.description}
                </p>
              </div>
            </div>

            {/* Visual or details */}
            <div className="p-5">
              {/* Visualization based on step */}
              {step.visual === "forgetting-curve" && <ForgettingCurveVisual />}
              {step.visual === "roadmap" && <RoadmapVisual />}
              {step.visual === "interview" && <InterviewVisual />}
              {step.visual === "review" && <ReviewVisual />}

              {/* Details list */}
              {step.details && !step.visual && (
                <div className="space-y-2">
                  {step.details.map((detail, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-muted/50 flex items-start gap-3 rounded-lg p-3"
                    >
                      <div className="bg-accent/10 mt-0.5 rounded-full p-1">
                        <Zap className="text-accent-strong h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground text-sm">{detail}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Details under visual */}
              {step.details && step.visual && (
                <div className="mt-4 space-y-2">
                  {step.details.map((detail, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="text-muted-foreground flex items-center gap-2 text-sm"
                    >
                      <div className="bg-accent h-1 w-1 rounded-full" />
                      {detail}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="border-border grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t px-5 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`text-muted-foreground justify-self-start ${isFirstStep ? "invisible" : ""}`}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <span className="text-muted-foreground text-xs">
                {currentStep + 1} / {tourSteps.length}
              </span>

              <Button
                size="sm"
                onClick={handleNext}
                className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 justify-self-end font-medium"
              >
                {isLastStep ? "Start Practicing" : "Next"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Press{" "}
            <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5">
              →
            </kbd>{" "}
            or{" "}
            <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5">
              Enter
            </kbd>{" "}
            to continue
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
