"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Code2,
  Rocket,
  Sparkles,
  Building2,
  Target,
  Clock,
  Zap,
  Brain,
  TrendingUp,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// =============================================================================
// ACCESSIBILITY: Focus Trap Hook
// =============================================================================
/**
 * Custom hook to trap focus within a modal for accessibility
 * Ensures keyboard users can't tab outside the modal
 */
function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus the first focusable element in the modal
    const container = containerRef.current
    if (container) {
      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }

    // Cleanup: restore focus when modal closes
    return () => {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Shift+Tab on first element -> go to last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
    // Tab on last element -> go to first
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }, [])

  return { containerRef, handleKeyDown }
}

interface OnboardingModalProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: (showTour: boolean) => void
}

const roles = [
  { id: "student", label: "Student", icon: GraduationCap, description: "Learning fundamentals" },
  { id: "junior", label: "Junior", icon: Code2, description: "0-2 years experience" },
  { id: "mid", label: "Mid-level", icon: Briefcase, description: "2-5 years experience" },
  { id: "senior", label: "Senior+", icon: Rocket, description: "5+ years experience" },
]

const goals = [
  { id: "faang", label: "Big Tech", icon: Building2, description: "FAANG/MAANG companies" },
  { id: "startup", label: "Startup", icon: Zap, description: "Fast-paced startups" },
  { id: "general", label: "General Prep", icon: Target, description: "Overall improvement" },
  { id: "promotion", label: "Level Up", icon: Rocket, description: "Internal promotion" },
]

const targetCompanies = [
  "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix",
  "Stripe", "Airbnb", "Uber", "Other"
]

const dailyGoals = [
  { value: 1, label: "1 problem/day", desc: "Light practice", time: "~20 min" },
  { value: 3, label: "3 problems/day", desc: "Steady progress", time: "~1 hour" },
  { value: 5, label: "5 problems/day", desc: "Intensive prep", time: "~2 hours" },
]

const systemFeatures = [
  {
    icon: Brain,
    title: "Smart Recommendations",
    description: "We analyze your performance and suggest problems targeting your weak areas."
  },
  {
    icon: Calendar,
    title: "Spaced Repetition",
    description: "Problems you've solved are scheduled for review at optimal intervals to build long-term retention."
  },
  {
    icon: TrendingUp,
    title: "Pattern Mastery",
    description: "Track your progress across 15 DSA patterns and see which ones need more attention."
  },
]

export function OnboardingModal({ isOpen, userId, userName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [targetCompany, setTargetCompany] = useState<string | null>(null)
  const [dailyGoal, setDailyGoal] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSteps = 5 // Welcome, Role, Goal, Daily Goal, System Overview

  // Accessibility: Focus trap for modal
  const { containerRef, handleKeyDown } = useFocusTrap(isOpen)

  // Accessibility: Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Step titles for ARIA labels
  const stepTitles = [
    "Welcome to CodeSparring",
    "Select your experience level",
    "Choose your goal",
    "Set your daily practice goal",
    "How CodeSparring works for you"
  ]

  const handleComplete = async (takeTour: boolean) => {
    if (!selectedRole) return

    setIsSubmitting(true)
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        role: selectedRole,
        goal: selectedGoal || "general",
        target_company: targetCompany,
        daily_goal: dailyGoal,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })

      // Store onboarding data for RAG (non-blocking)
      fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store-onboarding",
          userId,
          role: selectedRole,
          goal: selectedGoal || "general",
          targetCompany,
          dailyGoal,
        }),
      }).catch((err) => {
        console.error("Failed to store onboarding embedding (non-blocking):", err)
      })

      // Update spaced repetition daily goal
      fetch("/api/spaced-repetition/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          daily_goal: dailyGoal,
        }),
      }).catch((err) => {
        console.error("Failed to update daily goal (non-blocking):", err)
      })

      onComplete(takeTour)
    } catch (error: any) {
      console.error("Failed to save onboarding data:", error)
      onComplete(takeTour)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0: return true // Welcome
      case 1: return selectedRole !== null
      case 2: return selectedGoal !== null
      case 3: return true // Daily goal has default
      case 4: return true // System overview
      default: return true
    }
  }

  const nextStep = () => {
    if (step < totalSteps - 1) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 0) setStep(step - 1)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto"
        role="presentation"
        aria-hidden="true"
      >
        <motion.div
          ref={containerRef}
          onKeyDown={handleKeyDown}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden my-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          aria-describedby="onboarding-description"
        >
          {/* Progress bar - Accessibility: aria-valuenow for screen readers */}
          <div
            className="h-1 bg-gray-800"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Step ${step + 1} of ${totalSteps}: ${stepTitles[step]}`}
          >
            <motion.div
              className="h-full bg-[#00d9ff]"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Hidden live region for step announcements */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Step {step + 1} of {totalSteps}: {stepTitles[step]}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#00d9ff] to-[#00ff88] rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                    <Sparkles className="h-8 w-8 text-black" />
                  </div>
                  <h2 id="onboarding-title" className="text-2xl font-bold text-white mb-2">
                    {userName ? `Welcome, ${userName}!` : "Welcome to CodeSparring!"}
                  </h2>
                  <p id="onboarding-description" className="text-gray-400">
                    Let's set up your personalized practice experience in 4 quick steps.
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  {[
                    "Personalized problem recommendations",
                    "Spaced repetition for long-term retention",
                    "Progress tracking across patterns",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-[#00d9ff]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={nextStep}
                  className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black py-6"
                >
                  Let's Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* Step 1: Role */}
            {step === 1 && (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 1 of 4</p>
                  <h2 className="text-xl font-bold text-white">What's your experience level?</h2>
                  <p className="text-sm text-gray-400 mt-1">This helps us calibrate problem difficulty.</p>
                </div>

                <div
                  className="grid grid-cols-2 gap-3 mb-6"
                  role="radiogroup"
                  aria-label="Experience level selection"
                >
                  {roles.map((role) => {
                    const Icon = role.icon
                    const isSelected = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${role.label}: ${role.description}`}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-[#00d9ff] bg-[#00d9ff]/10"
                            : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${isSelected ? "text-[#00d9ff]" : "text-gray-400"}`} aria-hidden="true" />
                        <div className={`font-medium ${isSelected ? "text-white" : "text-gray-200"}`}>
                          {role.label}
                        </div>
                        <div className="text-xs text-gray-500">{role.description}</div>
                      </button>
                    )
                  })}
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-400">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black disabled:opacity-50"
                  >
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Goal */}
            {step === 2 && (
              <motion.div
                key="goal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 2 of 4</p>
                  <h2 className="text-xl font-bold text-white">What's your goal?</h2>
                  <p className="text-sm text-gray-400 mt-1">We'll tailor recommendations based on your target.</p>
                </div>

                <div
                  className="grid grid-cols-2 gap-3 mb-4"
                  role="radiogroup"
                  aria-label="Goal selection"
                >
                  {goals.map((goal) => {
                    const Icon = goal.icon
                    const isSelected = selectedGoal === goal.id
                    return (
                      <button
                        key={goal.id}
                        onClick={() => {
                          setSelectedGoal(goal.id)
                          if (goal.id !== "faang") setTargetCompany(null)
                        }}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${goal.label}: ${goal.description}`}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-[#00d9ff] bg-[#00d9ff]/10"
                            : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${isSelected ? "text-[#00d9ff]" : "text-gray-400"}`} aria-hidden="true" />
                        <div className={`font-medium ${isSelected ? "text-white" : "text-gray-200"}`}>
                          {goal.label}
                        </div>
                        <div className="text-xs text-gray-500">{goal.description}</div>
                      </button>
                    )
                  })}
                </div>

                {selectedGoal === "faang" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4"
                  >
                    <p className="text-sm text-gray-400 mb-2">Target company (optional)</p>
                    <div className="flex flex-wrap gap-2">
                      {targetCompanies.map((company) => (
                        <button
                          key={company}
                          onClick={() => setTargetCompany(targetCompany === company ? null : company)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            targetCompany === company
                              ? "bg-[#00d9ff] text-black"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {company}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-between mt-6">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-400">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black disabled:opacity-50"
                  >
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Daily Goal */}
            {step === 3 && (
              <motion.div
                key="daily"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 3 of 4</p>
                  <h2 className="text-xl font-bold text-white">How much do you want to practice?</h2>
                  <p className="text-sm text-gray-400 mt-1">Set a daily goal. You can adjust this anytime.</p>
                </div>

                <div
                  className="space-y-3 mb-6"
                  role="radiogroup"
                  aria-label="Daily practice goal selection"
                >
                  {dailyGoals.map((goal) => {
                    const isSelected = dailyGoal === goal.value
                    return (
                      <button
                        key={goal.value}
                        onClick={() => setDailyGoal(goal.value)}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${goal.label}, ${goal.desc}, approximately ${goal.time}`}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-[#00d9ff] bg-[#00d9ff]/10"
                            : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className={`h-5 w-5 ${isSelected ? "text-[#00d9ff]" : "text-gray-400"}`} aria-hidden="true" />
                          <div>
                            <div className={`font-medium ${isSelected ? "text-white" : "text-gray-200"}`}>
                              {goal.label}
                            </div>
                            <div className="text-xs text-gray-500">{goal.desc}</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400" aria-hidden="true">{goal.time}</div>
                      </button>
                    )
                  })}
                </div>

                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 mb-6">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-[#00d9ff] mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-300">
                        Consistency beats intensity. Even 1 problem a day compounds over time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-400">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black"
                  >
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: System Overview */}
            {step === 4 && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 4 of 4</p>
                  <h2 className="text-xl font-bold text-white">How CodeSparring works for you</h2>
                  <p className="text-sm text-gray-400 mt-1">Here's what to expect from your practice.</p>
                </div>

                <div className="space-y-4 mb-6">
                  {systemFeatures.map((feature, i) => {
                    const Icon = feature.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                      >
                        <div className="p-2 bg-[#00d9ff]/10 rounded-lg">
                          <Icon className="h-5 w-5 text-[#00d9ff]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{feature.title}</h4>
                          <p className="text-sm text-gray-400 mt-0.5">{feature.description}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="p-4 bg-gradient-to-r from-[#00d9ff]/10 to-[#00ff88]/10 rounded-xl border border-[#00d9ff]/20 mb-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-[#00d9ff]" />
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className="text-white font-medium">Pro tip:</span> Check the Practice page for your personalized review schedule.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={prevStep} className="text-gray-400">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleComplete(false)}
                      disabled={isSubmitting}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      {isSubmitting ? "Saving..." : "Start Practicing"}
                    </Button>
                    <Button
                      onClick={() => handleComplete(true)}
                      disabled={isSubmitting}
                      className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Saving..." : "Quick Tour First"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
