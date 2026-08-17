import Link from "next/link"
import { ArrowRight, BookOpen, Clock, Layers } from "lucide-react"
import type { PathLevelSummary } from "@/lib/tutorials/level-path"

/**
 * The System Design Path's sticky preview panel (HANDOFF-LearnPython §B, ported to a course with no
 * code in it).
 *
 * §B's panel is built around a faux code-window, which is the right idea and the wrong artifact
 * here: nothing in this course compiles, so a syntax-highlighted sample would be decoration. The
 * window keeps its frame and its chrome, and what it frames is the level's MODULE OUTLINE, which is
 * the "what does this level feel like" answer for a design course and is the one thing a visitor
 * cannot already read off the card they are hovering.
 *
 * Everything here is DERIVED from the level (modules, lesson counts, hours, skills). Nothing is
 * authored per level, so a level that gains a module updates this panel with no edit.
 */

/** Topic chips are a taste of the level, not an index. Beyond this they wrap into a wall. */
const MAX_CHIPS = 8

/** Unique skills across a level's lessons, in first-seen order, capped for the chip row. */
function levelTopics(level: PathLevelSummary): string[] {
  const seen = new Set<string>()
  for (const lesson of level.lessons) {
    for (const skill of lesson.skills) seen.add(skill)
  }
  return Array.from(seen).slice(0, MAX_CHIPS)
}

export function SystemDesignLevelPreview({
  level,
  href,
  completedCount = 0,
}: {
  level: PathLevelSummary
  /** Where the CTA goes: the level's first unfinished lesson, resolved by the parent. */
  href: string
  /** Lessons completed in this level (drives the Start/Continue/Review CTA + the counts). */
  completedCount?: number
}) {
  const lessonCount = level.lessons.length
  const topics = levelTopics(level)

  const isDone = lessonCount > 0 && completedCount >= lessonCount
  const inProgress = completedCount > 0 && !isDone
  const ctaLabel = isDone
    ? `Review Level ${level.id}`
    : inProgress
      ? `Continue Level ${level.id}`
      : `Start Level ${level.id}`

  return (
    // Capped to the viewport, with the module outline as the part that gives.
    // The panel is sticky at `top-24` (6rem), so an uncapped one simply runs off the bottom of a
    // short screen: measured on the real build at 1366x660, the panel reached 669px and its "Start
    // Level N" button sat at y=700 for the entire pinned scroll range, which is zero pixels of a
    // 44px control on the single most common laptop resolution. `calc(100vh-7rem)` is the 6rem
    // offset plus a 1rem breathing gap. Everything except the outline keeps its natural height, so
    // the CTA and the counts are always on screen and only the module list scrolls.
    <div className="border-border bg-card/60 flex max-h-[calc(100vh-7rem)] flex-col gap-5 rounded-2xl border p-5 shadow-sm backdrop-blur-sm">
      <div className="shrink-0">
        <p className="text-accent-strong text-xs font-semibold tracking-wide uppercase">
          Level {level.id}
        </p>
        {/* A paragraph, not a heading: this is a preview of the level card's own heading a column
            to the left, and a second copy in the outline would say the page has two of each level. */}
        <p className="text-foreground mt-1 text-lg font-semibold text-balance">{level.title}</p>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">{level.tagline}</p>
      </div>

      {level.modules.length > 0 && (
        <div className="border-border bg-card flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border bg-muted/40 flex shrink-0 items-center gap-2 border-b px-3 py-2">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e0695f]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e0b15a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#6fcf9f]" />
            </span>
            <span className="text-muted-foreground ml-1 font-mono text-xs">{level.slug}</span>
          </div>
          <ol className="divide-border min-h-0 divide-y overflow-y-auto">
            {level.modules.map((mod, i) => (
              <li
                key={mod.id}
                className="flex items-baseline gap-3 px-3 py-2 text-sm first:pt-2.5 last:pb-2.5"
              >
                <span
                  className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-foreground min-w-0 flex-1 text-pretty">{mod.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {mod.lessonCount}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {topics.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5">
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

      <dl className="text-muted-foreground flex shrink-0 flex-wrap gap-x-5 gap-y-2 text-xs">
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
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Modules</dt>
          <dd>
            {level.modules.length} {level.modules.length === 1 ? "module" : "modules"}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Estimated time</dt>
          <dd>~{level.estimatedHours}h</dd>
        </div>
      </dl>

      <Link
        href={href}
        className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {ctaLabel}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Link>
    </div>
  )
}
