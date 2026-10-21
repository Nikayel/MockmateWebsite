import type { GuidedLabConfig, GuidedLabProgress, GuidedLabMilestoneStatus } from "./types"

interface DerivedStatuses {
  milestoneStatus: Record<string, GuidedLabMilestoneStatus>
  currentMilestoneId: string
  activeBugId?: string
}

export function deriveStatuses(config: GuidedLabConfig, done: Set<string>): DerivedStatuses {
  const milestoneStatus: Record<string, GuidedLabMilestoneStatus> = {}
  let currentMilestoneId = config.milestones[0]?.id ?? ""
  let activeBugId: string | undefined
  let activeAssigned = false

  config.milestones.forEach((milestone, index) => {
    if (done.has(milestone.id)) {
      milestoneStatus[milestone.id] = "done"
      return
    }
    const prevDone = index === 0 || done.has(config.milestones[index - 1].id)
    const depsDone = (milestone.dependsOn ?? []).every((dep) => done.has(dep))
    if (!activeAssigned && prevDone && depsDone) {
      milestoneStatus[milestone.id] = "active"
      currentMilestoneId = milestone.id
      activeBugId = milestone.bugId
      activeAssigned = true
    } else {
      milestoneStatus[milestone.id] = "locked"
    }
  })

  // Whole lab done → keep the last milestone as the focused one.
  if (!activeAssigned && config.milestones.length > 0) {
    currentMilestoneId = config.milestones[config.milestones.length - 1].id
  }

  return { milestoneStatus, currentMilestoneId, activeBugId }
}

export function doneSetFrom(
  config: GuidedLabConfig,
  status: Record<string, GuidedLabMilestoneStatus>
): Set<string> {
  return new Set(config.milestones.filter((m) => status[m.id] === "done").map((m) => m.id))
}

export function initialGuidedLabProgress(config: GuidedLabConfig, now: string): GuidedLabProgress {
  const derived = deriveStatuses(config, new Set())
  return {
    version: config.version,
    currentMilestoneId: derived.currentMilestoneId,
    milestoneStatus: derived.milestoneStatus,
    activeBugId: derived.activeBugId,
    quizAnswers: [],
    checkpointAcks: [],
    updatedAt: now,
  }
}

/** Editing or resuming a lab always requires a new final verification run. */
export function invalidateFinalVerification(
  config: GuidedLabConfig,
  progress: GuidedLabProgress,
  now: string
): GuidedLabProgress {
  const done = doneSetFrom(config, progress.milestoneStatus)
  if (!config.verificationMilestoneId || !done.has(config.verificationMilestoneId)) return progress
  done.delete(config.verificationMilestoneId)
  return { ...progress, ...deriveStatuses(config, done), updatedAt: now }
}

/** Reject stale or internally inconsistent storage instead of stranding the rail. */
export function restoreGuidedLabProgress(
  config: GuidedLabConfig,
  saved: GuidedLabProgress | null,
  now: string
): GuidedLabProgress {
  if (!saved || saved.version !== config.version) return initialGuidedLabProgress(config, now)
  let unfinished = false
  for (const milestone of config.milestones) {
    const status = saved.milestoneStatus[milestone.id]
    if (!status || (unfinished && status === "done")) return initialGuidedLabProgress(config, now)
    if (status !== "done") unfinished = true
  }
  const expected = deriveStatuses(config, doneSetFrom(config, saved.milestoneStatus))
  if (
    expected.currentMilestoneId !== saved.currentMilestoneId ||
    config.milestones.some((m) => expected.milestoneStatus[m.id] !== saved.milestoneStatus[m.id])
  ) {
    return initialGuidedLabProgress(config, now)
  }
  return invalidateFinalVerification(config, { ...saved, ...expected }, now)
}
