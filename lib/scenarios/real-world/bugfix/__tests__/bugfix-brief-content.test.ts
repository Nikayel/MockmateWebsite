// @vitest-environment node
/**
 * Content gate for the redesigned bug-fix brief.
 *
 * The brief is the first thing a candidate reads, so its two new fields carry
 * real risk:
 *   - `task` must be ONE imperative sentence. The whole point of lifting it out of
 *     problemStatement was to stop the brief from being a wall of prose.
 *   - `symptom` must be symptom-level. `bugDescription` and `groundTruth` name the
 *     root cause outright, and locating it is the assessment — leaking either into
 *     the brief hands over the answer.
 */
import { describe, expect, it } from "vitest"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import { bugfixPackScenarios } from "../packs"
import type { BugFixScenario } from "@/lib/scenarios/types"

const allBugfix: BugFixScenario[] = [...realWorldBugFixScenarios, ...bugfixPackScenarios]

/** Words that would give away the cause rather than describe the effect. */
const CAUSE_WORDS = /\b(because|root cause|the bug is|caused by|due to a|fix:)\b/i

describe("bug-fix brief content", () => {
  it("covers every registered bug-fix scenario", () => {
    expect(allBugfix.length).toBeGreaterThan(0)
  })

  for (const scenario of allBugfix) {
    describe(scenario.id, () => {
      it("states the task as one imperative sentence", () => {
        if (!scenario.task) return // Not yet authored; the brief falls back.

        const task = scenario.task
        expect(task.trim().length).toBeGreaterThan(0)
        expect(task.trim()).toMatch(/[.!]$/)
        // One sentence: no interior sentence break.
        expect(task.trim().slice(0, -1)).not.toMatch(/[.!?]\s+[A-Z]/)
        expect(task.length).toBeLessThanOrEqual(180)
      })

      it("keeps the task and symptom free of the root cause", () => {
        const surfaces = [
          scenario.task ?? "",
          scenario.symptom?.caveat ?? "",
          scenario.symptom?.subject ?? "",
          scenario.symptom?.tag ?? "",
        ]
        for (const text of surfaces) {
          expect(text).not.toMatch(CAUSE_WORDS)
        }
      })

      it("never reuses bugDescription or groundTruth verbatim in the brief", () => {
        if (!scenario.task) return

        const leaks = [scenario.bugDescription, scenario.groundTruth].filter(Boolean) as string[]
        for (const leak of leaks) {
          expect(scenario.task!.toLowerCase()).not.toContain(leak.toLowerCase())
        }
      })

      it("states the symptom as a real expected/actual pair", () => {
        if (!scenario.symptom) return

        const { expected, actual, subject } = scenario.symptom
        expect(subject.trim().length).toBeGreaterThan(0)
        expect(expected.trim().length).toBeGreaterThan(0)
        expect(actual.trim().length).toBeGreaterThan(0)
        // A symptom whose two values match describes no bug at all.
        expect(expected).not.toBe(actual)
      })
    })
  }
})
