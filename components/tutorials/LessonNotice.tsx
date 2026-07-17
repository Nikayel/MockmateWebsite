import { cn } from "@/lib/utils"

/**
 * The one "something needs your attention" surface in the learn UI.
 *
 * Five components had hand-copied the identical class string for this — both exercise
 * runners, the workspace runner, the SQL script result, and the progress banner — so the
 * notice colour had five owners and no single place to fix it.
 *
 * ## Why orange rather than amber
 *
 * The palette is warm clay (accent hue ~23deg). The notice used `text-amber-300` in dark
 * mode, which sits at hue 46deg — a lemon yellow at double the brand's hue angle, reading
 * as a highlighter dropped on the page. It also failed to earn that: in light mode
 * `text-amber-700` on `bg-amber-500/10` measured 4.41:1, under the 4.5:1 AA bar.
 *
 * Orange keeps the "caution" convention while landing near the brand, and both themes now
 * clear AA comfortably:
 *
 *   light  orange-800 on orange-500/10 over #f9f8f5  ->  6.26:1  (hue 15deg)
 *   dark   orange-300 on orange-500/10 over #1a1917  ->  9.11:1  (hue 31deg)
 *
 * Difficulty badges deliberately keep amber: they are a traffic light, where an ordered
 * green/amber/red scale is the point and yellow earns its place.
 */
export const LESSON_NOTICE_CLASS =
  "rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-300"

/** Matching text colour for controls rendered inside a notice (e.g. a Retry button). */
export const LESSON_NOTICE_TEXT = "text-orange-800 dark:text-orange-300"

interface LessonNoticeProps {
  children: React.ReactNode
  /** Rendered before the message — an icon, typically. */
  leading?: React.ReactNode
  /** Rendered after the message — an action, typically. */
  trailing?: React.ReactNode
  className?: string
}

/**
 * `role="alert"` because every current use announces a state the learner did not ask for
 * (a run error, a failed save) and needs to hear about without hunting for it.
 */
export function LessonNotice({ children, leading, trailing, className }: LessonNoticeProps) {
  return (
    <div
      role="alert"
      className={cn(LESSON_NOTICE_CLASS, "flex items-start gap-2 p-3 text-sm", className)}
    >
      {leading}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
    </div>
  )
}
