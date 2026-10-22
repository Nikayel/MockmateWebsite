import { getScenarioById } from "@/lib/scenarios"
import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"
import type { GuidedLabProgress } from "../types"

export function restoreLabAttempt(
  scenarioId: string,
  attemptId: string,
  saved?: GuidedLabProgress | null
) {
  const scenario = getScenarioById(scenarioId)
  if (
    scenario?.type !== "bugfix" ||
    !scenario.guidedLab ||
    !saved ||
    saved.evidence?.attemptId !== attemptId
  )
    return
  useGuidedLabStore.getState().initGuidedLab(scenarioId, scenario.guidedLab, saved)
  useGuidedLabStore.getState().observe(scenarioId, {
    kind: "transition",
    reason: "resume",
    toPhaseId: saved.currentMilestoneId,
  })
}
