import Link from "next/link"
import { ArrowRight, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DifficultyLevel } from "@/lib/scenarios/types"
import type { LessonPathNode } from "@/lib/tutorials/level-path"

/** Difficulty dot color — easy=green, medium=amber, hard=red (readable in light + dark). */
const DIFFICULTY_DOT: Record<DifficultyLevel, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-rose-500",
}
const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  easy: "text-emerald-700 dark:text-emerald-400",
  medium: "text-amber-700 dark:text-amber-400",
  hard: "text-rose-700 dark:text-rose-400",
}

/** The leading status indicator — a real, four-state affordance, not a decorative circle. */
function StatusIndicator({ status }: { status: LessonPathNode["status"] }) {
  if (status === "done") {
    return (
      <span className="bg-accent text-accent-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
    )
  }
  if (status === "current") {
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        {/* Pulsing halo — one of the screen's two intentional motions; stilled under reduced-motion. */}
        <span className="bg-accent/25 absolute inline-flex h-full w-full animate-ping rounded-full motion-reduce:hidden" />
        <span className="border-accent bg-accent/10 relative h-7 w-7 rounded-full border-2" />
      </span>
    )
  }
  // open
  return <span className="border-border h-7 w-7 shrink-0 rounded-full border-2" aria-hidden="true" />
}

/**
 * One lesson in the level's path grid. Renders one of three meaningful states (done / current /
 * open) and is always a navigable `<Link>` — there is no gating. The `current` card is the Continue
 * target: highlighted, badged "Up next", with a Start CTA.
 */
export function LessonPathCard({ node }: { node: LessonPathNode }) {
  const { item, index, status, href } = node
  const isCurrent = status === "current"
  const isDone = status === "done"

  const cardClass = cn(
    "group relative flex h-full flex-col rounded-xl border p-4 transition-all",
    "hover:border-accent/50 hover:-translate-y-0.5 hover:shadow-md",
    isCurrent ? "border-accent bg-accent/[0.06] shadow-md shadow-accent/20" : "border-border bg-card"
  )

  return (
    <Link href={href} className={cardClass} aria-current={isCurrent ? "step" : undefined}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide tabular-nums uppercase">
          Lesson {String(index).padStart(2, "0")}
        </span>
        {isCurrent && (
          <span className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
            Up next
          </span>
        )}
      </div>

      <div className="flex items-start gap-2.5">
        <StatusIndicator status={status} />
        <h3
          className={cn(
            "min-w-0 flex-1 pt-0.5 text-sm leading-snug font-semibold",
            isDone ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {item.title}
        </h3>
      </div>

      <p className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed">
        {item.summary}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 pt-0.5">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
          <span className={cn("h-1.5 w-1.5 rounded-full", DIFFICULTY_DOT[item.difficulty])} aria-hidden="true" />
          <span className={cn("font-medium capitalize", DIFFICULTY_LABEL[item.difficulty])}>
            {item.difficulty}
          </span>
          <span aria-hidden="true">·</span>
          {item.estimatedMinutes} min
        </span>

        {isCurrent ? (
          <span className="text-accent inline-flex items-center gap-0.5 text-xs font-semibold">
            Start
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        ) : isDone ? (
          <span className="text-muted-foreground group-hover:text-foreground text-xs font-medium transition-colors">
            Review
          </span>
        ) : (
          <ChevronRight
            className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        )}
      </div>
    </Link>
  )
}
