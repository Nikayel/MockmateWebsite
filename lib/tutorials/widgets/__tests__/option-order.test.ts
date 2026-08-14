/**
 * The positional tell, and the permutation that removes it.
 *
 * ## How this was found, which is the part worth remembering
 *
 * It was not found by the council audit, the curriculum backlog, or the gate written to drive the
 * answer-shape sweep. All three were looking at label LENGTH. It was found by an adversarial
 * verifier reading a finished level file and asking what else a learner could exploit, which is the
 * whole argument for pointing a verifier at the result rather than at the plan.
 *
 * Measured over 386 authored predict checks on 2026-08-13, in AUTHORED order:
 *
 * | Level | Best "always click position N" strategy |
 * | --- | --- |
 * | L10 | 100 percent (correct is option 1 in all 67) |
 * | L11 | 100 percent (always option 2) |
 * | L6 | 97 percent |
 * | L7 | 90 percent |
 * | corpus | 58 percent |
 *
 * Chance is near 33 percent. The length tell the entire CUR-01 ticket was written about paid 80
 * percent at its worst; this paid 100 percent on the two levels with the most search traffic, and
 * it cost nothing to exploit because it needs no reading at all.
 *
 * ## What is asserted here
 *
 * Two different things, and the distinction matters:
 *
 *  1. The permutation is a PURE FUNCTION of the check's text. `content-integrity.test.ts` renders
 *     every authored fence twice and asserts byte-identical HTML, so any nondeterminism here fails
 *     1,600 tests at once. It also has to be stable for the learner: a list that reshuffles on
 *     re-render moves the answer out from under someone mid-read.
 *  2. Over the real corpus, no position is a winning strategy any more.
 *
 * The second is the one that decays, because new checks arrive continuously. It is pinned as a
 * ratio rather than a count for that reason.
 */
import { describe, expect, it } from "vitest"

import { optionOrder, orderedOptions } from "../option-order"
import { parseWidgetSpec } from "../schema"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"

interface Rendered {
  levelId: number
  lessonId: string
  /** Where the correct option lands AFTER permutation, which is what the learner sees. */
  renderedIndex: number
  optionCount: number
}

function collect(): Rendered[] {
  const rows: Rendered[] = []
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        for (const source of extractCsWidgetSources(lesson.teach.markdown)) {
          const parsed = parseWidgetSpec(source)
          if (!parsed.ok) continue
          const spec = parsed.spec
          if (spec.type !== "check" || spec.kind !== "predict" || !spec.options) continue
          const ordered = orderedOptions(spec.prompt, spec.options)
          const renderedIndex = ordered.findIndex((o) => o.option.correct === true)
          if (renderedIndex === -1) continue
          rows.push({
            levelId: level.id as number,
            lessonId: lesson.id,
            renderedIndex,
            optionCount: spec.options.length,
          })
        }
      }
    }
  }
  return rows
}

const RENDERED = collect()

/** Best "always click position N" rate over a set of checks. */
function bestPositionRate(rows: Rendered[]): number {
  if (rows.length === 0) return 0
  const histogram = new Map<number, number>()
  for (const row of rows)
    histogram.set(row.renderedIndex, (histogram.get(row.renderedIndex) ?? 0) + 1)
  return Math.max(...histogram.values()) / rows.length
}

describe("the option permutation is deterministic", () => {
  it("returns the same order for the same seed, every time", () => {
    // The property `content-integrity.test.ts` depends on across 1,459 render assertions.
    for (let count = 2; count <= 5; count++) {
      const first = optionOrder("a stable seed", count)
      for (let repeat = 0; repeat < 50; repeat++) {
        expect(optionOrder("a stable seed", count)).toEqual(first)
      }
    }
  })

  it("returns a real permutation, losing and duplicating nothing", () => {
    for (let count = 2; count <= 5; count++) {
      const order = optionOrder(`seed-${count}`, count)
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i))
    }
  })

  it("gives different checks different orders", () => {
    // A permutation that ignored its seed would be deterministic and useless: every check would
    // get the same reordering and the corpus-wide bias would simply move to a new position.
    const orders = new Set(
      Array.from({ length: 40 }, (_, i) => optionOrder(`check number ${i}`, 3).join(","))
    )
    expect(orders.size).toBeGreaterThan(2)
  })

  it("keeps the authored index attached to each option, for telemetry", () => {
    // `learn_item_responses.selectedIndex` must keep meaning the AUTHORED position. Indices that
    // meant "wherever this happened to render" would be unjoinable across a label edit.
    const options = [{ label: "a" }, { label: "b" }, { label: "c" }]
    const ordered = orderedOptions("prompt", options)
    for (const { option, authoredIndex } of ordered) {
      expect(options[authoredIndex]).toBe(option)
    }
  })
})

describe("no position is a winning strategy on the real corpus", () => {
  it("walks a real corpus, so the rates below are measured", () => {
    expect(RENDERED.length).toBeGreaterThan(300)
    expect(new Set(RENDERED.map((r) => r.levelId)).size).toBe(12)
  })

  it("keeps the corpus-wide best position strategy near chance", () => {
    // Authored order paid 58 percent corpus-wide. Chance for a mostly-three-option corpus is
    // near 33 percent, and the permutation brings it to roughly 35.
    const rate = bestPositionRate(RENDERED)
    expect(
      rate,
      `best blind position strategy pays ${(rate * 100).toFixed(1)}% corpus-wide`
    ).toBeLessThanOrEqual(0.42)
  })

  it("leaves no LEVEL exploitable by position", () => {
    // The corpus figure alone would hide the real defect: it was 58 percent corpus-wide while
    // being 100 percent on L10 and L11. A learner works through one level at a time, so the
    // per-level rate is the one that describes their experience.
    const offenders: string[] = []
    for (const levelId of new Set(RENDERED.map((r) => r.levelId))) {
      const rows = RENDERED.filter((r) => r.levelId === levelId)
      const rate = bestPositionRate(rows)
      if (rate > 0.6) {
        offenders.push(`level ${levelId}: ${(rate * 100).toFixed(0)}% over ${rows.length} checks`)
      }
    }
    expect(offenders).toEqual([])
  })
})
