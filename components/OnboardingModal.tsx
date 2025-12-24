"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Briefcase, GraduationCap, Code2, Rocket, Sparkles } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface OnboardingModalProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: (showTour: boolean) => void
}

const roles = [
  { id: "student", label: "Student", icon: GraduationCap, description: "Currently studying CS/Engineering" },
  { id: "junior", label: "Junior Engineer", icon: Code2, description: "0-2 years experience" },
  { id: "mid", label: "Mid-Level Engineer", icon: Briefcase, description: "2-5 years experience" },
  { id: "senior", label: "Senior+ Engineer", icon: Rocket, description: "5+ years experience" },
]

const goals = [
  { id: "faang", label: "FAANG/Big Tech" },
  { id: "startup", label: "Startups" },
  { id: "general", label: "General Practice" },
  { id: "promotion", label: "Internal Promotion" },
]

export function OnboardingModal({ isOpen, userId, userName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleComplete = async (takeTour: boolean) => {
    if (!selectedRole) return

    setIsSubmitting(true)
    try {
      // Save to profiles collection (not users) - use setDoc with merge to ensure it works
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        role: selectedRole,
        goal: selectedGoal || "general",
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })

      console.log("Onboarding data saved to profile:", { userId, role: selectedRole, goal: selectedGoal })
      
      // Store onboarding data for RAG (non-blocking)
      fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store-onboarding",
          userId,
          role: selectedRole,
          goal: selectedGoal || "general",
        }),
      }).catch((err) => {
        console.error("Failed to store onboarding embedding (non-blocking):", err)
      })
      
      onComplete(takeTour)
    } catch (error: any) {
      console.error("Failed to save onboarding data:", error)
      console.error("Error code:", error?.code)
      console.error("Error message:", error?.message)

      // Still proceed - don't block the user even if save fails
      // The profile might be created later and onboarding can be completed then
      onComplete(takeTour)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg mx-4 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-800">
            <h2 className="text-xl font-heading font-bold text-white">
              {step === 1 ? (userName ? `Welcome, ${userName}!` : "Welcome to Skillon!") : "One more thing..."}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {step === 1
                ? "Quick question to personalize your experience"
                : "What's your interview goal?"}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 1 ? (
              <>
                <p className="text-sm text-gray-300 mb-4">What's your current role?</p>
                <div className="grid grid-cols-1 gap-3">
                  {roles.map((role) => {
                    const Icon = role.icon
                    const isSelected = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${isSelected
                            ? "border-[#00d9ff] bg-[#00d9ff]/10"
                            : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? "bg-[#00d9ff]/20" : "bg-gray-800"}`}>
                          <Icon className={`h-5 w-5 ${isSelected ? "text-[#00d9ff]" : "text-gray-400"}`} />
                        </div>
                        <div>
                          <div className={`font-medium ${isSelected ? "text-white" : "text-gray-200"}`}>
                            {role.label}
                          </div>
                          <div className="text-xs text-gray-500">{role.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-300 mb-4">Where are you interviewing? (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  {goals.map((goal) => {
                    const isSelected = selectedGoal === goal.id
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
                        className={`p-4 rounded-xl border transition-all text-center ${isSelected
                            ? "border-[#00d9ff] bg-[#00d9ff]/10 text-white"
                            : "border-gray-700 hover:border-gray-600 bg-gray-800/50 text-gray-300"
                          }`}
                      >
                        {goal.label}
                      </button>
                    )
                  })}
                </div>

                {/* Tour option */}
                <div className="mt-6 p-4 bg-gradient-to-r from-[#00d9ff]/10 to-[#00ff88]/10 border border-[#00d9ff]/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#00d9ff]/20 rounded-lg">
                      <Sparkles className="h-5 w-5 text-[#00d9ff]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">Quick Tour Available</h4>
                      <p className="text-sm text-gray-400">
                        Take a 30-second tour to learn how to make the most of your practice sessions.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-gray-800 flex justify-between items-center">
            {step === 2 ? (
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedRole}
                className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleComplete(false)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  {isSubmitting ? "Saving..." : "Skip Tour"}
                </Button>
                <Button
                  onClick={() => handleComplete(true)}
                  disabled={isSubmitting}
                  className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Take Quick Tour"}
                </Button>
              </div>
            )}
          </div>

          {/* Progress indicator */}
          <div className="px-6 pb-4 flex justify-center gap-2">
            <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? "bg-[#00d9ff]" : "bg-gray-700"}`} />
            <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? "bg-[#00d9ff]" : "bg-gray-700"}`} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
