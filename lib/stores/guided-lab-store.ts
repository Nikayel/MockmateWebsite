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
  initialGuidedLabProgress,
  isGuidedLabComplete,
  revealedTestSuites,
  type SuiteResult,
} from "@/lib/bugfix/guided-lab/gating"

const nowIso = () => new Date().toISOString()

interface GuidedLabState {
  scenarioId: string | null
  config: GuidedLabConfig | null
  progress: GuidedLabProgress | null

  /** Load a lab for a scenario, resuming saved progress when provided. */
  initGuidedLab: (
    scenarioId: string,
    config: GuidedLabConfig,
    saved?: GuidedLabProgress | null
  ) => void
  /** Apply a workspace test run; completes any satisfied tests-pass milestones. */
  applyTestResults: (results: SuiteResult[]) => void
  /** Complete a manual-ack milestone. */
  ackMilestone: (milestoneId: string) => void
  answerQuiz: (quizId: string, selectedIndex: number) => void
  ackCheckpoint: (checkpointId: string) => void
  clear: () => void
}

export const useGuidedLabStore = create<GuidedLabState>()(
  devtools(
    (set, get) => ({
      scenarioId: null,
      config: null,
      progress: null,

      initGuidedLab: (scenarioId, config, saved) =>
        set({
          scenarioId,
          config,
          progress:
            saved && saved.version === config.version
              ? saved
              : initialGuidedLabProgress(config, nowIso()),
        }),

      applyTestResults: (results) => {
        const { config, progress } = get()
        if (!config || !progress) return
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

      clear: () => set({ scenarioId: null, config: null, progress: null }),
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

/** True once every milestone is done. */
export const useGuidedLabComplete = (): boolean =>
  useGuidedLabStore((state) =>
    state.config && state.progress ? isGuidedLabComplete(state.config, state.progress) : false
  )

/**
 * Test suites that should be visible in the panel. Memoized on config/progress so
 * the returned array keeps a stable identity (a fresh array from a selector would
 * loop). Empty array means "no guided lab active → show everything".
 */
export const useRevealedTestSuites = (): string[] => {
  const config = useGuidedLabStore((state) => state.config)
  const progress = useGuidedLabStore((state) => state.progress)
  return useMemo(
    () => (config && progress ? revealedTestSuites(config, progress) : []),
    [config, progress]
  )
}
