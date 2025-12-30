"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Brain,
  Route,
  MessageSquare,
  RotateCcw,
  Zap,
  Target,
  Clock,
  TrendingUp
} from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface InteractiveTourProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: () => void
  onSkip: () => void
}

interface TourStep {
  id: string
  icon: React.ElementType
  title: string
  description: string
  details?: string[]
  color: string
  visual?: "forgetting-curve" | "roadmap" | "interview" | "review"
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome to CodeSparring!",
    description: "You're about to learn a smarter way to prepare for coding interviews. Let me show you what makes this different.",
    color: "from-[#00d9ff] to-[#00ff88]"
  },
  {
    id: "problem",
    icon: Brain,
    title: "The Problem with Cramming",
    description: "Most people grind LeetCode for hours, then forget 70% within a week. Sound familiar?",
    details: [
      "You solve a problem perfectly today",
      "A week later, you can't remember the approach",
      "You waste time re-learning the same patterns"
    ],
    color: "from-red-500 to-orange-500",
    visual: "forgetting-curve"
  },
  {
    id: "solution",
    icon: TrendingUp,
    title: "The Science of Retention",
    description: "Spaced repetition is proven to boost long-term memory by 200%+. We'll remind you to review at the optimal time.",
    details: [
      "Review right before you forget",
      "Each review doubles retention time",
      "15 min/day beats 2-hour cram sessions"
    ],
    color: "from-emerald-500 to-teal-500"
  },
  {
    id: "roadmap",
    icon: Route,
    title: "Personalized Roadmaps",
    description: "Tell us your interview date and target company. We'll create a day-by-day study plan that ensures you're ready.",
    details: [
      "Enter your interview date",
      "Get daily problem assignments",
      "Track progress and stay on schedule"
    ],
    color: "from-purple-500 to-pink-500",
    visual: "roadmap"
  },
  {
    id: "interview",
    icon: MessageSquare,
    title: "AI Mock Interviewer",
    description: "Practice like it's the real thing. Talk through your approach out loud, ask for hints, and get instant feedback.",
    details: [
      "Voice-enabled practice (talk, don't just type)",
      "AI asks follow-up questions like a real interviewer",
      "Get hints when stuck, without giving up"
    ],
    color: "from-blue-500 to-cyan-500",
    visual: "interview"
  },
  {
    id: "review",
    icon: RotateCcw,
    title: "Smart Review Reminders",
    description: "We track what you've practiced and email you when it's time to review. No more forgotten patterns.",
    details: [
      "Automatic review scheduling based on your performance",
      "Email reminders at optimal review times",
      "Watch your retention climb over time"
    ],
    color: "from-amber-500 to-orange-500",
    visual: "review"
  },
  {
    id: "start",
    icon: Zap,
    title: "Ready to Begin?",
    description: "Start with any topic that interests you. The AI will guide you through the problem and give you feedback.",
    details: [
      "Pro tip: Start with Arrays & Hashing",
      "15 minutes of focused practice is enough",
      "Consistency beats intensity"
    ],
    color: "from-[#00d9ff] to-[#00ff88]"
  }
]

// Forgetting Curve Visualization
function ForgettingCurveVisual() {
  return (
    <div className="relative h-40 w-full bg-gray-800/50 rounded-lg p-4 overflow-hidden">
      <div className="absolute inset-0 p-4">
        {/* Y-axis label */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500">
          Memory
        </div>
        {/* X-axis label */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          Time (days)
        </div>

        {/* The forgetting curve */}
        <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          {/* Without review - steep decline */}
          <motion.path
            d="M 10 10 Q 50 20, 80 60 T 190 90"
            fill="none"
            stroke="#ef4444"
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
            stroke="#00d9ff"
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
              fill="#00d9ff"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 + i * 0.3 }}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-gray-400">No review</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[#00d9ff]" />
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
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
        <Target className="h-4 w-4 text-[#00d9ff]" />
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
            <span className="text-xs text-gray-500 w-8">{day}</span>
            <div className={`flex-1 px-3 py-1.5 rounded text-sm ${
              i === 3
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-gray-700/50 text-gray-300"
            }`}>
              {topics[i]}
            </div>
            {i < 2 && (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-xs">✓</span>
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
    { role: "ai", text: "Good start! What's the time complexity?" }
  ]

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.4 }}
          className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
        >
          {msg.role === "ai" && (
            <div className="w-6 h-6 rounded-full bg-[#00d9ff]/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-3 w-3 text-[#00d9ff]" />
            </div>
          )}
          <div className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${
            msg.role === "ai"
              ? "bg-gray-700 text-gray-200"
              : "bg-[#00d9ff]/20 text-[#00d9ff]"
          }`}>
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
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Voice enabled - talk through your solution
      </motion.div>
    </div>
  )
}

// Review Visual
function ReviewVisual() {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-amber-500" />
        <span className="text-sm text-gray-300">Upcoming Reviews</span>
      </div>
      <div className="space-y-2">
        {[
          { topic: "Two Pointers", time: "Today", retention: 85 },
          { topic: "Sliding Window", time: "Tomorrow", retention: 70 },
          { topic: "Binary Search", time: "In 3 days", retention: 55 }
        ].map((item, i) => (
          <motion.div
            key={item.topic}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
          >
            <div>
              <div className="text-sm text-gray-200">{item.topic}</div>
              <div className="text-xs text-gray-500">{item.time}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    item.retention > 80 ? "bg-emerald-500" :
                    item.retention > 60 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.retention}%` }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8">{item.retention}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function InteractiveTour({ isOpen, userId, userName, onComplete, onSkip }: InteractiveTourProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0
  const Icon = step.icon

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
  }, [isOpen, currentStep])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        tour_completed: true,
        tour_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })
    } catch (error) {
      console.error("Failed to save tour completion:", error)
    }
    onComplete()
  }

  const handleSkip = async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        tour_completed: true,
        tour_skipped: true,
        tour_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })
    } catch (error) {
      console.error("Failed to save tour skip:", error)
    }
    onSkip()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
        >
          Skip tour
          <X className="h-4 w-4" />
        </button>

        <div className="w-full max-w-xl mx-4">
          {/* Progress bar */}
          <div className="flex gap-1.5 mb-6 justify-center">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-8 bg-[#00d9ff]"
                    : idx < currentStep
                    ? "w-3 bg-[#00d9ff]/50 hover:bg-[#00d9ff]/70"
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
            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Icon header */}
            <div className={`p-6 bg-gradient-to-br ${step.color} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-2 left-2 w-24 h-24 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-2 right-2 w-20 h-20 rounded-full bg-black/20 blur-2xl" />
              </div>

              <div className="relative flex flex-col items-center text-center">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm mb-3">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-heading font-bold text-white mb-1">
                  {step.id === "welcome" && userName
                    ? `Hey ${userName}, welcome to CodeSparring!`
                    : step.title}
                </h2>
                <p className="text-white/90 text-sm max-w-md">
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
                      className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="p-1 rounded-full bg-[#00d9ff]/20 mt-0.5">
                        <Zap className="h-3 w-3 text-[#00d9ff]" />
                      </div>
                      <span className="text-gray-300 text-sm">{detail}</span>
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
                      <div className="w-1 h-1 rounded-full bg-[#00d9ff]" />
                      {detail}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`text-gray-400 hover:text-white ${isFirstStep ? "invisible" : ""}`}
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
                className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black font-medium"
              >
                {isLastStep ? "Start Practicing" : "Next"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <p className="text-center text-gray-600 text-xs mt-4">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">→</kbd> or{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to continue
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
