import { Check } from "lucide-react"
import type { PythonLevel, PythonLevelId } from "@/lib/tutorials/types"

/**
 * One node on the Python Path (HANDOFF §B). A clickable card that *selects* its level — the sticky
 * preview reacts; the preview's CTA does the navigation. Models the loop deepening across levels via
 * phase badges, and overlays completion (a clay-filled check + an "n / total done" line) hydrated
 * from saved progress. The numbered spine + connector live in `LevelSelector`.
 */
const LEVEL_PHASES: Record<PythonLevelId, string[]> = {
  1: ["Read"],
  2: ["Read", "Apply"],
  3: ["Read", "Apply", "Practice"],
  4: ["Read", "Apply", "Practice", "Files"],
}

export function LevelCard({
  level,
  isSelected,
  isCompleted,
  completedCount,
  onSelect,
}: {
  level: PythonLevel
  isSelected: boolean
  isCompleted: boolean
  completedCount: number
  onSelect: (level: PythonLevel) => void
}) {
  const lessonCount = level.modules.reduce((total, mod) => total + mod.lessons.length, 0)
  const phases = LEVEL_PHASES[level.id]
  const hasProgress = completedCount > 0

  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      aria-pressed={isSelected}
      className={[
        "group w-full rounded-xl border p-5 text-left transition-colors",
        isSelected
          ? "border-accent/50 bg-accent/[0.06] shadow-sm"
          : "border-border bg-card hover:border-accent/30 hover:bg-accent/[0.03]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-foreground font-semibold">{level.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{level.tagline}</p>
        </div>
        {isCompleted && (
          <span
            className="bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            aria-label="Level complete"
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {phases.map((phase) => (
          <span
            key={phase}
            className={[
              "rounded-full border px-2 py-0.5 text-xs",
              isSelected ? "border-accent/30 text-accent" : "border-border text-muted-foreground",
            ].join(" ")}
          >
            {phase}
          </span>
        ))}
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"} · ~{level.estimatedHours}h
        {hasProgress && (
          <span className="text-accent font-medium">
            {" · "}
            {completedCount}/{lessonCount} done
          </span>
        )}
      </p>
    </button>
  )
}
