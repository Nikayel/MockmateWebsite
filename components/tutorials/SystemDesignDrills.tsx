import Link from "next/link"
import { ArrowRight, BookOpen, Clock, Timer } from "lucide-react"
import { scenarios } from "@/lib/scenarios"
import { lessonForDrill } from "@/lib/tutorials/system-design/lesson-drills"
import type { DifficultyLevel, SystemDesignScenario } from "@/lib/scenarios/types"

/**
 * The drill bank on the System Design course page: every system-design interview scenario, each one
 * a deep link into a full timed round.
 *
 * These scenarios used to be browsable from `/interview`, which is now splitting into two atomic
 * tracks (DSA and Debugging). Moving the entry point here rather than deleting it is what keeps them
 * reachable at all, so the list is DERIVED, never authored: a thirteenth scenario added to the
 * registry shows up on this page without anyone remembering to come back and add a card. That is the
 * same discipline the rest of the page follows, and `__tests__/system-design-drills.test.tsx` holds
 * it to the ids rather than to a count.
 */

/**
 * Difficulty stays a traffic light at the shades `LessonHeader` measured as AA-safe in both themes
 * (see `__tests__/contrast.test.ts`). Duplicating the map rather than importing it is deliberate:
 * that one is keyed by `TutorialLesson`'s difficulty, this one by the scenario registry's, and the
 * two vocabularies are free to diverge.
 */
const DIFFICULTY_CLASS: Record<DifficultyLevel, string> = {
  easy: "border-emerald-500/30 text-emerald-800 dark:text-emerald-400",
  medium: "border-amber-500/30 text-amber-800 dark:text-amber-400",
  hard: "border-rose-500/30 text-rose-800 dark:text-rose-400",
}

/** Presentation order only. Registry order breaks ties, so the ramp is stable across builds. */
const DIFFICULTY_RANK: Record<DifficultyLevel, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * `scenario` alone is ignored by the interview page; `useSessionReopen` only takes over the route
 * when `practice=true` or `roadmap=true` rides along (app/interview/_hooks/useSessionReopen.ts:374).
 * `practice=true` is the right half of that pair here: `roadmap=true` auto-starts the round and skips
 * company selection, which is a roadmap affordance, not a browse-then-choose one.
 */
export function systemDesignDrillPath(scenarioId: string): string {
  return `/interview?scenario=${scenarioId}&practice=true`
}

/** Every system-design scenario in the registry, ordered easy to hard. */
export function listSystemDesignDrills(): SystemDesignScenario[] {
  return scenarios
    .filter((scenario): scenario is SystemDesignScenario => scenario.type === "system-design")
    .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty])
}

export function SystemDesignDrills() {
  const drills = listSystemDesignDrills()
  if (drills.length === 0) return null

  return (
    <section id="drills" aria-labelledby="drills-heading" className="mt-12 scroll-mt-20">
      <div className="mb-4">
        <h2
          id="drills-heading"
          className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Timer className="text-accent h-4 w-4 shrink-0" aria-hidden="true" />
          Drills
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          A lesson teaches one concept and asks you to write a design answer you can compare against
          a model answer. A drill is the whole round instead: {drills.length} open-ended briefs,
          each one a timed interview with an AI interviewer who questions your design as you build
          it and scores it when time is up. Read the levels first, then drill.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {drills.map((drill) => (
          <li key={drill.id}>
            <Link
              href={systemDesignDrillPath(drill.id)}
              // The visible title leads the label, so the spoken name and the read name agree.
              aria-label={`${drill.title}. ${drill.difficulty} drill, about ${drill.estimatedTime} minutes.`}
              className="group border-border bg-card hover:border-accent/40 hover:bg-accent/[0.03] focus-visible:ring-accent/50 flex h-full flex-col rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="flex items-start gap-2">
                <h3 className="text-foreground min-w-0 flex-1 font-semibold text-balance">
                  {drill.title}
                </h3>
                <ArrowRight
                  className="text-muted-foreground group-hover:text-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">{drill.description}</p>
              {/* `mt-auto` inside the stretched card pins the meta row to the bottom, so the two
                  columns line up even when one description wraps to a second line. */}
              <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs">
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 font-medium capitalize",
                    DIFFICULTY_CLASS[drill.difficulty],
                  ].join(" ")}
                >
                  {drill.difficulty}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {drill.estimatedTime} min
                </span>
              </div>
            </Link>
            {/* Deliberately a SIBLING of the card, not a child: the whole card is already an anchor
                and nesting one inside another is invalid HTML that browsers recover from by
                unnesting, which would put a stray link outside the card. */}
            {lessonForDrill(drill.id) && (
              <p className="mt-2 pl-1 text-xs">
                <Link
                  href={lessonForDrill(drill.id)!.href}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Read the lesson on this system first
                </Link>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
