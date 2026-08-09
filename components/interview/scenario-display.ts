import { Cpu, Bug, Wrench, Layers } from "lucide-react"
import type { ScenarioType } from "@/lib/scenarios"

/**
 * The single scenario-type table. Every scenario-type surface derives from this: the filter
 * pills (ScenarioFilters, uses `description`), the card type marker (scenario-card-meta, uses
 * `cardLabel ?? label`), and the card/list icons (ScenarioCard, ScenarioListRow, use `icon`).
 */
export interface ExerciseTypeConfig {
  id: ScenarioType
  label: string
  /** Compact label for the card type marker; falls back to `label`. */
  cardLabel?: string
  description: string
  icon: typeof Bug
}

export const EXERCISE_TYPES: readonly ExerciseTypeConfig[] = [
  { id: "bugfix", label: "Bug Fix", description: "Repair failing codebases", icon: Bug },
  { id: "add-functionality", label: "Add Feature", description: "Extend codebases", icon: Wrench },
  {
    id: "system-design",
    label: "System Design",
    description: "Architecture & scalability",
    icon: Layers,
  },
  {
    id: "dsa",
    label: "DSA Drill",
    cardLabel: "DSA",
    description: "Algorithms & data structures",
    icon: Cpu,
  },
]

// Difficulty colors live in `lib/ui/difficulty-colors.ts` (difficultyColorClass) — the
// single source of truth. The local getDifficultyStyle/getDifficultyDot copies this file
// used to carry drifted off it (rose vs red, dark-only -300 text) and are gone.

export const getTypeConfig = (type: ScenarioType) => {
  const config = EXERCISE_TYPES.find((t) => t.id === type)
  return config || EXERCISE_TYPES[0]
}
