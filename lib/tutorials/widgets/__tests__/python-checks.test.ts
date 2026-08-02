/**
 * Content guard for the retrieval checks authored into the Python curriculum.
 *
 * The `check` widget validates at PARSE time, which means a malformed fence surfaces as
 * an inline error box in a live lesson rather than as a build failure. That is the right
 * runtime behavior and the wrong authoring feedback loop, so this gate parses every fence
 * in the resolved Python tree the way the renderer does and fails the suite instead.
 *
 * It also pins the authoring rules that a schema cannot express: checks must carry an
 * explicit stable id (the whole point of adding the field), ids must be unique within a
 * lesson so two checks cannot pool their responses, wrong options must actually explain
 * why they are tempting rather than just saying "no", and a lesson must not be buried
 * under so many checks that the teach stops reading as prose.
 */
import { describe, it, expect } from "vitest"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { extractCsWidgetSources } from "@/lib/tutorials/diagrams/extract"
import { parseWidgetSpec, type CheckSpec } from "../schema"

/** Above this a teach section reads as a quiz with prose attached, not a lesson. */
const MAX_CHECKS_PER_LESSON = 5

/** Feedback shorter than this is a verdict, not an explanation. */
const MIN_FEEDBACK_CHARS = 40

interface AuthoredCheck {
  lessonId: string
  spec: CheckSpec
}

function collectChecks(): { checks: AuthoredCheck[]; perLesson: Map<string, number> } {
  const checks: AuthoredCheck[] = []
  const perLesson = new Map<string, number>()

  for (const level of PYTHON_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const sources = extractCsWidgetSources(lesson.teach.markdown)
        let count = 0
        for (const source of sources) {
          const parsed = parseWidgetSpec(source)
          // Parse failures are reported by their own test below with the real message.
          if (!parsed.ok || parsed.spec.type !== "check") continue
          checks.push({ lessonId: lesson.id, spec: parsed.spec })
          count += 1
        }
        if (count > 0) perLesson.set(lesson.id, count)
      }
    }
  }
  return { checks, perLesson }
}

describe("Python curriculum checks", () => {
  it("every cswidget fence parses", () => {
    const failures: string[] = []
    for (const level of PYTHON_LEVELS) {
      for (const mod of level.modules) {
        for (const lesson of mod.lessons) {
          for (const source of extractCsWidgetSources(lesson.teach.markdown)) {
            const parsed = parseWidgetSpec(source)
            if (!parsed.ok) failures.push(`${lesson.id}: ${parsed.error}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("every check carries an explicit stable id", () => {
    const { checks } = collectChecks()
    const missing = checks
      .filter(({ spec }) => !spec.id)
      .map(({ lessonId, spec }) => `${lessonId}: "${spec.prompt.slice(0, 60)}…"`)
    // The derived prompt-hash fallback exists for the pre-existing System Design checks.
    // Python is authored after the field, so it has no excuse: an explicit id survives a
    // prompt rewrite, and per-item difficulty estimates depend on that.
    expect(missing).toEqual([])
  })

  it("check ids are unique within a lesson", () => {
    const { checks } = collectChecks()
    const seen = new Map<string, Set<string>>()
    const duplicates: string[] = []
    for (const { lessonId, spec } of checks) {
      if (!spec.id) continue
      const ids = seen.get(lessonId) ?? new Set<string>()
      if (ids.has(spec.id)) duplicates.push(`${lessonId}#${spec.id}`)
      ids.add(spec.id)
      seen.set(lessonId, ids)
    }
    expect(duplicates).toEqual([])
  })

  it("every predict option explains itself, not just its verdict", () => {
    const { checks } = collectChecks()
    const thin: string[] = []
    for (const { lessonId, spec } of checks) {
      if (spec.kind !== "predict") continue
      for (const option of spec.options ?? []) {
        if (option.feedback.trim().length < MIN_FEEDBACK_CHARS) {
          thin.push(`${lessonId}#${spec.id}: "${option.label.slice(0, 40)}…"`)
        }
      }
    }
    expect(thin).toEqual([])
  })

  it("no lesson is buried under checks", () => {
    const { perLesson } = collectChecks()
    const over = [...perLesson.entries()]
      .filter(([, count]) => count > MAX_CHECKS_PER_LESSON)
      .map(([lessonId, count]) => `${lessonId}: ${count}`)
    expect(over).toEqual([])
  })

  it("learner-facing check prose uses no em dashes", () => {
    const { checks } = collectChecks()
    const offenders: string[] = []
    for (const { lessonId, spec } of checks) {
      const strings = [
        spec.prompt,
        spec.reveal ?? "",
        ...(spec.options ?? []).flatMap((o) => [o.label, o.feedback]),
        ...(spec.items ?? []).flatMap((i) => [i.label, i.feedback ?? ""]),
        ...(spec.buckets ?? []),
      ]
      if (strings.some((text) => text.includes("—"))) {
        offenders.push(`${lessonId}#${spec.id ?? "?"}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
