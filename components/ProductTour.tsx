"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  Terminal,
  GitBranch,
  Target,
  MessageSquare,
  Trophy,
  Zap,
  X,
  Sparkles
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
    title: "Welcome to Skillon!",
    description: "Let's take a quick tour of how to master coding interviews with AI-powered practice.",
    icon: Sparkles,
    color: "from-[#00d9ff] to-[#00ff88]",
    features: [
      "AI-powered mock interviews",
      "Real-time feedback on your code",
      "Pattern-based learning path"
    ]
  },
  {
    id: "skill-tree",
    title: "DSA Skill Tree",
    description: "Your learning path is visualized as a skill tree. Master foundational patterns before advancing to complex ones.",
    icon: GitBranch,
    color: "from-emerald-500 to-blue-500",
    features: [
      "Start with Arrays & Hashing",
      "Unlock new patterns as you progress",
      "See prerequisites for each topic"
    ]
  },
  {
    id: "practice",
    title: "Practice Problems",
    description: "Choose from 100+ curated problems across DSA, bug fixing, and feature implementation.",
    icon: Target,
    color: "from-purple-500 to-pink-500",
    features: [
      "Filter by type: DSA, Bug Fix, Add Feature",
      "Sort by difficulty and company",
      "Track your completion progress"
    ]
  },
  {
    id: "interview",
    title: "AI Interviewer",
    description: "Practice with an AI interviewer that asks follow-up questions and provides hints just like a real interview.",
    icon: MessageSquare,
    color: "from-orange-500 to-red-500",
    features: [
      "Get hints when you're stuck",
      "Receive complexity analysis",
      "Practice explaining your approach"
    ]
  },
  {
    id: "coding",
    title: "Interactive Code Editor",
    description: "Write and test your code in a full-featured editor with syntax highlighting and test case validation.",
    icon: Terminal,
    color: "from-cyan-500 to-blue-500",
    features: [
      "Multiple language support",
      "Run tests to validate your solution",
      "See time & space complexity"
    ]
  },
  {
    id: "progress",
    title: "Track Your Progress",
    description: "Watch your skills grow as you complete problems and unlock new patterns.",
    icon: Trophy,
    color: "from-yellow-500 to-orange-500",
    features: [
      "Completion tracking per pattern",
      "Difficulty breakdown stats",
      "Interview readiness score"
    ]
  },
  {
    id: "ready",
    title: "You're All Set!",
    description: "Start your first practice session and begin mastering coding interviews.",
    icon: Zap,
    color: "from-[#00d9ff] to-[#00ff88]",
    features: null
  }
]

export function ProductTour({ isOpen, userId, userName, onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)

    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }

    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePrev = () => {
    if (isAnimating || isFirstStep) return
    setIsAnimating(true)
    setCurrentStep(prev => prev - 1)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleComplete = async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        tour_completed: true,
        tour_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })
      console.log("Tour completion saved")
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

  const Icon = step.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
        >
          Skip tour
          <X className="h-4 w-4" />
        </button>

        <div className="w-full max-w-2xl mx-4">
          {/* Progress bar */}
          <div className="flex gap-2 mb-8 justify-center">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-8 bg-[#00d9ff]"
                    : idx < currentStep
                    ? "w-4 bg-[#00d9ff]/50"
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
            className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden"
          >
            {/* Icon header */}
            <div className={`p-8 bg-gradient-to-br ${step.color} relative overflow-hidden`}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-4 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-black/20 blur-2xl" />
              </div>

              <div className="relative flex flex-col items-center text-center">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
                  <Icon className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-white mb-2">
                  {step.id === "welcome" && userName
                    ? `Welcome to Skillon, ${userName}!`
                    : step.title}
                </h2>
                <p className="text-white/90 max-w-md">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Features list */}
            {step.features && (
              <div className="p-6 space-y-3">
                {step.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="p-1.5 rounded-full bg-[#00d9ff]/20">
                      <Zap className="h-4 w-4 text-[#00d9ff]" />
                    </div>
                    <span className="text-gray-200">{feature}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Ready state */}
            {step.id === "ready" && (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-full mb-4">
                  <Sparkles className="h-4 w-4 text-[#00d9ff]" />
                  <span className="text-[#00d9ff] text-sm font-medium">Tour Complete</span>
                </div>
                <p className="text-gray-300 mb-2">
                  You're ready to start practicing! Click below to begin your first session.
                </p>
                <p className="text-gray-500 text-sm">
                  Pro tip: Start with the Arrays & Hashing pattern to build a strong foundation.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="p-6 border-t border-gray-800 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`text-gray-400 hover:text-white ${isFirstStep ? "invisible" : ""}`}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <span className="text-sm text-gray-500">
                {currentStep + 1} of {tourSteps.length}
              </span>

              <Button
                onClick={handleNext}
                className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black font-medium"
              >
                {isLastStep ? "Start Practicing" : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <p className="text-center text-gray-600 text-xs mt-4">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">→</kbd> for next,{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">←</kbd> for back
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
