import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import type { DifficultyLevel } from "@/lib/scenarios/types"
import type { PythonLesson } from "@/lib/tutorials/types"

const DIFFICULTY_CLASS: Record<DifficultyLevel, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
}

/**
 * One lesson in a module list. Mirrors `components/labs/CaseLabRow.tsx`. `isCompleted` is an
 * optional client-hydrated overlay (the server list renders without it).
 */
export function LessonRow({
  levelSlug,
  lesson,
  isCompleted = false,
}: {
  levelSlug: string
  lesson: PythonLesson
  isCompleted?: boolean
}) {
  return (
    <li>
      <Link
        href={`/learn/python/${levelSlug}/${lesson.id}`}
        className="group border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
      >
        <span
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
            isCompleted
              ? "bg-emerald-500 text-white"
              : "border-border text-muted-foreground border",
          ].join(" ")}
          aria-hidden="true"
        >
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : null}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-foreground font-medium">{lesson.title}</p>
          <p className="text-muted-foreground truncate text-sm">{lesson.summary}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            <span className={DIFFICULTY_CLASS[lesson.difficulty]}>{lesson.difficulty}</span>
            {" · "}
            {lesson.estimatedMinutes} min
            {lesson.skills.length > 0 && ` · ${lesson.skills.join(", ")}`}
          </p>
        </div>

        <ChevronRight className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  )
}
