"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useFocusTrap } from "@/lib/hooks"
import { completeOnboarding } from "@/lib/onboarding/onboarding-service"
import {
  WelcomeStep,
  DailyGoalStep,
  SystemOverviewStep,
  RoleSelector,
  InterviewDateSelector,
} from "@/components/onboarding"

interface OnboardingModalProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: (showTour: boolean) => void
}

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
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Step titles for ARIA labels
  const stepTitles = [
    "Welcome to CodeSparring",
    "Select your experience level",
    "Choose your goal",
    "Set your daily practice goal",
    "How CodeSparring works for you",
  ]

  const handleComplete = async (takeTour: boolean) => {
    if (!selectedRole) return

    setIsSubmitting(true)
    try {
      await completeOnboarding(userId, {
        role: selectedRole,
        goal: selectedGoal || "general",
        targetCompany,
        dailyGoal,
      })

      onComplete(takeTour)
    } catch (error: unknown) {
      console.error("Failed to save onboarding data:", error)
      onComplete(takeTour)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return true // Welcome
      case 1:
        return selectedRole !== null
      case 2:
        return selectedGoal !== null
      case 3:
        return true // Daily goal has default
      case 4:
        return true // System overview
      default:
        return true
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
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-sm"
        role="presentation"
      >
        <motion.div
          ref={containerRef}
          onKeyDown={handleKeyDown}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          aria-describedby="onboarding-description"
        >
          {/* Progress bar - Accessibility: aria-valuenow for screen readers */}
          <div
            className="h-1 bg-muted"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Step ${step + 1} of ${totalSteps}: ${stepTitles[step]}`}
          >
            <motion.div
              className="h-full bg-cyan-300"
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
            {step === 0 && <WelcomeStep userName={userName} onNext={nextStep} />}

            {/* Step 1: Role */}
            {step === 1 && (
              <RoleSelector
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
                onBack={prevStep}
                onNext={nextStep}
                canProceed={canProceed()}
              />
            )}

            {/* Step 2: Goal */}
            {step === 2 && (
              <InterviewDateSelector
                selectedGoal={selectedGoal}
                targetCompany={targetCompany}
                onGoalChange={setSelectedGoal}
                onTargetCompanyChange={setTargetCompany}
                onBack={prevStep}
                onNext={nextStep}
                canProceed={canProceed()}
              />
            )}

            {/* Step 3: Daily Goal */}
            {step === 3 && (
              <DailyGoalStep
                dailyGoal={dailyGoal}
                onDailyGoalChange={setDailyGoal}
                onBack={prevStep}
                onNext={nextStep}
              />
            )}

            {/* Step 4: System Overview */}
            {step === 4 && (
              <SystemOverviewStep
                isSubmitting={isSubmitting}
                onBack={prevStep}
                onComplete={handleComplete}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
