import { Cpu, Bug, Wrench, Zap, Shield, Layers } from "lucide-react"
import type { ScenarioType, DifficultyLevel } from "@/lib/scenarios"

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
  { id: "optimization", label: "Optimize", description: "Improve performance", icon: Zap },
  { id: "security", label: "Security", description: "Fix vulnerabilities", icon: Shield },
  { id: "system-design", label: "System Design", description: "Architecture & scalability", icon: Layers },
  { id: "dsa", label: "DSA Drill", cardLabel: "DSA", description: "Algorithms & data structures", icon: Cpu },
]

export const getDifficultyStyle = (difficulty: DifficultyLevel) => {
  switch (difficulty) {
    case "easy":
      return "border-transparent bg-emerald-500/10 text-emerald-300"
    case "medium":
      return "border-transparent bg-amber-500/10 text-amber-200"
    case "hard":
      return "border-transparent bg-rose-500/10 text-rose-300"
    default:
      return "border-transparent bg-white/5 text-zinc-300"
  }
}

// Solid dot color for the compact list row (LeetCode-style difficulty marker).
export const getDifficultyDot = (difficulty: DifficultyLevel) => {
  switch (difficulty) {
    case "easy":
      return "bg-emerald-400"
    case "medium":
      return "bg-amber-400"
    case "hard":
      return "bg-rose-400"
    default:
      return "bg-zinc-500"
  }
}

export const getTypeConfig = (type: ScenarioType) => {
  const config = EXERCISE_TYPES.find((t) => t.id === type)
  return config || EXERCISE_TYPES[0]
}
