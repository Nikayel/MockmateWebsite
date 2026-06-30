import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { PythonLevel, PythonLevelId } from "@/lib/tutorials/types"

/**
 * One level on the Python Path. Models the loop deepening across levels (Read → Apply →
 * Practice → Files). Links to the level's module list. Presentational + a Link, so it renders
 * fine in a Server Component.
 */
const LEVEL_PHASES: Record<PythonLevelId, string[]> = {
  1: ["Read"],
  2: ["Read", "Apply"],
  3: ["Read", "Apply", "Practice"],
  4: ["Read", "Apply", "Practice", "Files"],
}

export function LevelCard({ level }: { level: PythonLevel }) {
  const lessonCount = level.modules.reduce((total, mod) => total + mod.lessons.length, 0)
  const phases = LEVEL_PHASES[level.id]

  return (
    <Link
      href={`/learn/python/${level.slug}`}
      className="group border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] flex items-start gap-4 rounded-xl border p-5 transition-colors"
    >
      <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {level.id}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="text-foreground font-semibold">{level.title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{level.tagline}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {phases.map((phase) => (
            <span
              key={phase}
              className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs"
            >
              {phase}
            </span>
          ))}
        </div>

        <p className="text-muted-foreground mt-3 text-xs">
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"} · ~{level.estimatedHours}h
        </p>
      </div>

      <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
