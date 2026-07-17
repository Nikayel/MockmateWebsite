"use client"

import type { ReactNode } from "react"
import { RefreshCw, Target } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"

/**
 * The left "brief" column of the Apply/Practice workspace: a mono phase eyebrow, a plain-language
 * title, the task prompt, an optional spaced-repetition chip (Practice), and a Goal card telling the
 * learner exactly what to do next. Course-specific extras (the SQL Schema/Data panel) render in the
 * `data` slot beneath. Paired with `ExerciseLayout`, which pins this column sticky so it stays in
 * view while the editor scrolls. Shared by the Python and SQL runners so both read the same way.
 */

/** The phase-level fields the lesson player supplies; each runner fills in prompt/goal/data. */
export interface ExerciseBriefMeta {
  /** Mono uppercase eyebrow — the phase, e.g. "Apply" / "Practice". */
  eyebrow: string
  /** Plain-language title, e.g. "Your turn" / "Make it stick". */
  title: string
  /** Practice only: show the "resurfaces in 3 days" spaced-repetition chip. */
  resurfaces?: boolean
}

export interface ExerciseBriefProps extends ExerciseBriefMeta {
  /** The task prompt (markdown). */
  prompt: string
  /** One-line "how to proceed" hint shown in the Goal card. */
  goal: ReactNode
  /** Course-specific extra (e.g. the SQL Schema/Data panel), rendered under the Goal card. */
  data?: ReactNode
}

export function ExerciseBrief({
  eyebrow,
  title,
  prompt,
  resurfaces,
  goal,
  data,
}: ExerciseBriefProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-accent font-mono text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
          {eyebrow}
        </span>
        <h2 className="text-foreground text-lg font-semibold tracking-tight text-balance">
          {title}
        </h2>
      </div>

      <div className="prose prose-sm dark:prose-invert prose-p:text-muted-foreground prose-li:text-muted-foreground max-w-none text-[0.9rem] leading-relaxed">
        <MarkdownRenderer content={prompt} />
      </div>

      {resurfaces && (
        <span className="border-accent/30 bg-accent/[0.08] text-accent-strong inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Resurfaces in 3 days to lock it in
        </span>
      )}

      <div className="border-border bg-muted/30 flex items-start gap-2.5 rounded-xl border p-3">
        <Target className="text-accent mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-muted-foreground text-xs leading-relaxed">{goal}</p>
      </div>

      {data}
    </div>
  )
}
