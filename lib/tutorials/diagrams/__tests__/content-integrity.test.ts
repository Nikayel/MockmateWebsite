/**
 * Every authored csdiagram in the SHIPPED curriculum must parse. This walks all
 * Python + SQL lessons, extracts each ```csdiagram fence from teach.markdown, and
 * asserts it validates — so a typo in a diagram spec fails CI, not silently in a
 * learner's face. This test grows automatically as lessons gain diagrams.
 */
import { describe, it, expect } from "vitest"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { SQL_LEVELS } from "@/lib/tutorials/sql/curriculum"
import { parseDiagramSpec } from "../schema"
import { extractCsDiagramSources } from "../extract"

interface FenceRef {
  lessonId: string
  source: string
}

function collectFences(): FenceRef[] {
  const refs: FenceRef[] = []
  const levels = [...PYTHON_LEVELS, ...SQL_LEVELS]
  for (const level of levels) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        for (const source of extractCsDiagramSources(lesson.teach.markdown)) {
          refs.push({ lessonId: lesson.id, source })
        }
      }
    }
  }
  return refs
}

const fences = collectFences()

describe("authored csdiagram content", () => {
  it("finds diagrams in the curriculum (guards the extractor itself)", () => {
    expect(fences.length).toBeGreaterThan(0)
  })

  it.each(fences)("$lessonId → diagram parses", ({ source }) => {
    const result = parseDiagramSpec(source)
    if (!result.ok) throw new Error(result.error)
    expect(result.ok).toBe(true)
  })
})
