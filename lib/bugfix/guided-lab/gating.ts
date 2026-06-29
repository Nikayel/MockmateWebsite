/**
 * Pure gating logic for the guided bug-fix lab.
 *
 * Milestones unlock in array order. A milestone becomes `active` only once the
 * previous milestone is `done` and all of its own `dependsOn` are `done`. A
 * `tests-pass` milestone is completed when every test suite it requires is green
 * in the latest run; a `manual-ack` milestone is completed by an explicit ack.
 *
 * Kept free of React/Zustand so it can be unit-tested in isolation and reused by
 * the store.
 */

import type {
  GuidedLabConfig,
  GuidedLabMilestone,
  GuidedLabMilestoneStatus,
  GuidedLabProgress,
} from "./types"

export interface SuiteResult {
  suite: string
  passed: boolean
}

/** Suites where every reported test passed. */
export function passedSuiteSet(results: SuiteResult[]): Set<string> {
  const bySuite = new Map<string, boolean>()
  for (const result of results) {
    const prior = bySuite.get(result.suite)
    bySuite.set(result.suite, (prior ?? true) && result.passed)
  }
  return new Set(
    Array.from(bySuite.entries())
      .filter(([, ok]) => ok)
      .map(([suite]) => suite)
  )
}

interface DerivedStatuses {
  milestoneStatus: Record<string, GuidedLabMilestoneStatus>
  currentMilestoneId: string
  activeBugId?: string
}

function deriveStatuses(config: GuidedLabConfig, done: Set<string>): DerivedStatuses {
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

function doneSetFrom(
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

/** Recompute progress after a test run: completes any `tests-pass` milestone
 * whose required suites are now all green, then unlocks dependents. Monotonic —
 * a milestone that was `done` stays `done`. */
export function applyTestRunToProgress(
  config: GuidedLabConfig,
  progress: GuidedLabProgress,
  results: SuiteResult[],
  now: string
): GuidedLabProgress {
  const passed = passedSuiteSet(results)
  const done = doneSetFrom(config, progress.milestoneStatus)

  for (const milestone of config.milestones) {
    if (done.has(milestone.id)) continue
    if (milestone.gate.kind !== "tests-pass") continue
    if (milestone.gate.testSuites.every((suite) => passed.has(suite))) {
      done.add(milestone.id)
    }
  }

  const derived = deriveStatuses(config, done)
  return {
    ...progress,
    currentMilestoneId: derived.currentMilestoneId,
    milestoneStatus: derived.milestoneStatus,
    activeBugId: derived.activeBugId,
    updatedAt: now,
  }
}

/** Complete a `manual-ack` milestone (no-op for `tests-pass` milestones). */
export function acknowledgeMilestone(
  config: GuidedLabConfig,
  progress: GuidedLabProgress,
  milestoneId: string,
  now: string
): GuidedLabProgress {
  const milestone = config.milestones.find((m) => m.id === milestoneId)
  if (!milestone || milestone.gate.kind !== "manual-ack") return progress
  if (progress.milestoneStatus[milestoneId] !== "active") return progress

  const done = doneSetFrom(config, progress.milestoneStatus)
  done.add(milestoneId)
  const derived = deriveStatuses(config, done)
  return {
    ...progress,
    currentMilestoneId: derived.currentMilestoneId,
    milestoneStatus: derived.milestoneStatus,
    activeBugId: derived.activeBugId,
    updatedAt: now,
  }
}

/** Test suites that should be visible in the panel: those owned by milestones
 * that are `active` or `done`. Keeps a later bug's tests hidden until unlocked. */
export function revealedTestSuites(config: GuidedLabConfig, progress: GuidedLabProgress): string[] {
  const revealed = new Set<string>()
  for (const milestone of config.milestones) {
    const status = progress.milestoneStatus[milestone.id]
    if (status === "active" || status === "done") {
      for (const suite of milestone.revealTestSuites ?? []) revealed.add(suite)
    }
  }
  return Array.from(revealed)
}

export function isGuidedLabComplete(config: GuidedLabConfig, progress: GuidedLabProgress): boolean {
  return config.milestones.every((m) => progress.milestoneStatus[m.id] === "done")
}

export function findMilestone(
  config: GuidedLabConfig,
  milestoneId: string
): GuidedLabMilestone | undefined {
  return config.milestones.find((m) => m.id === milestoneId)
}
