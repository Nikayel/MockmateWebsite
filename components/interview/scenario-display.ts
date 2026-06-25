import { Cpu, Bug, Wrench, Zap, Shield, Layers } from "lucide-react"
import type { ScenarioType, DifficultyLevel } from "@/lib/scenarios"

// Shared display config for scenarios. Used by both the card grid (ScenarioCard)
// and the compact list (ScenarioListRow) so the type/difficulty presentation
// stays in one place.
export const EXERCISE_TYPES = [
  { id: "bugfix", label: "Bug Fix", icon: Bug },
  { id: "add-functionality", label: "Add Feature", icon: Wrench },
  { id: "optimization", label: "Optimize", icon: Zap },
  { id: "security", label: "Security", icon: Shield },
  { id: "system-design", label: "System Design", icon: Layers },
  { id: "dsa", label: "DSA Drill", icon: Cpu },
] as const

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
