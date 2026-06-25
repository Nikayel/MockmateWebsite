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
  surface: string
  visual?: "forgetting-curve" | "roadmap" | "interview" | "review"
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    icon: Terminal,
    title: "This is not another problem list",
    description:
      "CodeSparring is an interview practice loop: attempt, explain, test, get scored, then review before the skill decays.",
    surface: "bg-cyan-950/45",
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
    surface: "bg-amber-950/35",
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
    surface: "bg-emerald-950/35",
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
    surface: "bg-blue-950/35",
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
    surface: "bg-cyan-950/35",
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
    surface: "bg-amber-950/30",
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
    surface: "bg-cyan-950/45",
  },
]

// Forgetting Curve Visualization
function ForgettingCurveVisual() {
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-lg bg-gray-800/50 p-4">
      <div className="absolute inset-0 p-4">
        {/* Y-axis label */}
        <div className="absolute top-1/2 left-2 -translate-y-1/2 -rotate-90 text-xs text-gray-500">
          Memory
        </div>
        {/* X-axis label */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          Time (days)
        </div>

        {/* The forgetting curve */}
        <svg className="h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          {/* Without review - steep decline */}
          <motion.path
            d="M 10 10 Q 50 20, 80 60 T 190 90"
            fill="none"
            className="text-red-400"
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
            className="text-cyan-300"
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
              className="text-cyan-300"
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
          <div className="h-0.5 w-3 bg-red-500" style={{ borderStyle: "dashed" }} />
          <span className="text-gray-400">No review</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-3 bg-cyan-300" />
          <span className="text-gray-400">With review</span>
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
    <div className="rounded-lg bg-gray-800/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
        <Target className="h-4 w-4 text-cyan-300" />
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
            <span className="w-8 text-xs text-gray-500">{day}</span>
            <div
              className={`flex-1 rounded px-3 py-1.5 text-sm ${
                i === 3
                  ? "border border-amber-500/30 bg-amber-500/20 text-amber-400"
                  : "bg-gray-700/50 text-gray-300"
              }`}
            >
              {topics[i]}
            </div>
            {i < 2 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-xs text-emerald-400">✓</span>
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
    <div className="space-y-3 rounded-lg bg-gray-800/50 p-4">
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.4 }}
          className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
        >
          {msg.role === "ai" && (
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-300/15">
              <MessageSquare className="h-3 w-3 text-cyan-200" />
            </div>
          )}
          <div
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "ai" ? "bg-gray-700 text-gray-200" : "bg-cyan-300/15 text-cyan-100"
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
        className="flex items-center gap-2 text-xs text-gray-500"
      >
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Voice enabled - talk through your solution
      </motion.div>
    </div>
  )
}

// Review Visual
function ReviewVisual() {
  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-500" />
        <span className="text-sm text-gray-300">Upcoming Reviews</span>
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
            className="flex items-center justify-between rounded bg-gray-700/30 p-2"
          >
            <div>
              <div className="text-sm text-gray-200">{item.topic}</div>
              <div className="text-xs text-gray-500">{item.time}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                <motion.div
                  className={`h-full rounded-full ${
                    item.retention > 80
                      ? "bg-emerald-500"
                      : item.retention > 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.retention}%` }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                />
              </div>
              <span className="w-8 text-xs text-gray-400">{item.retention}%</span>
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
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
          className="absolute top-6 right-6 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
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
                    ? "w-8 bg-cyan-300"
                    : idx < currentStep
                      ? "w-3 bg-cyan-300/50 hover:bg-cyan-300/70"
                      : "w-3 bg-gray-700 hover:bg-gray-600"
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
            className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
          >
            {/* Icon header */}
            <div className={`border-b border-white/10 p-6 ${step.surface}`}>
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                  <Icon className="h-8 w-8 text-cyan-100" aria-hidden="true" />
                </div>
                <h2
                  id="interactive-tour-title"
                  className="font-heading mb-1 text-xl font-bold text-white"
                >
                  {step.id === "welcome" && userName
                    ? `Hey ${userName}, welcome to CodeSparring!`
                    : step.title}
                </h2>
                <p id="interactive-tour-description" className="max-w-md text-sm text-white/90">
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
                      className="flex items-start gap-3 rounded-lg bg-gray-800/50 p-3"
                    >
                      <div className="mt-0.5 rounded-full bg-cyan-300/15 p-1">
                        <Zap className="h-3 w-3 text-cyan-200" />
                      </div>
                      <span className="text-sm text-gray-300">{detail}</span>
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
                      className="flex items-center gap-2 text-sm text-gray-400"
                    >
                      <div className="h-1 w-1 rounded-full bg-cyan-300" />
                      {detail}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-gray-800 px-5 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`justify-self-start text-gray-400 hover:text-white ${isFirstStep ? "invisible" : ""}`}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <span className="text-xs text-gray-500">
                {currentStep + 1} / {tourSteps.length}
              </span>

              <Button
                size="sm"
                onClick={handleNext}
                className="justify-self-end bg-cyan-300 font-medium text-gray-950 hover:bg-cyan-200"
              >
                {isLastStep ? "Start Practicing" : "Next"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <p className="mt-4 text-center text-xs text-gray-600">
            Press <kbd className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-400">→</kbd> or{" "}
            <kbd className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-400">Enter</kbd> to continue
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
