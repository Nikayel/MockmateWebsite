import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type {
  LessonSection,
  TutorialLevelId,
  SectionStatus,
  TutorialLessonProgress,
} from "@/lib/tutorials/types"

/**
 * Active-lesson progress store. Mirrors `lib/stores/case-lab-store.ts`: `devtools` only, NO
 * `persist` middleware — Firestore is the source of truth and localStorage is avoided to prevent
 * cross-user leaks on shared browsers. Holds only the persisted progress fields; the Lesson Player
 * owns transient UI state (which phase is open, editor text).
 */
export const LESSON_SECTION_ORDER: LessonSection[] = ["teach", "apply", "practice"]

export function freshSections(): Record<LessonSection, SectionStatus> {
  return { teach: "not_started", apply: "not_started", practice: "not_started" }
}

/** % of sections completed, for the level/lesson progress overlay. */
export function computeLessonProgress(sections: Record<LessonSection, SectionStatus>): {
  completed: number
  total: number
  percentage: number
} {
  const total = LESSON_SECTION_ORDER.length
  const completed = LESSON_SECTION_ORDER.filter((s) => sections[s] === "completed").length
  return { completed, total, percentage: Math.round((completed / total) * 100) }
}

interface TutorialProgressState {
  lessonId: string | null
  levelId: TutorialLevelId | null
  sections: Record<LessonSection, SectionStatus>
  lessonStatus: SectionStatus
  lastExerciseScore?: number
  isLoading: boolean
  error: string | null

  /** Point the store at a lesson, resetting to a pristine state (before any saved load). */
  initLesson: (lessonId: string, levelId: TutorialLevelId) => void
  /** Overwrite with saved server progress (resume). */
  hydrate: (progress: TutorialLessonProgress) => void
  /** Mark a section in progress (first interaction). */
  startSection: (section: LessonSection) => void
  /** Mark a section completed; lesson completes once `practice` is done. */
  completeSection: (section: LessonSection, score?: number) => void
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
  reset: () => void
}

const pristine = {
  lessonId: null as string | null,
  levelId: null as TutorialLevelId | null,
  sections: freshSections(),
  lessonStatus: "not_started" as SectionStatus,
  lastExerciseScore: undefined as number | undefined,
  isLoading: false,
  error: null as string | null,
}

export const useTutorialStore = create<TutorialProgressState>()(
  devtools(
    (set) => ({
      ...pristine,

      initLesson: (lessonId, levelId) =>
        set({
          lessonId,
          levelId,
          sections: freshSections(),
          lessonStatus: "not_started",
          lastExerciseScore: undefined,
          error: null,
        }),

      hydrate: (progress) =>
        set({
          lessonId: progress.lessonId,
          levelId: progress.levelId,
          sections: progress.sections,
          lessonStatus: progress.lessonStatus,
          lastExerciseScore: progress.lastExerciseScore,
        }),

      startSection: (section) =>
        set((state) => {
          if (state.sections[section] !== "not_started") return state
          return {
            sections: { ...state.sections, [section]: "in_progress" },
            lessonStatus: state.lessonStatus === "not_started" ? "in_progress" : state.lessonStatus,
          }
        }),

      completeSection: (section, score) =>
        set((state) => {
          const sections: Record<LessonSection, SectionStatus> = {
            ...state.sections,
            [section]: "completed",
          }
          const lessonStatus: SectionStatus =
            sections.practice === "completed" ? "completed" : "in_progress"
          return {
            sections,
            lessonStatus,
            ...(score !== undefined ? { lastExerciseScore: score } : {}),
          }
        }),

      setLoading: (value) => set({ isLoading: value }),
      setError: (value) => set({ error: value }),
      reset: () => set({ ...pristine, sections: freshSections() }),
    }),
    { name: "tutorial-store" }
  )
)
