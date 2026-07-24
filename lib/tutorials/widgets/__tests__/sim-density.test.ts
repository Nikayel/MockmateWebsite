/**
 * Cognitive-load density cap from the SD interactivity plan: a lesson may carry at
 * most ONE simulation or animated diagram (topology/ladder); retrieval checks and
 * static diagrams (table/er) are exempt. Raw-file sweeps get this wrong because the
 * level files keep teach markdown in top-level consts far from the lesson ids, so
 * this gate walks the RESOLVED curriculum the same way the renderer does.
 */
import { describe, it, expect } from "vitest"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { extractCsDiagramSources, extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseWidgetSpec } from "../schema"
import { parseDiagramSpec } from "@/lib/tutorials/diagrams/schema"

/** Every interactive/animated family that counts against the one-per-lesson cap. */
const SIM_TYPES = new Set([
  "calc",
  "hash-ring",
  "sequence",
  "rate-limiter",
  "quorum",
  "cache-sim",
  "queue-sim",
  "partition-sim",
  "replication-lag",
  "watermark-sim",
])
const ANIMATED_DIAGRAM_TYPES = new Set(["topology", "ladder"])

interface LessonLoad {
  lessonId: string
  heavy: string[] // sim + animated types present (the capped set)
  checks: number
}

function collectLoads(): LessonLoad[] {
  const loads: LessonLoad[] = []
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const heavy: string[] = []
        let checks = 0
        for (const source of extractCsWidgetSources(lesson.teach.markdown)) {
          const parsed = parseWidgetSpec(source)
          if (!parsed.ok) continue // parse failures are content-integrity's job
          if (SIM_TYPES.has(parsed.spec.type)) heavy.push(parsed.spec.type)
          if (parsed.spec.type === "check") checks += 1
        }
        for (const source of extractCsDiagramSources(lesson.teach.markdown)) {
          const parsed = parseDiagramSpec(source)
          if (parsed.ok && ANIMATED_DIAGRAM_TYPES.has(parsed.spec.type)) {
            heavy.push(parsed.spec.type)
          }
        }
        loads.push({ lessonId: lesson.id, heavy, checks })
      }
    }
  }
  return loads
}

describe("SD interactivity density cap", () => {
  const loads = collectLoads()

  it("walks a real curriculum (guard against vacuous passes)", () => {
    expect(loads.length).toBeGreaterThan(200)
    const sims = loads.reduce((n, l) => n + l.heavy.length, 0)
    expect(sims).toBeGreaterThan(60) // 58 sims through It9 + It10 configs + animated diagrams
  })

  it("no lesson exceeds one sim or animated diagram", () => {
    const violations = loads
      .filter((l) => l.heavy.length > 1)
      .map((l) => `${l.lessonId}: [${l.heavy.join(", ")}]`)
    expect(violations).toEqual([])
  })

  it("iteration-10 config placements are live, one each", () => {
    const expected: Record<string, string> = {
      "sd-l1-resilience-primitives": "sequence",
      "sd-l1-load-balancing": "sequence",
      "sd-l2-keys-ids-constraints": "sequence",
      "sd-l3-geospatial-indexing": "calc",
      "sd-l4-cell-shuffle-sharding": "calc",
      "sd-l6-consumer-groups": "sequence",
      "sd-l7-blast-radius-cells": "calc",
      "sd-l7-circuit-breakers": "sequence",
      "sd-l10-ride-sharing": "calc",
    }
    for (const [lessonId, type] of Object.entries(expected)) {
      const load = loads.find((l) => l.lessonId === lessonId)
      expect(load, lessonId).toBeDefined()
      expect(load?.heavy, lessonId).toEqual([type])
    }
  })
})
