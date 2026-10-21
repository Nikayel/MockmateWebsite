/**
 * Zustand store for an active guided bug-fix lab run.
 *
 * Holds the lab config (from the scenario) and the resumable progress. Gating is
 * delegated to the pure helpers in `lib/bugfix/guided-lab/gating.ts`. Test runs
 * drive milestone completion via `applyTestResults`; manual-ack milestones
 * advance via `ackMilestone`.
 */

import { useMemo } from "react"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { GuidedLabConfig, GuidedLabProgress } from "@/lib/bugfix/guided-lab/types"
import {
  acknowledgeMilestone,
  applyTestRunToProgress,
  invalidateFinalVerification,
  isGuidedLabComplete,
  revealedTestSuites,
  type SuiteResult,
} from "@/lib/bugfix/guided-lab/gating"
import {
  summarizeGuidedLabProgress,
  type GuidedLabProgressSummary,
} from "@/lib/bugfix/guided-lab/mastery"

import { restoreGuidedLabProgress } from "@/lib/bugfix/guided-lab/progress-state"
import { parseGuidedLabProgress } from "@/lib/bugfix/guided-lab/persistence"

const nowIso = () => new Date().toISOString()

interface GuidedLabState {
  scenarioId: string | null
  config: GuidedLabConfig | null
  progress: GuidedLabProgress | null
  sourceRevision: number

  /** Load a lab for a scenario, resuming saved progress when provided. */
  initGuidedLab: (
    scenarioId: string,
    config: GuidedLabConfig,
    saved?: GuidedLabProgress | null
  ) => void
  /** Apply a workspace test run; completes any satisfied tests-pass milestones. */
  applyTestResults: (results: SuiteResult[], sourceRevision?: number) => void
  /** Complete a manual-ack milestone. */
  ackMilestone: (milestoneId: string) => void
  answerQuiz: (quizId: string, selectedIndex: number) => void
  ackCheckpoint: (checkpointId: string) => void
  invalidateVerification: (scenarioId: string) => void
  clear: () => void
}

export const useGuidedLabStore = create<GuidedLabState>()(
  devtools(
    (set, get) => ({
      scenarioId: null,
      config: null,
      progress: null,
      sourceRevision: 0,

      initGuidedLab: (scenarioId, config, saved) => {
        const parsed = parseGuidedLabProgress(saved)
        set({
          scenarioId,
          config,
          sourceRevision: 0,
          progress: restoreGuidedLabProgress(config, parsed, nowIso()),
        })
      },

      applyTestResults: (results, sourceRevision) => {
        const { config, progress } = get()
        if (
          !config ||
          !progress ||
          (sourceRevision !== undefined && sourceRevision !== get().sourceRevision)
        )
          return
        set({ progress: applyTestRunToProgress(config, progress, results, nowIso()) })
      },

      ackMilestone: (milestoneId) => {
        const { config, progress } = get()
        if (!config || !progress) return
        set({ progress: acknowledgeMilestone(config, progress, milestoneId, nowIso()) })
      },

      answerQuiz: (quizId, selectedIndex) => {
        const { progress } = get()
        if (!progress) return
        const others = progress.quizAnswers.filter((answer) => answer.quizId !== quizId)
        set({
          progress: {
            ...progress,
            quizAnswers: [...others, { quizId, selectedIndex }],
            updatedAt: nowIso(),
          },
        })
      },

      ackCheckpoint: (checkpointId) => {
        const { progress } = get()
        if (!progress || progress.checkpointAcks.includes(checkpointId)) return
        set({
          progress: {
            ...progress,
            checkpointAcks: [...progress.checkpointAcks, checkpointId],
            updatedAt: nowIso(),
          },
        })
      },

      invalidateVerification: (scenarioId) => {
        const { config, progress, scenarioId: activeId } = get()
        if (!config || !progress || activeId !== scenarioId) return
        set({
          sourceRevision: get().sourceRevision + 1,
          progress: invalidateFinalVerification(config, progress, nowIso()),
        })
      },

      clear: () => set({ scenarioId: null, config: null, progress: null, sourceRevision: 0 }),
    }),
    { name: "guided-lab-store" }
  )
)

/**
 * Snapshot of the guided-lab state for the chat request: which milestone is
 * active, which bug is revealed, and whether this is an AI-restraint step.
 * Returns undefined unless a guided lab for `scenarioId` is active. Read
 * imperatively (not a hook) so it can be called inside chat send handlers.
 */
export function getGuidedChatState(
  scenarioId: string | undefined
):
  | { milestoneId: string; milestoneTitle: string; activeBugId?: string; aiRestraint: boolean }
  | undefined {
  const { config, progress, scenarioId: storeScenarioId } = useGuidedLabStore.getState()
  if (!config || !progress || !scenarioId || storeScenarioId !== scenarioId) return undefined
  const active = config.milestones.find((m) => progress.milestoneStatus[m.id] === "active")
  if (!active) return undefined
  const aiRestraint = active.blocks.some(
    (block) => block.kind === "instruction" && block.aiRestraint === true
  )
  return {
    milestoneId: active.id,
    milestoneTitle: active.title,
    activeBugId: progress.activeBugId,
    aiRestraint,
  }
}

/**
 * Restraint-resistant understanding signal for scoring a guided lab as practice
 * mastery (first-try quiz accuracy + milestone completion). Returns undefined
 * unless a guided lab for `scenarioId` is active. Read imperatively at submit.
 */
export function getGuidedLabMasterySummary(
  scenarioId: string | undefined
): GuidedLabProgressSummary | undefined {
  const { config, progress, scenarioId: storeScenarioId } = useGuidedLabStore.getState()
  if (!config || !progress || !scenarioId || storeScenarioId !== scenarioId) return undefined
  return summarizeGuidedLabProgress(config, progress)
}

/** True once every milestone is done. */
export const useGuidedLabComplete = (): boolean =>
  useGuidedLabStore((state) =>
    state.config && state.progress ? isGuidedLabComplete(state.config, state.progress) : false
  )

/**
 * Test suites that should be visible in the panel. Memoized on config/progress so
 * the returned array keeps a stable identity (a fresh array from a selector would
 * loop). The caller also checks whether this scenario has an active guided lab.
 */
export const useRevealedTestSuites = (): string[] => {
  const config = useGuidedLabStore((state) => state.config)
  const progress = useGuidedLabStore((state) => state.progress)
  return useMemo(
    () => (config && progress ? revealedTestSuites(config, progress) : []),
    [config, progress]
  )
}
