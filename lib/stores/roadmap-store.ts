/**
 * Zustand Store for Company-Specific DSA Roadmap
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  PersonalizedRoadmap,
  UserRoadmapAssessment,
  CompanyId,
  DailyPlan,
} from "@/lib/data/company-questions/types"
import { DSAPattern } from "@/lib/types/dsa-patterns"
import { getCurrentUserToken } from "@/lib/firebase-lazy"

interface RoadmapState {
  // Current roadmap
  activeRoadmap: PersonalizedRoadmap | null

  // Wizard state
  wizardStep: "company" | "date" | "assessment" | "generating" | "complete"
  selectedCompany: CompanyId | null
  selectedDate: Date | null
  assessmentAnswers: {
    experienceLevel: "beginner" | "intermediate" | "advanced" | null
    problemsSolved: number
    hoursPerDay: number
    patternFamiliarity: {
      pattern: DSAPattern
      level: "unknown" | "seen" | "practiced" | "confident"
    }[]
  }

  // UI state
  isLoading: boolean
  error: string | null
  showCompletionModal: boolean
  selectedDayIndex: number

  // Actions - Wizard
  setWizardStep: (step: RoadmapState["wizardStep"]) => void
  selectCompany: (company: CompanyId) => void
  selectDate: (date: Date) => void
  setExperienceLevel: (level: "beginner" | "intermediate" | "advanced") => void
  setProblemsSolved: (count: number) => void
  setHoursPerDay: (hours: number) => void
  setPatternFamiliarity: (
    pattern: DSAPattern,
    level: "unknown" | "seen" | "practiced" | "confident"
  ) => void
  resetWizard: () => void

  // Actions - Roadmap
  setActiveRoadmap: (roadmap: PersonalizedRoadmap | null) => void
  markQuestionCompleted: (scenarioId: string, score?: number, timeSpentMinutes?: number) => void
  markQuestionSkipped: (scenarioId: string) => void
  markQuestionPending: (scenarioId: string) => void
  markQuestionEvaluating: (scenarioId: string) => void
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
  experienceLevel: null as "beginner" | "intermediate" | "advanced" | null,
  problemsSolved: 0,
  hoursPerDay: 2,
  patternFamiliarity: [] as {
    pattern: DSAPattern
    level: "unknown" | "seen" | "practiced" | "confident"
  }[],
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      // Initial state
      // NOTE: activeRoadmap is NOT persisted to avoid cross-user data leaks
      // It's always loaded fresh from Firebase when the page mounts
      activeRoadmap: null,
      wizardStep: "company",
      selectedCompany: null,
      selectedDate: null,
      assessmentAnswers: { ...initialAssessmentAnswers },
      isLoading: false,
      error: null,
      showCompletionModal: false,
      selectedDayIndex: 0,

      // Wizard actions
      setWizardStep: (step) => set({ wizardStep: step }),

      selectCompany: (company) =>
        set({
          selectedCompany: company,
          wizardStep: "date",
        }),

      selectDate: (date) =>
        set({
          selectedDate: date,
          wizardStep: "assessment",
        }),

      setExperienceLevel: (level) =>
        set((state) => ({
          assessmentAnswers: {
            ...state.assessmentAnswers,
            experienceLevel: level,
          },
        })),

      setProblemsSolved: (count) =>
        set((state) => ({
          assessmentAnswers: {
            ...state.assessmentAnswers,
            problemsSolved: count,
          },
        })),

      setHoursPerDay: (hours) =>
        set((state) => ({
          assessmentAnswers: {
            ...state.assessmentAnswers,
            hoursPerDay: hours,
          },
        })),

      setPatternFamiliarity: (pattern, level) =>
        set((state) => {
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

      resetWizard: () =>
        set({
          wizardStep: "company",
          selectedCompany: null,
          selectedDate: null,
          assessmentAnswers: { ...initialAssessmentAnswers },
          error: null,
        }),

      // Roadmap actions
      // NOTE: We don't reset selectedDayIndex here - the page component
      // calls selectDay() immediately after loading to set the correct day.
      // This prevents a flash of the wrong day on initial navigation.
      setActiveRoadmap: (roadmap) =>
        set((state) => ({
          activeRoadmap: roadmap,
          wizardStep: roadmap ? "complete" : "company",
          // Keep current selectedDayIndex - the page will set it correctly
          selectedDayIndex: state.selectedDayIndex,
        })),

      markQuestionCompleted: (scenarioId, score, timeSpentMinutes) => {
        const state = get()
        if (!state.activeRoadmap) return

        const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
          ...plan,
          questions: plan.questions.map((q) =>
            q.scenarioId === scenarioId
              ? { ...q, status: "completed" as const, completedAt: new Date(), score }
              : q
          ),
        }))

        const allQuestions = updatedPlans.flatMap((p) => p.questions)
        const completedCount = allQuestions.filter((q) => q.status === "completed").length

        // Update pattern coverage - count per pattern
        const patternCoverage = state.activeRoadmap.patternCoverage.map((pc) => {
          const patternQuestions = allQuestions.filter((q) => q.pattern === pc.pattern)
          const patternCompleted = patternQuestions.filter((q) => q.status === "completed").length
          const total = patternQuestions.length || pc.total
          return {
            ...pc,
            total,
            completed: patternCompleted,
            percentage: total > 0 ? Math.round((patternCompleted / total) * 100) : 0,
          }
        })

        // Update actualHoursSpent if timeSpentMinutes is provided
        let actualHoursSpent = state.activeRoadmap.actualHoursSpent
        if (timeSpentMinutes) {
          actualHoursSpent += timeSpentMinutes / 60
        }

        const updatedRoadmap = {
          ...state.activeRoadmap,
          dailyPlans: updatedPlans,
          questionsCompleted: completedCount,
          patternCoverage,
          actualHoursSpent,
          updatedAt: new Date(),
        }

        // Update local state immediately (optimistic update)
        set({ activeRoadmap: updatedRoadmap })

        // Sync to Firebase with retry logic
        const roadmapId = state.activeRoadmap.id
        if (roadmapId) {
          const syncToFirebase = async (retries = 3): Promise<boolean> => {
            for (let attempt = 1; attempt <= retries; attempt++) {
              try {
                const token = await getCurrentUserToken()
                if (!token) {
                  console.error("Failed to sync progress: No auth token")
                  return false
                }
                const response = await fetch("/api/roadmap/progress", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    roadmapId,
                    scenarioId,
                    status: "completed",
                    score,
                    timeSpentMinutes,
                  }),
                })

                if (response.ok) {
                  return true
                }

                // Log error but don't throw on last attempt
                const errorData = await response.json().catch(() => ({}))
                console.error(`Roadmap sync attempt ${attempt} failed:`, errorData)

                if (attempt < retries) {
                  // Exponential backoff: 1s, 2s, 4s
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
                  )
                }
              } catch (error) {
                console.error(`Roadmap sync attempt ${attempt} error:`, error)
                if (attempt < retries) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
                  )
                }
              }
            }
            return false
          }

          // Run sync in background - the toast is shown by the interview page
          syncToFirebase().then((success) => {
            if (!success) {
              // Revert local state if all retries failed
              // This ensures UI stays in sync with Firebase
              console.error("All roadmap sync retries failed for scenario:", scenarioId)
              // Note: We don't revert because the session IS completed in Firebase
              // The roadmap will sync correctly on next page load
            }
          })
        }
      },

      markQuestionSkipped: (scenarioId) => {
        const state = get()
        if (!state.activeRoadmap) return

        const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
          ...plan,
          questions: plan.questions.map((q) =>
            q.scenarioId === scenarioId ? { ...q, status: "skipped" as const } : q
          ),
        }))

        const skippedCount = updatedPlans
          .flatMap((p) => p.questions)
          .filter((q) => q.status === "skipped").length

        const updatedRoadmap = {
          ...state.activeRoadmap,
          dailyPlans: updatedPlans,
          questionsSkipped: skippedCount,
          updatedAt: new Date(),
        }

        // Update local state immediately (optimistic update)
        set({ activeRoadmap: updatedRoadmap })

        // Sync to Firebase with retry logic
        const roadmapId = state.activeRoadmap.id
        if (roadmapId) {
          const syncToFirebase = async (retries = 2): Promise<void> => {
            for (let attempt = 1; attempt <= retries; attempt++) {
              try {
                const token = await getCurrentUserToken()
                if (!token) {
                  console.error("Failed to sync skipped status: No auth token")
                  return
                }
                const response = await fetch("/api/roadmap/progress", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    roadmapId,
                    scenarioId,
                    status: "skipped",
                  }),
                })

                if (response.ok) return

                if (attempt < retries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
                }
              } catch (error) {
                console.error(`Skipped sync attempt ${attempt} error:`, error)
                if (attempt < retries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
                }
              }
            }
          }
          syncToFirebase()
        }
      },

      markQuestionPending: (scenarioId) =>
        set((state) => {
          if (!state.activeRoadmap) return state

          const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
            ...plan,
            questions: plan.questions.map((q) =>
              q.scenarioId === scenarioId
                ? { ...q, status: "pending" as const, completedAt: undefined, score: undefined }
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

      markQuestionEvaluating: (scenarioId) => {
        const state = get()
        if (!state.activeRoadmap) return

        const updatedPlans = state.activeRoadmap.dailyPlans.map((plan) => ({
          ...plan,
          questions: plan.questions.map((q) =>
            q.scenarioId === scenarioId ? { ...q, status: "evaluating" as const } : q
          ),
        }))

        const updatedRoadmap = {
          ...state.activeRoadmap,
          dailyPlans: updatedPlans,
          updatedAt: new Date(),
        }

        // Update local state immediately (optimistic update)
        set({ activeRoadmap: updatedRoadmap })

        // Sync to Firebase with retry logic
        const roadmapId = state.activeRoadmap.id
        if (roadmapId) {
          const syncToFirebase = async (retries = 2): Promise<void> => {
            for (let attempt = 1; attempt <= retries; attempt++) {
              try {
                const token = await getCurrentUserToken()
                if (!token) {
                  console.error("Failed to sync evaluating status: No auth token")
                  return
                }
                const response = await fetch("/api/roadmap/progress", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    roadmapId,
                    scenarioId,
                    status: "evaluating",
                  }),
                })

                if (response.ok) return

                if (attempt < retries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
                }
              } catch (error) {
                console.error(`Evaluating sync attempt ${attempt} error:`, error)
                if (attempt < retries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
                }
              }
            }
          }
          syncToFirebase()
        }
      },

      selectDay: (index) => set({ selectedDayIndex: index }),

      addActualTime: (minutes) => {
        const state = get()
        if (!state.activeRoadmap) return

        const updatedRoadmap = {
          ...state.activeRoadmap,
          actualHoursSpent: state.activeRoadmap.actualHoursSpent + minutes / 60,
          updatedAt: new Date(),
        }

        // Update local state immediately
        set({ activeRoadmap: updatedRoadmap })

        // Sync to Firebase in the background
        // Note: We'll update the actualHoursSpent on the next progress update
        // For now, we just update locally. If needed, we can add a separate endpoint.
      },

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

        return (
          roadmap.dailyPlans.find((plan) => {
            const planDate = new Date(plan.date)
            planDate.setHours(0, 0, 0, 0)
            return planDate.getTime() === today.getTime()
          }) || null
        )
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
      name: "roadmap-storage",
      // IMPORTANT: Do NOT persist activeRoadmap - it must be loaded fresh from Firebase
      // to prevent cross-user data leaks when multiple users use the same browser
      partialize: (state) => ({
        // Only persist wizard state, NOT the roadmap itself
        selectedCompany: state.selectedCompany,
        selectedDate: state.selectedDate,
        // wizardStep and assessmentAnswers are not persisted to ensure clean state
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
