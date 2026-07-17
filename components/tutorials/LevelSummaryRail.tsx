import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { LevelProgressRing } from "./LevelProgressRing"
import type { LevelPathModel } from "@/lib/tutorials/level-path"

/** Human-readable minutes: "45 min", "1h 20m", "2h". */
function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 min"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem ? `${hours}h ${rem}m` : `${hours}h`
}

/**
 * The section-status dot, as a FILL scale: empty ring -> ringed -> solid.
 *
 * It used to be a hue scale — clay for complete, amber-500 for in_progress — and those are
 * 14deg apart (hue 24 vs 38). At `h-2 w-2` that is two warm oranges the size of a full
 * stop: the rail was spending a colour to distinguish the two states it exists to
 * distinguish, and distinguishing neither. Filled-ness survives both an 8px dot and
 * colour-blindness, and it maps to the done/total count beside it.
 */
const SECTION_DOT: Record<LevelPathModel["sections"][number]["status"], string> = {
  complete: "bg-accent border-accent border-2",
  in_progress: "border-accent bg-accent/20 border-2",
  untouched: "border-muted-foreground/40 border-2",
}

/**
 * The sticky, resume-first summary rail: level identity, a progress ring, the primary Continue
 * action (deep-links to the next incomplete lesson), and a section-jump nav with per-section status
 * dots + counts. Everything is derived from `path` — nothing here is hardcoded.
 */
export function LevelSummaryRail({
  eyebrow,
  title,
  tagline,
  path,
}: {
  eyebrow: string
  title: string
  tagline: string
  path: LevelPathModel
}) {
  const { continueTarget, isComplete } = path
  const firstLessonHref = path.sections[0]?.lessons[0]?.href ?? null
  const hasLessons = path.total > 0

  return (
    <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
      <div>
        <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </p>
        <h1 className="text-foreground mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{tagline}</p>
      </div>

      {/* Progress card — omitted for an unauthored (coming-soon) level. */}
      {hasLessons && (
        <div className="border-border bg-card/60 flex items-center gap-4 rounded-2xl border p-4 shadow-sm">
          <LevelProgressRing percent={path.percent} />
          <div className="min-w-0">
            <p className="text-foreground text-sm font-semibold">
              {path.done} of {path.total} {path.total === 1 ? "lesson" : "lessons"}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {isComplete ? "Level complete" : `~${formatMinutes(path.minutesLeft)} left`}
            </p>
          </div>
        </div>
      )}

      {/* Continue — the primary, resume action */}
      {continueTarget ? (
        <div>
          <Link
            href={continueTarget.href}
            className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 group flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {path.done > 0 ? "Continue" : "Start learning"}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <p className="text-muted-foreground mt-2 truncate text-xs">
            Next:{" "}
            <span className="text-foreground/80 font-medium">{continueTarget.lessonTitle}</span>
          </p>
        </div>
      ) : isComplete && firstLessonHref ? (
        <div>
          <Link
            href={firstLessonHref}
            className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/15 group flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Review level
          </Link>
          <p className="text-muted-foreground mt-2 text-xs">
            You finished all {path.total} {path.total === 1 ? "lesson" : "lessons"}. Nice work.
          </p>
        </div>
      ) : null}

      {/* Section-jump nav */}
      {path.sections.length > 0 && (
        <nav aria-label="Sections in this level">
          <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
            Jump to
          </p>
          <ul className="flex flex-col gap-0.5">
            {path.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="group hover:bg-muted/60 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors"
                >
                  {/* Decorative: the done/total count beside it states the same thing in text. */}
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SECTION_DOT[section.status])}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground group-hover:text-foreground min-w-0 flex-1 truncate text-sm transition-colors">
                    {section.title}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {section.done}/{section.total}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  )
}
