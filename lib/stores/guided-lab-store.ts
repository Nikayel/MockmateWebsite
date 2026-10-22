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
import { restoreGuidedLabProgress } from "@/lib/bugfix/guided-lab/progress-state"
import { parseGuidedLabProgress } from "@/lib/bugfix/guided-lab/persistence"

import { appendLabEvidence, emptyLabEvidence } from "@/lib/bugfix/guided-lab/assessment/evidence"
import type { LabObservation } from "@/lib/bugfix/guided-lab/assessment/schema"

const nowIso = () => new Date().toISOString()

interface GuidedLabState {
  scenarioId: string | null
  config: GuidedLabConfig | null
  progress: GuidedLabProgress | null
  sourceRevision: number
  captureGeneration: number
  bindAttempt: (scenarioId: string, attemptId: string) => void
  observe: (
    scenarioId: string,
    observation: LabObservation,
    phaseId?: string,
    revision?: number
  ) => void

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
      captureGeneration: 0,

      initGuidedLab: (scenarioId, config, saved) => {
        const parsed = parseGuidedLabProgress(saved)
        set({
          scenarioId,
          config,
          captureGeneration: get().captureGeneration + 1,
          sourceRevision: (parsed?.evidence?.revision ?? -1) + 1,
          progress: restoreGuidedLabProgress(config, parsed, nowIso()),
        })
      },

      bindAttempt: (scenarioId, attemptId) => {
        const { progress, config, scenarioId: activeId } = get()
        if (
          !progress ||
          !config ||
          activeId !== scenarioId ||
          progress.evidence?.attemptId === attemptId
        )
          return
        // A fresh attempt cannot inherit another attempt's evidence or completed phases.
        const next = progress.evidence?.attemptId
          ? restoreGuidedLabProgress(config, null, nowIso())
          : progress
        set({
          progress: { ...next, evidence: { ...emptyLabEvidence(), attemptId } },
          sourceRevision: 0,
          captureGeneration: get().captureGeneration + 1,
        })
      },

      observe: (scenarioId, observation, phaseId, revision) => {
        const { progress, scenarioId: activeId, sourceRevision } = get()
        if (!progress || activeId !== scenarioId) return
        const log = { ...(progress.evidence ?? emptyLabEvidence()), revision: sourceRevision }
        set({
          progress: {
            ...progress,
            evidence: appendLabEvidence(
              log,
              phaseId ?? progress.currentMilestoneId,
              observation,
              revision
            ),
            updatedAt: nowIso(),
          },
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
        const next = applyTestRunToProgress(config, progress, results, nowIso())
        set({ progress: next })
        if (next.currentMilestoneId !== progress.currentMilestoneId) {
          const from = config.milestones.findIndex((m) => m.id === progress.currentMilestoneId)
          const to = config.milestones.findIndex((m) => m.id === next.currentMilestoneId)
          get().observe(
            get().scenarioId!,
            {
              kind: "transition",
              toPhaseId: next.currentMilestoneId,
              reason: to < from ? "regression" : "advance",
            },
            progress.currentMilestoneId
          )
        }
      },

      ackMilestone: (milestoneId) => {
        const { config, progress } = get()
        if (!config || !progress) return
        const next = acknowledgeMilestone(config, progress, milestoneId, nowIso())
        set({ progress: next })
        if (next.currentMilestoneId !== progress.currentMilestoneId)
          get().observe(
            get().scenarioId!,
            { kind: "transition", toPhaseId: next.currentMilestoneId, reason: "advance" },
            milestoneId
          )
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
          progress: {
            ...invalidateFinalVerification(config, progress, nowIso()),
            evidence: {
              ...(progress.evidence ?? emptyLabEvidence()),
              revision: get().sourceRevision + 1,
            },
          },
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

/** Never attach another attempt's local evidence to a checkpoint or submission. */
export function getGuidedAttemptProgress(scenarioId: string, attemptId: string | null) {
  const state = useGuidedLabStore.getState()
  return state.scenarioId === scenarioId && state.progress?.evidence?.attemptId === attemptId
    ? state.progress
    : undefined
}
