"use client"

import { useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useFocusTrap } from "@/lib/hooks"
import {
  ArrowRight,
  ArrowLeft,
  Terminal,
  GitBranch,
  Target,
  MessageSquare,
  Trophy,
  Bug,
  FileSearch,
  FlaskConical,
  X,
  Gauge,
} from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ProductTourProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: () => void
  onSkip: () => void
}

const tourSteps = [
  {
    id: "welcome",
    title: "Your interview practice room",
    description:
      "CodeSparring is built around the work interviewers actually grade: reasoning, code, evidence, and follow-up explanations.",
    icon: Terminal,
    surface: "border-cyan-400/20 bg-cyan-950/45",
    signal: "Practice loop: brief -> solve -> explain -> review",
    features: [
      "Timed sessions with interviewer-style follow-ups",
      "Runnable tests instead of passive problem reading",
      "Feedback tied to communication and code quality",
    ],
  },
  {
    id: "skill-tree",
    title: "A roadmap that behaves like prep",
    description:
      "The roadmap is not a generic course list. It keeps prerequisites, weak patterns, and review timing visible.",
    icon: GitBranch,
    surface: "border-emerald-400/20 bg-emerald-950/35",
    signal: "Pattern readiness, not content browsing",
    features: [
      "Patterns unlock in a sensible order",
      "Weak areas come back through spaced review",
      "Readiness is based on recent performance",
    ],
  },
  {
    id: "practice",
    title: "Practice beyond algorithm drills",
    description:
      "You can train DSA, bug-fix, and feature implementation rounds without leaving the same interview workspace.",
    icon: Bug,
    surface: "border-blue-400/20 bg-blue-950/35",
    signal: "DSA, bugfix, and feature rounds in one workspace",
    features: [
      "Debug incidents from prepared codebases",
      "Add functionality with existing files and tests",
      "Practice the formats companies increasingly use",
    ],
  },
  {
    id: "interview",
    title: "An interviewer, not a chatbot",
    description:
      "The assistant is there to probe your thinking, ask for tradeoffs, and nudge you when you are stuck.",
    icon: MessageSquare,
    surface: "border-amber-400/20 bg-amber-950/35",
    signal: "Hints are earned through the session context",
    features: [
      "Follow-up questions after meaningful progress",
      "Hints that preserve the interview signal",
      "Complexity and explanation checks before submit",
    ],
  },
  {
    id: "coding",
    title: "Evidence-first coding",
    description:
      "The editor, files, console, and tests make the session feel closer to a real engineering round.",
    icon: FlaskConical,
    surface: "border-cyan-400/20 bg-cyan-950/35",
    signal: "Run tests, inspect failures, defend the fix",
    features: [
      "Workspace files for bugfix and feature rounds",
      "Visible console output and test summaries",
      "Reset controls when you want a clean pass",
    ],
  },
  {
    id: "progress",
    title: "Progress that points to the next rep",
    description:
      "Scores are most useful when they tell you what to do next, so CodeSparring turns sessions into review cues.",
    icon: Gauge,
    surface: "border-amber-400/20 bg-amber-950/30",
    signal: "Scores become recommendations",
    features: [
      "Pattern-level strengths and gaps",
      "Bugfix evidence and explanation signals",
      "Readiness trends across completed sessions",
    ],
  },
  {
    id: "ready",
    title: "Start with a real round",
    description:
      "Pick a session, speak your reasoning, run the tests, and let the feedback loop do its job.",
    icon: FileSearch,
    surface: "border-cyan-400/20 bg-cyan-950/45",
    signal: "The first useful rep beats another checklist",
    features: null,
  },
]

export function ProductTour({ isOpen, userId, userName, onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const { containerRef, handleKeyDown: handleFocusTrapKeyDown } = useFocusTrap(isOpen)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0

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
    } catch {
      // Non-blocking - tour completion tracking is not critical
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
    } catch {
      // Non-blocking - tour skip tracking is not critical
    }
    onSkip()
  }, [onSkip, userId])

  const handleNext = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)

    if (isLastStep) {
      void handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }

    setTimeout(() => setIsAnimating(false), 300)
  }, [handleComplete, isAnimating, isLastStep])

  const handlePrev = useCallback(() => {
    if (isAnimating || isFirstStep) return
    setIsAnimating(true)
    setCurrentStep((prev) => prev - 1)
    setTimeout(() => setIsAnimating(false), 300)
  }, [isAnimating, isFirstStep])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "Enter") handleNext()
      if (event.key === "ArrowLeft") handlePrev()
      if (event.key === "Escape") void handleSkip()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleNext, handlePrev, handleSkip, isOpen])

  if (!isOpen) return null

  const Icon = step.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        ref={containerRef}
        onKeyDown={handleFocusTrapKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-description"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          aria-label="Skip product tour"
          className="absolute top-6 right-6 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
        >
          Skip tour
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mx-4 w-full max-w-2xl">
          {/* Progress bar */}
          <div className="mb-8 flex justify-center gap-2">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to product tour step ${idx + 1}`}
                aria-current={idx === currentStep ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-8 bg-cyan-300"
                    : idx < currentStep
                      ? "w-4 bg-cyan-300/50 hover:bg-cyan-300/70"
                      : "w-4 bg-gray-700"
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
            className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/90"
          >
            {/* Product-specific header */}
            <div className={`border-b p-8 ${step.surface}`}>
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-4">
                  <Icon className="h-12 w-12 text-cyan-100" aria-hidden="true" />
                </div>
                <p className="mb-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                  {step.signal}
                </p>
                <h2
                  id="product-tour-title"
                  className="font-heading mb-2 text-2xl font-bold text-white"
                >
                  {step.id === "welcome" && userName
                    ? `Welcome to CodeSparring, ${userName}!`
                    : step.title}
                </h2>
                <p id="product-tour-description" className="max-w-md text-white/85">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Features list */}
            {step.features && (
              <div className="space-y-3 p-6">
                {step.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-3"
                  >
                    <div className="rounded-md bg-cyan-300/10 p-1.5 text-cyan-200">
                      <Target className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="text-gray-200">{feature}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Ready state */}
            {step.id === "ready" && (
              <div className="p-8 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2">
                  <Trophy className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  <span className="text-sm font-medium text-cyan-100">Ready for the first rep</span>
                </div>
                <p className="mb-2 text-gray-300">
                  You're ready to start practicing! Click below to begin your first session.
                </p>
                <p className="text-sm text-gray-500">
                  Start with a format you actually expect to see in interviews.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-gray-800 p-6">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`justify-self-start text-gray-400 hover:text-white ${isFirstStep ? "invisible" : ""}`}
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Button>

              <span className="text-sm text-gray-500">
                {currentStep + 1} of {tourSteps.length}
              </span>

              <Button
                onClick={handleNext}
                className="justify-self-end bg-cyan-300 font-medium text-gray-950 hover:bg-cyan-200"
              >
                {isLastStep ? "Start Practicing" : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <p className="mt-4 text-center text-xs text-gray-600">
            Press <kbd className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-400">→</kbd> for next,{" "}
            <kbd className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-400">←</kbd> for back
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
