import { Clock } from "lucide-react"
import type { DifficultyLevel } from "@/lib/scenarios/types"
import type { TutorialLesson } from "@/lib/tutorials/types"

/**
 * The lesson's identity header at the top of the workspace center column (HANDOFF §C/§134-147):
 * title, summary, and the authored meta — difficulty, estimated time, and skill chips. All
 * data-driven off the lesson object; `skills[]` are audited so they're safe to show as topic chips.
 */
/**
 * Difficulty stays a traffic light (green / amber / red) — the one place a yellow earns
 * its keep, because the three steps must read as an ordered scale at a glance.
 *
 * Light mode uses the 800 shade, not 600: amber-600 measured 3.00:1 on the page
 * background, well under the 4.5:1 AA needs, so "medium" was the badge nobody could
 * read. amber-800 lands at 6.68:1 and, at hue 23deg, sits within a degree of the clay
 * accent — so it reads as brand rather than as highlighter. Emerald and rose move with
 * it to keep the three weights even.
 */
const DIFFICULTY_CLASS: Record<DifficultyLevel, string> = {
  easy: "border-emerald-500/30 text-emerald-800 dark:text-emerald-400",
  medium: "border-amber-500/30 text-amber-800 dark:text-amber-400",
  hard: "border-rose-500/30 text-rose-800 dark:text-rose-400",
}

export function LessonHeader({ lesson }: { lesson: TutorialLesson<unknown> }) {
  return (
    <header className="border-border mb-6 border-b pb-5">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight text-balance">
        {lesson.title}
      </h1>
      <p className="text-muted-foreground mt-1.5 text-pretty">{lesson.summary}</p>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={[
            "rounded-full border px-2 py-0.5 font-medium capitalize",
            DIFFICULTY_CLASS[lesson.difficulty],
          ].join(" ")}
        >
          {lesson.difficulty}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {lesson.estimatedMinutes} min
        </span>
        {lesson.skills.map((skill) => (
          <span
            key={skill}
            className="border-border bg-muted/40 rounded-full border px-2 py-0.5 font-mono"
          >
            {skill}
          </span>
        ))}
      </div>
    </header>
  )
}
