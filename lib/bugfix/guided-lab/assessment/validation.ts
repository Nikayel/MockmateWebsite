import type { GuidedLabConfig } from "../types"
import type { LabEvidence } from "./schema"

export function evidenceMatchesLab(
  log: LabEvidence,
  config: GuidedLabConfig,
  attemptId: unknown,
  editablePaths: string[]
): boolean {
  const phases = new Set(config.milestones.map((p) => p.id))
  return (
    log.attemptId === attemptId &&
    log.events.every(
      (event) =>
        phases.has(event.phaseId) &&
        event.revision <= log.revision &&
        (event.kind !== "transition" || phases.has(event.toPhaseId)) &&
        (event.kind !== "checkpoint" || event.patches.every((p) => editablePaths.includes(p.path)))
    )
  )
}
