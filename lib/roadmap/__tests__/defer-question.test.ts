/**
 * Tests for the roadmap "do later" (defer / reschedule) rules.
 *
 * Defer MOVES a question to a later day and resets it to "pending" (not a
 * "deferred" status), so counts stay honest and the persisted shape is
 * unchanged.
 */

import { describe, it, expect } from "vitest"
import {
  deferQuestionInPlans,
  selectDeferTargetIndex,
  MAX_QUESTIONS_PER_DAY,
} from "../defer-question"
import { computeCompletionCounts } from "../roadmap-progress"

const NOW = new Date(Date.UTC(2026, 0, 10, 12, 0, 0)) // "today" == day 0

interface TestQuestion {
  scenarioId: string
  title: string
  status: string
  estimatedMinutes: number
  difficulty: string
  completedAt?: unknown
  score?: unknown
}

function q(id: string, status = "pending", extra: Partial<TestQuestion> = {}): TestQuestion {
  return {
    scenarioId: id,
    title: id.toUpperCase(),
    status,
    estimatedMinutes: 30,
    difficulty: "medium",
    ...extra,
  }
}

function plan(dayNumber: number, offsetDays: number, questions: TestQuestion[]) {
  return {
    dayNumber,
    date: new Date(Date.UTC(2026, 0, 10 + offsetDays, 12, 0, 0)),
    theme: `Day ${dayNumber}`,
    questions,
  }
}

function fill(n: number, prefix: string): TestQuestion[] {
  return Array.from({ length: n }, (_, i) => q(`${prefix}-${i}`))
}

describe("deferQuestionInPlans", () => {
  it("moves the question to the nearest later day and resets it to pending", () => {
    const plans = [plan(1, 0, [q("a"), q("b")]), plan(2, 1, [q("c")]), plan(3, 2, [])]
    const res = deferQuestionInPlans(plans, "a", NOW)

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.sourceDayIndex).toBe(0)
    expect(res.targetDayIndex).toBe(1)
    expect(res.movedTitle).toBe("A")

    const source = res.updatedPlans[0].questions.map((x) => x.scenarioId)
    const target = res.updatedPlans[1].questions
    expect(source).toEqual(["b"])
    expect(target.map((x) => x.scenarioId)).toContain("a")
    expect(target.find((x) => x.scenarioId === "a")?.status).toBe("pending")

    // Total question count is invariant across a move.
    const total = res.updatedPlans.flatMap((p) => p.questions).length
    expect(total).toBe(3)
  })

  it("drops completedAt and score when moving a completed question", () => {
    const plans = [
      plan(1, 0, [q("a", "completed", { completedAt: new Date(), score: 92 })]),
      plan(2, 1, []),
    ]
    const res = deferQuestionInPlans(plans, "a", NOW)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const moved = res.updatedPlans[1].questions.find((x) => x.scenarioId === "a")!
    expect(moved.status).toBe("pending")
    expect(moved).not.toHaveProperty("completedAt")
    expect(moved).not.toHaveProperty("score")
  })

  it("blocks with no_later_day when the question is on the last day", () => {
    const plans = [plan(1, 0, [q("a")]), plan(2, 1, [q("b")])]
    const res = deferQuestionInPlans(plans, "b", NOW)
    expect(res).toEqual({ ok: false, reason: "no_later_day" })
  })

  it("returns not_found for an unknown scenario", () => {
    const plans = [plan(1, 0, [q("a")]), plan(2, 1, [])]
    const res = deferQuestionInPlans(plans, "ghost", NOW)
    expect(res).toEqual({ ok: false, reason: "not_found" })
  })

  it("keeps completion counts consistent (deferring a completed item decrements completed)", () => {
    const plans = [
      plan(1, 0, [q("a", "completed", { score: 80 }), q("b", "skipped")]),
      plan(2, 1, []),
    ]
    expect(computeCompletionCounts(plans)).toEqual({ questionsCompleted: 1, questionsSkipped: 1 })

    const res = deferQuestionInPlans(plans, "a", NOW)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(computeCompletionCounts(res.updatedPlans)).toEqual({
      questionsCompleted: 0,
      questionsSkipped: 1,
    })
  })
})

describe("selectDeferTargetIndex", () => {
  it("never targets a day at or before max(sourceIndex, today)", () => {
    const plans = [plan(1, 0, []), plan(2, 1, []), plan(3, 2, []), plan(4, 3, [])]
    // Source is a future day (index 2); target must be strictly after it.
    expect(selectDeferTargetIndex(plans, 2, NOW)).toBe(3)
  })

  it("skips a full later day in favor of a later day with capacity", () => {
    const plans = [
      plan(1, 0, [q("a")]),
      plan(2, 1, fill(MAX_QUESTIONS_PER_DAY, "x")), // full
      plan(3, 2, []),
    ]
    expect(selectDeferTargetIndex(plans, 0, NOW)).toBe(2)
  })

  it("falls back to the least-loaded later day when all later days are full", () => {
    const plans = [
      plan(1, 0, [q("a")]),
      plan(2, 1, fill(MAX_QUESTIONS_PER_DAY + 1, "x")), // 7
      plan(3, 2, fill(MAX_QUESTIONS_PER_DAY, "y")), // 6
    ]
    expect(selectDeferTargetIndex(plans, 0, NOW)).toBe(2)
  })

  it("returns null when there is no later day", () => {
    const plans = [plan(1, 0, [q("a")])]
    expect(selectDeferTargetIndex(plans, 0, NOW)).toBeNull()
  })
})
