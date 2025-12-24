'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { Header } from '@/components/header'
import { CompanySelector, InterviewDatePicker, SkillAssessment, AssessmentResult } from '@/components/roadmap'
import { useRoadmapStore } from '@/lib/stores/roadmap-store'
import { getCompanyById } from '@/lib/data/company-questions'
import { generatePersonalizedRoadmap } from '@/lib/roadmap/prioritization-algorithm'
import { UserRoadmapAssessment } from '@/lib/data/company-questions/types'
import { scenarios } from '@/lib/scenarios'
import { useAuth } from '@/lib/auth-context'

type Step = 'company' | 'date' | 'assessment' | 'generating'

export default function NewRoadmapPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('company')
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
    setStep('date')
  }

  const handleDateSelect = (date: Date) => {
    selectDate(date)
    setStep('assessment')
  }

  const handleAssessmentComplete = async (result: AssessmentResult) => {
    if (!selectedCompany || !selectedDate) return

    if (!user?.id || !firebaseUser) {
      setError('You must be logged in to create a roadmap')
      setStep('assessment')
      return
    }

    setStep('generating')
    setIsGenerating(true)
    setError(null)

    try {
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser.getIdToken()

      // Calculate days remaining
      const now = new Date()
      const daysRemaining = Math.max(1, Math.ceil((selectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      // Build assessment object
      const assessment: UserRoadmapAssessment = {
        targetCompany: selectedCompany,
        interviewDate: selectedDate,
        daysRemaining,
        experienceLevel: result.experienceLevel,
        problemsSolvedEstimate: result.problemsSolved,
        patternFamiliarity: result.patternFamiliarity,
        hoursPerDay: result.hoursPerDay,
        preferredDifficulty: 'mixed',
        targetScore: 80,
      }

      // Call API endpoint to create and save roadmap to Firebase
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetCompany: selectedCompany,
          interviewDate: selectedDate.toISOString(),
          experienceLevel: result.experienceLevel,
          problemsSolved: result.problemsSolved,
          hoursPerDay: result.hoursPerDay,
          patternFamiliarity: result.patternFamiliarity,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create roadmap' }))
        throw new Error(errorData.error || 'Failed to create roadmap')
      }

      const data = await response.json()
      const roadmap = data.roadmap

      if (!roadmap) {
        throw new Error('Failed to generate roadmap')
      }

      // Set active roadmap in store
      setActiveRoadmap(roadmap)

      // Navigate to roadmap view
      router.push('/roadmap')
    } catch (err) {
      console.error('Error generating roadmap:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate roadmap')
      setStep('assessment')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBack = () => {
    if (step === 'date') {
      setStep('company')
    } else if (step === 'assessment') {
      setStep('date')
    }
  }

  const companyData = selectedCompany ? getCompanyById(selectedCompany) : null

  // Check for rate limit error
  const isRateLimited = error?.toLowerCase().includes('rate') || error?.toLowerCase().includes('limit') || error?.toLowerCase().includes('too many')

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Progress steps */}
      <div className="container mx-auto px-4 py-6 pt-24">
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepIndicator label="Company" active={step === 'company'} completed={!!selectedCompany} />
          <StepConnector completed={!!selectedCompany} />
          <StepIndicator label="Date" active={step === 'date'} completed={!!selectedDate} />
          <StepConnector completed={!!selectedDate} />
          <StepIndicator label="Assessment" active={step === 'assessment'} completed={step === 'generating'} />
          <StepConnector completed={step === 'generating'} />
          <StepIndicator label="Generate" active={step === 'generating'} completed={false} />
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-2xl mx-auto mb-6 p-4 rounded-lg border ${
              isRateLimited
                ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/30'
                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${isRateLimited ? 'text-yellow-600' : 'text-red-600'}`} />
              <div className="flex-1">
                <p className={`font-medium ${isRateLimited ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'}`}>
                  {isRateLimited ? 'Too Many Requests' : 'Error'}
                </p>
                <p className={`text-sm mt-1 ${isRateLimited ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                  {isRateLimited
                    ? 'You\'ve made too many requests. Please wait a moment and try again.'
                    : error}
                </p>
                {isRateLimited && (
                  <button
                    onClick={() => setError(null)}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
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
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CompanySelector
                  onSelect={handleCompanySelect}
                  selectedCompany={selectedCompany}
                />
              </motion.div>
            )}

            {step === 'date' && selectedCompany && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-lg mx-auto"
              >
                <InterviewDatePicker
                  companyId={selectedCompany}
                  onSelect={handleDateSelect}
                  selectedDate={selectedDate}
                />
                {selectedDate && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setStep('assessment')}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Continue to Assessment
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'assessment' && (
              <motion.div
                key="assessment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <SkillAssessment
                  onComplete={handleAssessmentComplete}
                  onBack={handleBack}
                />
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Creating Your Personalized Roadmap
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're analyzing {companyData?.name || 'company'} interview patterns
                  and building a study plan tailored to your timeline and skill level...
                </p>
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
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {completed ? '✓' : ''}
      </div>
      <span className={`text-xs mt-1 ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`w-12 h-0.5 ${completed ? 'bg-green-500' : 'bg-muted'}`}
    />
  )
}
