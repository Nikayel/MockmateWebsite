import type { Scenario, ScenarioType } from "@/lib/scenarios"
import { EXERCISE_TYPES } from "./scenario-display"

/**
 * The Debugging track's designed first click. One shared constant so the
 * browser (pins it to the top of the track) and both card variants (render
 * the "Start here" chip) can never disagree about which scenario it is.
 * bugfix-onboarding: easy, 15 minutes, and the bug is a misplaced status
 * guard inside a two-sum lookup, a first rep that pays off fast.
 */
export const STARTER_SCENARIO_ID = "bugfix-onboarding"

/**
 * Derived, display-only context for a scenario card. Keeps the "what makes this
 * problem worth picking" logic in one place so the grid card and any compact
 * row variant stay consistent (no duplicated per-type formatting).
 */
export interface ScenarioCardContext {
  /** Short label for the type marker, e.g. "Bug Fix", "DSA". */
  typeLabel: string
  /** One human-readable line under the title (the differentiating signal). */
  contextLine: string | null
  /** A short secondary signal shown in the quiet meta row (scope / target). */
  signal: string | null
}

// Derived from the shared EXERCISE_TYPES table; cards use the compact `cardLabel` (e.g. "DSA")
// where one is defined, otherwise the full `label`.
const TYPE_LABELS = Object.fromEntries(
  EXERCISE_TYPES.map((type) => [type.id, type.cardLabel ?? type.label])
) as Record<ScenarioType, string>

function prettifyPattern(pattern: string): string {
  return pattern
    .split("-")
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ")
}

function firstNonEmpty(...values: (string | undefined)[]): string | null {
  for (const value of values) {
    if (value && value.trim()) return value.trim()
  }
  return null
}

function countCodebaseFiles(codebaseFiles: Record<string, unknown[]> | undefined): number {
  if (!codebaseFiles) return 0
  const langs = Object.values(codebaseFiles)
  const first = langs.find((files) => Array.isArray(files) && files.length > 0)
  return Array.isArray(first) ? first.length : 0
}

/**
 * Builds the per-type context shown on a scenario card. Narrows on the
 * discriminated `type` so each variant pulls the right fields.
 */
export function getScenarioCardContext(scenario: Scenario): ScenarioCardContext {
  const typeLabel = TYPE_LABELS[scenario.type] ?? "Practice"
  const { description } = scenario

  switch (scenario.type) {
    case "bugfix": {
      // bugDescription is deliberately excluded: it states the root cause and
      // must never render on a candidate-visible surface before the debrief.
      const contextLine = firstNonEmpty(
        scenario.observedSymptoms?.[0],
        scenario.userReport,
        scenario.description
      )
      const fileCount = countCodebaseFiles(scenario.codebaseFiles)
      const signal =
        scenario.bugfixKind === "micro-debugging"
          ? "Focused bug"
          : fileCount > 0
            ? `Real codebase · ${fileCount} file${fileCount === 1 ? "" : "s"}`
            : "Real codebase"
      return { typeLabel, contextLine, signal }
    }

    case "add-functionality": {
      const contextLine = firstNonEmpty(scenario.featureRequirements?.[0], scenario.description)
      const fileCount = countCodebaseFiles(scenario.codebaseFiles)
      const signal = fileCount > 0 ? `Feature codebase · ${fileCount} files` : "Feature codebase"
      return { typeLabel, contextLine, signal }
    }

    case "dsa": {
      const contextLine = scenario.pattern
        ? `${prettifyPattern(scenario.pattern)} pattern`
        : scenario.description
      const time = scenario.optimalComplexity?.time
      const signal = time ? `${time} target` : "Algorithm drill"
      return { typeLabel, contextLine, signal }
    }

    case "system-design": {
      const contextLine = firstNonEmpty(scenario.keyComponents?.join(" · "), scenario.description)
      return { typeLabel, contextLine, signal: "Design" }
    }
  }

  // Exhaustive over the Scenario union; fallback keeps types total.
  return { typeLabel, contextLine: description, signal: null }
}
