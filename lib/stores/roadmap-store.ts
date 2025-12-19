/**
 * Zustand Store for Company-Specific DSA Roadmap
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  PersonalizedRoadmap,
  UserRoadmapAssessment,
  CompanyId,
  DailyPlan,
} from '@/lib/data/company-questions/types'
import { DSAPattern } from '@/lib/types/dsa-patterns'

interface RoadmapState {
  // Current roadmap
  activeRoadmap: PersonalizedRoadmap | null

  // Wizard state
  wizardStep: 'company' | 'date' | 'assessment' | 'generating' | 'complete'
  selectedCompany: CompanyId | null
  selectedDate: Date | null
  assessmentAnswers: {
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
    problemsSolved: number
    hoursPerDay: number
    patternFamiliarity: { pattern: DSAPattern; level: 'unknown' | 'seen' | 'practiced' | 'confident' }[]
  }

  // UI state
  isLoading: boolean
  error: string | null
  showCompletionModal: boolean
  selectedDayIndex: number

  // Actions - Wizard
  setWizardStep: (step: RoadmapState['wizardStep']) => void
  selectCompany: (company: CompanyId) => void
  selectDate: (date: Date) => void
  setExperienceLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void
  setProblemsSolved: (count: number) => void
  setHoursPerDay: (hours: number) => void
  setPatternFamiliarity: (pattern: DSAPattern, level: 'unknown' | 'seen' | 'practiced' | 'confident') => void
  resetWizard: () => void

  // Actions - Roadmap
  setActiveRoadmap: (roadmap: PersonalizedRoadmap | null) => void
  markQuestionCompleted: (scenarioId: string, score?: number) => void
  markQuestionSkipped: (scenarioId: string) => void
  markQuestionPending: (scenarioId: string) => void
  selectDay: (index: number) => void
  addActualTime: (minutes: number) => void

  // Actions - UI
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  showCompletion: () => void
  hideCompletion: () => void

  // Computed helpers
  getTodaysPlan: () => DailyPlan | null
  getProgress: () => { completed: number; total: number; percentage: number }
  getDaysRemaining: () => number
  isOnTrack: () => boolean
}

const initialAssessmentAnswers = {
  experienceLevel: null as 'beginner' | 'intermediate' | 'advanced' | null,
  problemsSolved: 0,
  hoursPerDay: 2,
  patternFamiliarity: [] as { pattern: DSAPattern; level: 'unknown' | 'seen' | 'practiced' | 'confident' }[],
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeRoadmap: null,
      wizardStep: 'company',
      selectedCompany: null,
      selectedDate: null,
      assessmentAnswers: { ...initialAssessmentAnswers },
      isLoading: false,
      error: null,
      showCompletionModal: false,
      selectedDayIndex: 0,

      // Wizard actions
      setWizardStep: (step) => set({ wizardStep: step }),

      selectCompany: (company) => set({
        selectedCompany: company,
        wizardStep: 'date',
      }),

      selectDate: (date) => set({
        selectedDate: date,
        wizardStep: 'assessment',
      }),

      setExperienceLevel: (level) => set((state) => ({
        assessmentAnswers: {
          ...state.assessmentAnswers,
          experienceLevel: level,
        },
      })),

      setProblemsSolved: (count) => set((state) => ({
        assessmentAnswers: {
          ...state.assessmentAnswers,
          problemsSolved: count,
        },
      })),

      setHoursPerDay: (hours) => set((state) => ({
        assessmentAnswers: {
          ...state.assessmentAnswers,
          hoursPerDay: hours,
        },
      })),

      setPatternFamiliarity: (pattern, level) => set((state) => {
        const existing = state.assessmentAnswers.patternFamiliarity.filter(
          (p) => p.pattern !== pattern
        )
        return {
          assessmentAnswers: {
            ...state.assessmentAnswers,
            patternFamiliarity: [...existing, { pattern, level }],
          },
        }
      }),

      resetWizard: () => set({
        wizardStep: 'company',
        selectedCompany: null,
        selectedDate: null,
        assessmentAnswers: { ...initialAssessmentAnswers },
        error: null,
      }),

      // Roadmap actions
      setActiveRoadmap: (roadmap) => set({
        activeRoadmap: roadmap,
        wizardStep: roadmap ? 'complete' : 'company',
        selectedDayIndex: 0,
      }),

      markQuestionCompleted: (scenarioId, score) => set((state) => {
        if (!state.activeRoadmap) return state

        const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
          ...plan,
          questions: plan.questions.map((q) =>
            q.scenarioId === scenarioId
              ? { ...q, status: 'completed' as const, completedAt: new Date(), score }
              : q
          ),
        }))

        const completedCount = updatedPlans
          .flatMap((p) => p.questions)
          .filter((q) => q.status === 'completed').length

        // Update pattern coverage
        const patternCoverage = state.activeRoadmap.patternCoverage.map((pc) => {
          const patternCompleted = updatedPlans
            .flatMap((p) => p.questions)
            .filter((q) => q.status === 'completed').length
          return {
            ...pc,
            completed: patternCompleted,
            percentage: Math.round((patternCompleted / pc.total) * 100),
          }
        })

        return {
          activeRoadmap: {
            ...state.activeRoadmap,
            dailyPlans: updatedPlans,
            questionsCompleted: completedCount,
            patternCoverage,
            updatedAt: new Date(),
          },
        }
      }),

      markQuestionSkipped: (scenarioId) => set((state) => {
        if (!state.activeRoadmap) return state

        const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
          ...plan,
          questions: plan.questions.map((q) =>
            q.scenarioId === scenarioId
              ? { ...q, status: 'skipped' as const }
              : q
          ),
        }))

        const skippedCount = updatedPlans
          .flatMap((p) => p.questions)
          .filter((q) => q.status === 'skipped').length

        return {
          activeRoadmap: {
            ...state.activeRoadmap,
            dailyPlans: updatedPlans,
            questionsSkipped: skippedCount,
            updatedAt: new Date(),
          },
        }
      }),

      markQuestionPending: (scenarioId) => set((state) => {
        if (!state.activeRoadmap) return state

        const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
          ...plan,
          questions: plan.questions.map((q) =>
            q.scenarioId === scenarioId
              ? { ...q, status: 'pending' as const, completedAt: undefined, score: undefined }
              : q
          ),
        }))

        return {
          activeRoadmap: {
            ...state.activeRoadmap,
            dailyPlans: updatedPlans,
            updatedAt: new Date(),
          },
        }
      }),

      selectDay: (index) => set({ selectedDayIndex: index }),

      addActualTime: (minutes) => set((state) => {
        if (!state.activeRoadmap) return state
        return {
          activeRoadmap: {
            ...state.activeRoadmap,
            actualHoursSpent: state.activeRoadmap.actualHoursSpent + minutes / 60,
            updatedAt: new Date(),
          },
        }
      }),

      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      showCompletion: () => set({ showCompletionModal: true }),
      hideCompletion: () => set({ showCompletionModal: false }),

      // Computed helpers
      getTodaysPlan: () => {
        const roadmap = get().activeRoadmap
        if (!roadmap) return null

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return roadmap.dailyPlans.find((plan) => {
          const planDate = new Date(plan.date)
          planDate.setHours(0, 0, 0, 0)
          return planDate.getTime() === today.getTime()
        }) || null
      },

      getProgress: () => {
        const roadmap = get().activeRoadmap
        if (!roadmap) return { completed: 0, total: 0, percentage: 0 }

        return {
          completed: roadmap.questionsCompleted,
          total: roadmap.totalQuestions,
          percentage: Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100),
        }
      },

      getDaysRemaining: () => {
        const roadmap = get().activeRoadmap
        if (!roadmap) return 0

        const now = new Date()
        const interview = new Date(roadmap.interviewDate)
        return Math.max(0, Math.ceil((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      },

      isOnTrack: () => {
        const roadmap = get().activeRoadmap
        return roadmap?.isOnTrack ?? true
      },
    }),
    {
      name: 'roadmap-storage',
      partialize: (state) => ({
        activeRoadmap: state.activeRoadmap,
        selectedCompany: state.selectedCompany,
        selectedDate: state.selectedDate,
      }),
    }
  )
)

// Selector hooks for common use cases
export const useActiveRoadmap = () => useRoadmapStore((s) => s.activeRoadmap)
export const useWizardStep = () => useRoadmapStore((s) => s.wizardStep)
export const useSelectedCompany = () => useRoadmapStore((s) => s.selectedCompany)
export const useRoadmapProgress = () => useRoadmapStore((s) => s.getProgress())
export const useTodaysPlan = () => useRoadmapStore((s) => s.getTodaysPlan())
