/**
 * Resolve which concept bucket a scenario's mastery card belongs to.
 *
 * DSA scenarios carry a real DSAPattern. Non-DSA scenarios (system design,
 * bugfix, add-functionality) have no pattern; they used to fall back to
 * "arrays-hashing", silently mis-tagging every System Design card into a DSA
 * concept. They now land in the existing "case-lab" systems bucket, which
 * already has metadata and is already excluded from the pattern roadmap.
 *
 * Fix-forward only: cards mis-tagged before this fix keep their stored
 * pattern.
 */

import { DSA_PATTERNS, type DSAPattern } from "../types/dsa-patterns"

interface PatternResolvableScenario {
  type?: string
  pattern?: string
}

const KNOWN_PATTERNS = new Set<string>(Object.values(DSA_PATTERNS))

export function resolvePatternForScenario(scenario: PatternResolvableScenario): DSAPattern {
  if (scenario.pattern && KNOWN_PATTERNS.has(scenario.pattern)) {
    return scenario.pattern as DSAPattern
  }

  // DSA scenario with a missing/unknown pattern: keep the legacy default so
  // genuinely-DSA cards stay in a DSA bucket.
  if (scenario.type === "dsa") {
    return DSA_PATTERNS.ARRAYS_HASHING
  }

  // System design / bugfix / labs: the systems bucket.
  return DSA_PATTERNS.CASE_LAB
}
