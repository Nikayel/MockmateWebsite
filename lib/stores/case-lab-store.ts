/**
 * Zustand store for an active Case Lab run.
 *
 * Holds the in-flight lab definition, the resumable Run, and per-milestone
 * answers. Soft navigation (P1): the user can move between milestones freely;
 * `milestoneStatus` tracks progress without hard-gating.
 *
 * The Run is loaded fresh from Firebase per session (it is NOT persisted to
 * localStorage) to avoid cross-user data leaks on shared browsers — same policy
 * as `roadmap-store.ts`. Firebase save/resume wiring lands in a later phase.
 */

import { useMemo } from "react"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type {
  CaseLab,
  CaseLabRun,
  CaseLabMode,
  MilestoneKind,
  MilestoneStatusMap,
  ClarifyAnswer,
  DecomposeAnswer,
  DesignAnswer,
  BuildAnswer,
  ReviewAnswer,
} from "@/lib/labs/types"

export const MILESTONE_ORDER: MilestoneKind[] = [
  "clarify",
  "decompose",
  "design",
  "build",
  "review",
]

export interface CaseLabProgress {
  completed: number
  total: number
  percentage: number
}

/**
 * Pure progress derivation shared by the imperative `getProgress` helper and the
 * reactive `useCaseLabProgress` hook. Kept pure (no store access) so the hook can
 * memoize it on `activeRun` — returning a fresh object straight from a zustand
 * selector would change identity every render and trigger an infinite loop.
 */
export function computeCaseLabProgress(run: CaseLabRun | null): CaseLabProgress {
  const total = MILESTONE_ORDER.length
  if (!run) return { completed: 0, total, percentage: 0 }
  const completed = MILESTONE_ORDER.filter((kind) => run.milestoneStatus[kind] === "done").length
  return { completed, total, percentage: Math.round((completed / total) * 100) }
}

interface CaseLabState {
  // The lab being played + the user's resumable run
  activeLab: CaseLab | null
  activeRun: CaseLabRun | null

  // UI state
  isLoading: boolean
  error: string | null

  // Lifecycle
  setActiveLab: (lab: CaseLab | null) => void
  setActiveRun: (run: CaseLabRun | null) => void
  startRun: (lab: CaseLab, mode: CaseLabMode) => void
  reset: () => void

  // Navigation (soft — P1)
  goToMilestone: (kind: MilestoneKind) => void
  goToNextMilestone: () => void
  goToPreviousMilestone: () => void
  markMilestoneDone: (kind: MilestoneKind) => void
  setMode: (mode: CaseLabMode) => void
  completeRun: () => void

  // Per-milestone answers
  setClarify: (answers: ClarifyAnswer[]) => void
  setDecompose: (answer: DecomposeAnswer) => void
  setDesign: (answer: DesignAnswer) => void
  setBuild: (answer: BuildAnswer) => void
  setReview: (answer: ReviewAnswer) => void

  // UI actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Computed helpers
  getCurrentMilestone: () => MilestoneKind | null
  getMilestoneStatus: (kind: MilestoneKind) => MilestoneStatusMap[MilestoneKind] | null
  getProgress: () => { completed: number; total: number; percentage: number }
  isComplete: () => boolean
}

/** Immutably patch the active run, stamping `updatedAt`. No-op when no run. */
function patchRun(run: CaseLabRun | null, patch: Partial<CaseLabRun>): CaseLabRun | null {
  if (!run) return run
  return { ...run, ...patch, updatedAt: new Date().toISOString() }
}

export const useCaseLabStore = create<CaseLabState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeLab: null,
      activeRun: null,
      isLoading: false,
      error: null,

      // Lifecycle
      setActiveLab: (lab) => set({ activeLab: lab }),
      setActiveRun: (run) => set({ activeRun: run }),
      startRun: (lab, mode) => {
        const now = new Date().toISOString()
        set({
          activeLab: lab,
          error: null,
          activeRun: {
            id: `run_${crypto.randomUUID()}`,
            // Real owner is stamped server-side on first save.
            userId: "",
            caseLabId: lab.id,
            mode,
            status: "in_progress",
            currentMilestone: "clarify",
            startedAt: now,
            updatedAt: now,
            answers: {},
            milestoneStatus: {
              clarify: "active",
              decompose: "locked",
              design: "locked",
              build: "locked",
              review: "locked",
            },
          },
        })
      },
      reset: () => set({ activeLab: null, activeRun: null, error: null }),

      // Navigation
      goToMilestone: (kind) =>
        set((state) => {
          if (!state.activeRun) return state
          const milestoneStatus: MilestoneStatusMap = {
            ...state.activeRun.milestoneStatus,
            // Entering an unstarted milestone makes it active; "done" stays done.
            [kind]: state.activeRun.milestoneStatus[kind] === "done" ? "done" : "active",
          }
          return {
            activeRun: patchRun(state.activeRun, {
              currentMilestone: kind,
              milestoneStatus,
            }),
          }
        }),

      goToNextMilestone: () => {
        const current = get().getCurrentMilestone()
        if (!current) return
        const next = MILESTONE_ORDER[MILESTONE_ORDER.indexOf(current) + 1]
        if (next) get().goToMilestone(next)
      },

      goToPreviousMilestone: () => {
        const current = get().getCurrentMilestone()
        if (!current) return
        const prev = MILESTONE_ORDER[MILESTONE_ORDER.indexOf(current) - 1]
        if (prev) get().goToMilestone(prev)
      },

      markMilestoneDone: (kind) =>
        set((state) => {
          if (!state.activeRun) return state
          return {
            activeRun: patchRun(state.activeRun, {
              milestoneStatus: {
                ...state.activeRun.milestoneStatus,
                [kind]: "done",
              },
            }),
          }
        }),

      setMode: (mode) => set((state) => ({ activeRun: patchRun(state.activeRun, { mode }) })),

      completeRun: () =>
        set((state) => {
          if (!state.activeRun) return state
          return {
            activeRun: patchRun(state.activeRun, {
              status: "completed",
              completedAt: new Date().toISOString(),
              milestoneStatus: {
                ...state.activeRun.milestoneStatus,
                review: "done",
              },
            }),
          }
        }),

      // Per-milestone answers
      setClarify: (answers) =>
        set((state) => ({
          activeRun: patchRun(state.activeRun, {
            answers: { ...state.activeRun?.answers, clarify: answers },
          }),
        })),

      setDecompose: (answer) =>
        set((state) => ({
          activeRun: patchRun(state.activeRun, {
            answers: { ...state.activeRun?.answers, decompose: answer },
          }),
        })),

      setDesign: (answer) =>
        set((state) => ({
          activeRun: patchRun(state.activeRun, {
            answers: { ...state.activeRun?.answers, design: answer },
          }),
        })),

      setBuild: (answer) =>
        set((state) => ({
          activeRun: patchRun(state.activeRun, {
            answers: { ...state.activeRun?.answers, build: answer },
          }),
        })),

      setReview: (answer) =>
        set((state) => ({
          activeRun: patchRun(state.activeRun, {
            answers: { ...state.activeRun?.answers, review: answer },
          }),
        })),

      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Computed helpers
      getCurrentMilestone: () => get().activeRun?.currentMilestone ?? null,

      getMilestoneStatus: (kind) => get().activeRun?.milestoneStatus[kind] ?? null,

      getProgress: () => computeCaseLabProgress(get().activeRun),

      isComplete: () => get().activeRun?.status === "completed",
    }),
    { name: "case-lab-store" }
  )
)

// Selector hooks for common use cases
export const useActiveLab = () => useCaseLabStore((s) => s.activeLab)
export const useActiveRun = () => useCaseLabStore((s) => s.activeRun)
export const useCurrentMilestone = () => useCaseLabStore((s) => s.getCurrentMilestone())

/**
 * Reactive progress. Selects the stable `activeRun` reference and derives the
 * progress object via `useMemo`, so the returned object only changes identity
 * when the run actually changes — never per render (which would loop forever).
 */
export const useCaseLabProgress = (): CaseLabProgress => {
  const run = useCaseLabStore((s) => s.activeRun)
  return useMemo(() => computeCaseLabProgress(run), [run])
}
