/**
 * Regression test for the Case Lab progress helper.
 *
 * `computeCaseLabProgress` was extracted out of a zustand selector that returned
 * a fresh object every render, which caused an infinite re-render loop in
 * `MilestoneRail` ("getSnapshot should be cached" → "Maximum update depth
 * exceeded"). Keeping it a pure function lets the reactive hook memoize it.
 */

import { describe, it, expect } from "vitest"
import { computeCaseLabProgress } from "../../stores/case-lab-store"
import type { CaseLabRun, MilestoneStatusMap } from "../types"

const statusMap = (overrides: Partial<MilestoneStatusMap> = {}): MilestoneStatusMap => ({
  clarify: "locked",
  decompose: "locked",
  design: "locked",
  build: "locked",
  review: "locked",
  ...overrides,
})

const runWith = (milestoneStatus: MilestoneStatusMap): CaseLabRun => ({
  id: "run_1",
  userId: "u1",
  caseLabId: "palantir-911-dispatch",
  mode: "practice",
  status: "in_progress",
  currentMilestone: "clarify",
  startedAt: "2026-06-25T12:00:00.000Z",
  updatedAt: "2026-06-25T12:00:00.000Z",
  answers: {},
  milestoneStatus,
})

describe("computeCaseLabProgress", () => {
  it("returns zeroed progress for a null run", () => {
    expect(computeCaseLabProgress(null)).toEqual({ completed: 0, total: 5, percentage: 0 })
  })

  it("counts done milestones and rounds the percentage", () => {
    const run = runWith(statusMap({ clarify: "done", decompose: "done", design: "active" }))
    expect(computeCaseLabProgress(run)).toEqual({ completed: 2, total: 5, percentage: 40 })
  })

  it("reports 100% when every milestone is done", () => {
    const run = runWith(
      statusMap({
        clarify: "done",
        decompose: "done",
        design: "done",
        build: "done",
        review: "done",
      })
    )
    expect(computeCaseLabProgress(run)).toEqual({ completed: 5, total: 5, percentage: 100 })
  })
})
