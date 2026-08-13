/**
 * A ratchet on System Design teaching coverage.
 *
 * The corpus has a known, measured gap: four of its twelve levels were authored without retrieval
 * checks and with a fraction of their neighbours' visual budget (see
 * `docs/system-design-curriculum/COUNCIL-AUDIT-2026-08-13.md`). Several large authoring sweeps are
 * going to close it. The purpose of this file is to make sure they only ever close it.
 *
 * ## Why a ratchet and not a floor of zero
 *
 * A gate that is red for six weeks is a gate people learn to ignore, and then it catches nothing on
 * the day it matters. So the pins below are today's actual numbers, which means this file is GREEN
 * the moment it lands. Each authoring batch lowers its pin in the same commit that earns it. The
 * pins may only ever move down. If you are here because a pin needs to go up, the change that made
 * it go up is the bug.
 *
 * ## What it actually catches
 *
 * Two things a content sweep does by accident. First, deleting a check fence while rewriting the
 * prose around it, which is silent: nothing renders differently, the learner just stops being asked.
 * Second, breaking a widget or diagram spec so it no longer parses. `buildSystemDesignCoverage`
 * skips specs that fail to parse, exactly so a broken fence cannot count as coverage a learner does
 * not have, which means a broken fence shows up here as a lesson that lost its check.
 */
import { describe, expect, it } from "vitest"

import { buildSystemDesignCoverage, isBareLesson } from "../coverage"

/**
 * Measured 2026-08-13 by `pnpm audit:sd`. Lower these as batches land; never raise them.
 *
 * - `bareLessons`: no check, no diagram, no simulation. Nothing to answer, nothing to see.
 * - `lessonsWithoutChecks`: 76 of these are the whole of L7, L9, L10 and L11, plus 2 in L6.
 * - `lessonsWithoutDiagramOrSim`: the visual gap, which is corpus-wide and not only in the tail.
 */
const PINS = {
  bareLessons: 44,
  lessonsWithoutChecks: 78,
  lessonsWithoutDiagramOrSim: 105,
} as const

/**
 * A lower bound on total checks, which is the pin that actually catches a deleted check fence.
 *
 * This was added after testing the gate rather than trusting it. The three `PINS` above all count
 * LESSONS, so deleting a check from a lesson that has three of them changes nothing: the lesson
 * still has a check, and every upper bound still holds. Removing a real check fence from `level5.ts`
 * left this file completely green. Counting checks themselves is what closes that hole.
 *
 * Unlike the pins above, this one moves UP as batches land.
 */
const MINIMUM_TOTAL_CHECKS = 343

describe("system design coverage ratchet", () => {
  const coverage = buildSystemDesignCoverage()

  it("walks the real curriculum, so a pin cannot pass vacuously", () => {
    // Every assertion below is an upper bound, so an empty corpus would satisfy all of them.
    expect(coverage.totals.lessonCount).toBe(208)
    expect(coverage.totals.levelCount).toBe(12)
    expect(coverage.totals.checks).toBeGreaterThan(300)
  })

  it("never ships more bare lessons than it has today", () => {
    const bare = coverage.lessons.filter(isBareLesson).map((l) => l.lessonId)
    expect(
      bare.length,
      `bare lessons rose to ${bare.length} (pin ${PINS.bareLessons}). Newly bare: ${bare.join(", ")}`
    ).toBeLessThanOrEqual(PINS.bareLessons)
  })

  it("never loses a retrieval check anywhere in the corpus", () => {
    expect(
      coverage.totals.checks,
      `total checks fell to ${coverage.totals.checks} (floor ${MINIMUM_TOTAL_CHECKS}). A rewrite ` +
        `dropped a check fence, or broke its JSON so it no longer parses.`
    ).toBeGreaterThanOrEqual(MINIMUM_TOTAL_CHECKS)
  })

  it("never ships more checkless lessons than it has today", () => {
    const checkless = coverage.lessons.filter((l) => l.checks === 0).map((l) => l.lessonId)
    expect(
      checkless.length,
      `checkless lessons rose to ${checkless.length} (pin ${PINS.lessonsWithoutChecks}). ` +
        `A rewrite that drops a check fence, or breaks its JSON so it stops parsing, lands here.`
    ).toBeLessThanOrEqual(PINS.lessonsWithoutChecks)
  })

  it("never ships more lessons without a diagram or simulation than it has today", () => {
    expect(coverage.totals.lessonsWithoutDiagramOrSim).toBeLessThanOrEqual(
      PINS.lessonsWithoutDiagramOrSim
    )
  })

  it("keeps every level that has checks today still carrying them", () => {
    // The four levels at zero are the known gap. The other eight are finished work, and a sweep
    // through a neighbouring level must not quietly cost them coverage.
    const finished = coverage.levels.filter(
      (level) => !["7", "9", "10", "11"].includes(String(level.levelId))
    )
    for (const level of finished) {
      expect(
        level.checks,
        `level ${level.levelId} (${level.slug}) lost its checks`
      ).toBeGreaterThan(0)
    }
  })
})
