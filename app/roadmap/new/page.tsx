"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, AlertCircle, RefreshCw, Crown, ArrowRight } from "lucide-react"
import { Sparra } from "@/components/brand/Sparra"
import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"
import Link from "next/link"

import { Header } from "@/components/header"
import {
  CompanySelector,
  InterviewDatePicker,
  SkillAssessment,
  AssessmentResult,
} from "@/components/roadmap"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { getCompanyById } from "@/lib/data/company-questions"
import { UserRoadmapAssessment } from "@/lib/data/company-questions/types"
import { useAuth } from "@/lib/auth-context"
import { calendarDaysUntil } from "@/lib/roadmap/calendar-days"

type Step = "company" | "date" | "assessment" | "generating"

export default function NewRoadmapPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("company")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, firebaseUser } = useAuth()

  const {
    selectedCompany,
    selectedDate,
    selectCompany,
    selectDate,
    setActiveRoadmap,
    resetWizard,
  } = useRoadmapStore()

  // Reset wizard on mount
  useEffect(() => {
    resetWizard()
  }, [resetWizard])

  const handleCompanySelect = (companyId: string) => {
    selectCompany(companyId as any)
    setStep("date")
  }

  const handleDateSelect = (date: Date) => {
    selectDate(date)
    setStep("assessment")
  }

  const handleAssessmentComplete = async (result: AssessmentResult) => {
    if (!selectedCompany || !selectedDate) return

    if (!user?.id || !firebaseUser) {
      setError("You must be logged in to create a roadmap")
      setStep("assessment")
      return
    }

    setStep("generating")
    setIsGenerating(true)
    setError(null)

    try {
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser.getIdToken()

      // Calculate days remaining
      // At least 1: an assessment generated for a same-day interview still needs a
      // day of plan to divide work across.
      const daysRemaining = Math.max(1, calendarDaysUntil(selectedDate) ?? 1)

      // Build assessment object
      const assessment: UserRoadmapAssessment = {
        targetCompany: selectedCompany,
        interviewDate: selectedDate,
        daysRemaining,
        experienceLevel: result.experienceLevel,
        targetTrack: result.targetTrack,
        problemsSolvedEstimate: result.problemsSolved,
        patternFamiliarity: result.patternFamiliarity,
        hoursPerDay: result.hoursPerDay,
        preferredDifficulty: "mixed",
        targetScore: 80,
      }

      // Call API endpoint to create and save roadmap to Firebase
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetCompany: selectedCompany,
          interviewDate: selectedDate.toISOString(),
          experienceLevel: result.experienceLevel,
          targetTrack: result.targetTrack,
          problemsSolved: result.problemsSolved,
          hoursPerDay: result.hoursPerDay,
          patternFamiliarity: result.patternFamiliarity,
          mixMode: result.mixMode,
          selectedCategories: result.selectedCategories,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create roadmap" }))
        // Handle Pro-only feature restriction - stay on generating step and show upgrade prompt
        if (errorData.code === "PRO_REQUIRED") {
          // Brief delay so user sees the generation started
          await new Promise((resolve) => setTimeout(resolve, 1500))
          setError("PRO_REQUIRED")
          setIsGenerating(false)
          // Stay on generating step - don't go back to assessment
          return
        }
        throw new Error(errorData.error || "Failed to create roadmap")
      }

      const data = await response.json()
      const roadmap = data.roadmap

      if (!roadmap) {
        throw new Error("Failed to generate roadmap")
      }

      // Set active roadmap in store
      setActiveRoadmap(roadmap)

      // Navigate to roadmap view
      router.push("/roadmap")
    } catch (err) {
      console.error("Error generating roadmap:", err)
      setError(err instanceof Error ? err.message : "Failed to generate roadmap")
      setStep("assessment")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBack = () => {
    if (step === "date") {
      setStep("company")
    } else if (step === "assessment") {
      setStep("date")
    }
  }

  const companyData = selectedCompany ? getCompanyById(selectedCompany) : null

  // Check for rate limit error
  const isRateLimited =
    error?.toLowerCase().includes("rate") ||
    error?.toLowerCase().includes("limit") ||
    error?.toLowerCase().includes("too many")
  const isProRequired = error === "PRO_REQUIRED"

  return (
    <div className="bg-background min-h-screen">
      <Header />

      {/* Progress steps */}
      <div className="container mx-auto px-4 py-6 pt-24">
        <div className="mb-8 flex items-center justify-center gap-2">
          <StepIndicator
            label="Company"
            active={step === "company"}
            completed={!!selectedCompany}
          />
          <StepConnector completed={!!selectedCompany} />
          <StepIndicator label="Date" active={step === "date"} completed={!!selectedDate} />
          <StepConnector completed={!!selectedDate} />
          <StepIndicator
            label="Assessment"
            active={step === "assessment"}
            completed={step === "generating"}
          />
          <StepConnector completed={step === "generating"} />
          <StepIndicator label="Generate" active={step === "generating"} completed={false} />
        </div>

        {/* Pro Upgrade Prompt - only show when NOT on generating step (generating step has its own UI) */}
        {isProRequired && step !== "generating" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 max-w-2xl rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6"
          >
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-500">
                <Crown className="h-6 w-6 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1 text-lg font-bold">
                  Upgrade to Pro for Personalized Roadmaps
                </h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  Get AI-powered study plans tailored to your target company, interview date, and
                  skill level. Pro includes spaced repetition, pattern mastery tracking, and more.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/upgrade"
                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-400"
                  >
                    Upgrade to Pro
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setError(null)}
                    className="text-muted-foreground hover:text-foreground px-4 py-2 text-sm transition-colors"
                  >
                    Continue as Free
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && !isProRequired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-auto mb-6 max-w-2xl rounded-lg border p-4 ${
              isRateLimited
                ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800/30 dark:bg-yellow-900/20"
                : "border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`mt-0.5 h-5 w-5 shrink-0 ${isRateLimited ? "text-yellow-600" : "text-red-600"}`}
              />
              <div className="flex-1">
                <p
                  className={`font-medium ${isRateLimited ? "text-yellow-800 dark:text-yellow-200" : "text-red-800 dark:text-red-200"}`}
                >
                  {isRateLimited ? "Too Many Requests" : "Error"}
                </p>
                <p
                  className={`mt-1 text-sm ${isRateLimited ? "text-yellow-700 dark:text-yellow-300" : "text-red-700 dark:text-red-300"}`}
                >
                  {isRateLimited
                    ? "You've made too many requests. Please wait a moment and try again."
                    : error}
                </p>
                {isRateLimited && (
                  <button
                    onClick={() => setError(null)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Dismiss & Try Again
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step content */}
        <div className="mx-auto max-w-4xl">
          <AnimatePresence mode="wait">
            {step === "company" && (
              <motion.div
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CompanySelector onSelect={handleCompanySelect} selectedCompany={selectedCompany} />
              </motion.div>
            )}

            {step === "date" && selectedCompany && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mx-auto max-w-lg"
              >
                <InterviewDatePicker
                  companyId={selectedCompany}
                  onSelect={handleDateSelect}
                  selectedDate={selectedDate}
                />
                {selectedDate && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setStep("assessment")}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 font-medium transition-colors"
                    >
                      Continue to Assessment
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === "assessment" && (
              <motion.div
                key="assessment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mx-auto max-w-2xl"
              >
                <SkillAssessment onComplete={handleAssessmentComplete} onBack={handleBack} />
              </motion.div>
            )}

            {step === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-16 text-center"
              >
                {isProRequired ? (
                  // Show Pro upgrade prompt on generating step
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto max-w-lg"
                  >
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                      <Crown className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-foreground mb-3 text-2xl font-bold">
                      Unlock Your Personalized Roadmap
                    </h2>
                    <p className="text-muted-foreground mx-auto mb-6 max-w-md">
                      We've analyzed {companyData?.name || "your target company"}'s interview
                      patterns and prepared a custom study plan. Upgrade to Pro to access your
                      personalized roadmap with:
                    </p>
                    <div className="mx-auto mb-8 grid max-w-md grid-cols-1 gap-3 text-left sm:grid-cols-2">
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span> Company-specific questions
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span> Daily practice schedules
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span> Spaced repetition tracking
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span> Pattern mastery insights
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-3 sm:flex-row">
                      <Link
                        href="/upgrade"
                        className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold shadow-lg transition-all"
                      >
                        Upgrade to Pro
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/dashboard"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center px-6 py-3 transition-colors"
                      >
                        Continue with Free
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  // Show loading state
                  <>
                    <div className="mb-6 flex justify-center" role="status">
                      <Sparra state="thinking" size={64} label="Creating your roadmap" />
                    </div>
                    <h2 className="text-foreground mb-2 text-2xl font-bold">
                      Creating Your Personalized Roadmap
                      <AnimatedEllipsis />
                    </h2>
                    <p className="text-muted-foreground mx-auto max-w-md">
                      We're analyzing {companyData?.name || "company"} interview patterns and
                      building a study plan tailored to your timeline and skill level...
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function StepIndicator({
  label,
  active,
  completed,
}: {
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
          completed
            ? "bg-neural text-white"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? "✓" : ""}
      </div>
      <span
        className={`mt-1 text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return <div className={`h-0.5 w-12 ${completed ? "bg-green-500" : "bg-muted"}`} />
}
