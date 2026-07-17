import { ArrowRight, BookOpen, Clock, Layers } from "lucide-react"
import { CodeWindow } from "./CodeWindow"
import { LEVEL_PREVIEWS } from "@/lib/tutorials/level-previews"
import type { PythonLevel, PythonLevelId } from "@/lib/tutorials/types"

/**
 * The Path's sticky preview panel (HANDOFF §B): a faux code-window for the selected level, the
 * Read/Apply/Practice/Files phase strip (phases the level doesn't reach are dimmed), topic chips,
 * lesson count / time / audience, and the Start CTA. Counts + chips are read live off the level;
 * only the illustrative sample + audience come from `LEVEL_PREVIEWS`.
 */
const ALL_PHASES = ["Read", "Apply", "Practice", "Files"] as const

const LEVEL_PHASE_COUNT: Record<PythonLevelId, number> = { 1: 1, 2: 2, 3: 3, 4: 4 }

const MAX_CHIPS = 7

/** Unique skills across a level's lessons, in first-seen order, capped for the chip row. */
function levelTopics(level: PythonLevel): string[] {
  const seen = new Set<string>()
  for (const mod of level.modules) {
    for (const lesson of mod.lessons) {
      for (const skill of lesson.skills) seen.add(skill)
    }
  }
  return Array.from(seen).slice(0, MAX_CHIPS)
}

export function LevelPreviewPanel({
  level,
  completedCount = 0,
  onStart,
}: {
  level: PythonLevel
  /** Lessons completed in this level (drives the Start/Continue/Review CTA + counts). */
  completedCount?: number
  onStart: (level: PythonLevel) => void
}) {
  // Every authored level (1–4) has a preview; guard defensively so a future level id can't crash.
  const preview = LEVEL_PREVIEWS[level.id] ?? LEVEL_PREVIEWS[1]
  const lessonCount = level.modules.reduce((total, mod) => total + mod.lessons.length, 0)
  const activePhases = LEVEL_PHASE_COUNT[level.id]
  const topics = levelTopics(level)

  const isDone = lessonCount > 0 && completedCount >= lessonCount
  const inProgress = completedCount > 0 && !isDone
  const ctaLabel = isDone
    ? `Review Level ${level.id}`
    : inProgress
      ? `Continue Level ${level.id}`
      : `Start Level ${level.id}`

  return (
    <div className="border-border bg-card/60 flex flex-col gap-5 rounded-2xl border p-5 shadow-sm backdrop-blur-sm">
      <div>
        <p className="text-accent-strong text-xs font-semibold tracking-wide uppercase">
          Level {level.id}
        </p>
        <h2 className="text-foreground mt-1 text-lg font-semibold">{level.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{level.tagline}</p>
      </div>

      <CodeWindow filename={preview.filename} lines={preview.sample} />

      {/* Phase strip — the loop deepens per level; unreached phases dim out. */}
      <div className="flex items-center gap-1.5" aria-label="Lesson loop for this level">
        {ALL_PHASES.map((phase, i) => {
          const active = i < activePhases
          return (
            <span key={phase} className="flex items-center gap-1.5">
              <span
                className={[
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  // Inactive chips are muted, not faded: the /50 alpha measured 2.07:1 in
                  // light mode, and these name the phases of the lesson — a learner has to
                  // read the ones they have not reached to know what is coming. The
                  // active chip's border + tint already carries the distinction.
                  // The active chip uses --accent-strong because plain text-accent is
                  // 3.97:1 in light mode, under AA at 12px.
                  active
                    ? "border-accent/40 bg-accent/10 text-accent-strong"
                    : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {phase}
              </span>
              {i < ALL_PHASES.length - 1 && (
                <span
                  className={
                    active && i + 1 < activePhases ? "text-accent-strong" : "text-muted-foreground"
                  }
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </span>
          )
        })}
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <span
              key={topic}
              className="border-border text-muted-foreground bg-muted/40 rounded-full border px-2 py-0.5 font-mono text-xs"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      <dl className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Lessons</dt>
          <dd>
            {inProgress || isDone ? (
              <span className="text-accent-strong font-medium">
                {completedCount}/{lessonCount} done
              </span>
            ) : (
              `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`
            )}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Estimated time</dt>
          <dd>~{level.estimatedHours}h</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Audience</dt>
          <dd>{preview.audience}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onStart(level)}
        className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 group inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}
