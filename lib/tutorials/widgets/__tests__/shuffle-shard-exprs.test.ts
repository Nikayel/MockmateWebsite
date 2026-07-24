/**
 * Iteration-10 exit gate: the shuffle-shard overlap probabilities are EXACT math
 * (k of n workers fully shared by another tenant = k!(n-k)!/n! = 1/C(n,k)), authored
 * as calc-fence expressions rather than a bespoke widget. This test extracts the LIVE
 * fences from the curriculum and replays their exprs through the real grammar, pinning
 * every number the worked examples narrate. If someone edits a fence formula or the
 * expr grammar's semantics drift, the narrated 1-in-28 / 1-in-56 story breaks HERE,
 * not silently in front of a learner.
 */
import { describe, it, expect } from "vitest"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseWidgetSpec, type CalcSpec } from "@/lib/tutorials/widgets/schema"
import { parseExpr, evaluateExpr } from "../expr"

function liveCalcSpec(lessonId: string): CalcSpec {
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        if (lesson.id !== lessonId) continue
        const sources = extractCsWidgetSources(lesson.teach.markdown)
        for (const source of sources) {
          const parsed = parseWidgetSpec(source)
          if (parsed.ok && parsed.spec.type === "calc") return parsed.spec
        }
        throw new Error(`${lessonId} has no valid calc fence`)
      }
    }
  }
  throw new Error(`lesson ${lessonId} not found`)
}

function evaluate(spec: CalcSpec, env: Record<string, number>): Record<string, number> {
  const scope: Record<string, number> = { ...env }
  for (const output of spec.outputs) {
    const parsed = parseExpr(output.expr)
    if (!parsed.ok) throw new Error(`${output.id}: ${parsed.error}`)
    scope[output.id] = evaluateExpr(parsed.ast, scope)
  }
  return scope
}

describe("shuffle-shard overlap probability (live curriculum fences)", () => {
  it("k=2 (sd-l4-cell-shuffle-sharding) matches 1/C(n,2) at every narrated point", () => {
    const spec = liveCalcSpec("sd-l4-cell-shuffle-sharding")

    // The worked example's opening numbers: 8 workers, 1000 tenants.
    const base = evaluate(spec, { n: 8, customers: 1000 })
    expect(base.pairProb).toBeCloseTo(1 / 28, 12) // 28 = C(8,2), "about 3.6 percent"
    expect(base.expectedFullOverlap).toBeCloseTo(1000 / 28, 9) // "roughly 36 tenants"

    // The predict prompt's reveal: doubling the pool drops it ~4x, 1/28 -> 1/120.
    const doubled = evaluate(spec, { n: 16, customers: 1000 })
    expect(doubled.pairProb).toBeCloseTo(1 / 120, 12) // 120 = C(16,2)

    // The worked example's closing slide: n=32 gives 1/496, "roughly 2 of 1000".
    const wide = evaluate(spec, { n: 32, customers: 1000 })
    expect(wide.pairProb).toBeCloseTo(1 / 496, 12) // 496 = C(32,2)
    expect(Math.round(wide.expectedFullOverlap)).toBe(2)

    // Exactness across the whole slider range, not just narrated points.
    for (let n = 4; n <= 32; n++) {
      const combos = (n * (n - 1)) / 2
      expect(evaluate(spec, { n, customers: 1 }).pairProb).toBeCloseTo(1 / combos, 12)
    }
  })

  it("k=3 (sd-l7-blast-radius-cells) matches 1/C(n,3) at every narrated point", () => {
    const spec = liveCalcSpec("sd-l7-blast-radius-cells")

    // Worked example: 8 workers, 3 picks -> 56 combos, ~1.8%, ~18 of 1000.
    const base = evaluate(spec, { n: 8, customers: 1000 })
    expect(base.comboProb).toBeCloseTo(1 / 56, 12) // 56 = C(8,3)
    expect(Math.round(base.expectedFullOverlap)).toBe(18)

    // Worked example's slide to 16 workers: 1/560, "roughly 2 of 1000".
    const wide = evaluate(spec, { n: 16, customers: 1000 })
    expect(wide.comboProb).toBeCloseTo(1 / 560, 12) // 560 = C(16,3)
    expect(Math.round(wide.expectedFullOverlap)).toBe(2)

    // The predict reveal: same pool, 3 picks instead of 2 HALVES full overlap (28 -> 56).
    const k2 = evaluate(liveCalcSpec("sd-l4-cell-shuffle-sharding"), { n: 8, customers: 1 })
    expect(base.comboProb).toBeCloseTo(k2.pairProb / 2, 12)

    // Exact 1/C(n,3) across the slider range (min slider value 4 keeps n-2 > 1).
    for (let n = 4; n <= 32; n++) {
      const combos = (n * (n - 1) * (n - 2)) / 6
      expect(evaluate(spec, { n, customers: 1 }).comboProb).toBeCloseTo(1 / combos, 12)
    }
  })
})
