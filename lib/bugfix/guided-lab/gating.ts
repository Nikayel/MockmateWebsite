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

import type { GuidedLabConfig, GuidedLabMilestone, GuidedLabProgress } from "./types"

import { deriveStatuses, doneSetFrom } from "./progress-state"
export { initialGuidedLabProgress, invalidateFinalVerification } from "./progress-state"

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

/** Apply only the phase active at the start of this run. Reopen the earliest
 * completed coding phase whose contract regressed, including missing suites. */
export function applyTestRunToProgress(
  config: GuidedLabConfig,
  progress: GuidedLabProgress,
  results: SuiteResult[],
  now: string
): GuidedLabProgress {
  const passed = passedSuiteSet(results)
  const done = doneSetFrom(config, progress.milestoneStatus)
  const activeId = config.milestones.find((m) => progress.milestoneStatus[m.id] === "active")?.id
  let regressed = false
  for (const milestone of config.milestones) {
    if (regressed) done.delete(milestone.id)
    if (!done.has(milestone.id) || milestone.gate.kind !== "tests-pass") continue
    if (
      !milestone.gate.testSuites.length ||
      !milestone.gate.testSuites.every((suite) => passed.has(suite))
    ) {
      done.delete(milestone.id)
      regressed = true
    }
  }
  const active = config.milestones.find((m) => m.id === activeId)
  if (
    !regressed &&
    active?.gate.kind === "tests-pass" &&
    active.gate.testSuites.length > 0 &&
    active.gate.testSuites.every((suite) => passed.has(suite))
  ) {
    done.add(active.id)
  }
  return { ...progress, ...deriveStatuses(config, done), updatedAt: now }
}

export function isMilestoneReady(
  milestone: GuidedLabMilestone,
  progress: GuidedLabProgress
): boolean {
  return milestone.blocks.every((block) => {
    if (block.kind === "quiz")
      return progress.quizAnswers.some((answer) => answer.quizId === block.id)
    if (block.kind === "checkpoint")
      return block.items.every((_, index) =>
        progress.checkpointAcks.includes(`${block.id}#${index}`)
      )
    return true
  })
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
  if (progress.milestoneStatus[milestoneId] !== "active" || !isMilestoneReady(milestone, progress))
    return progress

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
