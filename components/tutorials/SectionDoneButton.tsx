"use client"

import { Check, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * The end-of-exercise "Mark as done" control (Apply + Practice). Grading stays the bar: the button
 * only appears once the exercise has PASSED, and tapping it saves the section (marks it complete) and
 * shows a persistent "Done" state. Shared by the Python and SQL players so both behave the same.
 */
export function SectionDoneButton({
  passed,
  completed,
  onMarkDone,
  label = "Mark as done",
}: {
  /** The exercise has passed this session (from the runner's onPass). */
  passed: boolean
  /** The section is already saved as complete (this session or resumed). */
  completed: boolean
  onMarkDone: () => void
  label?: string
}) {
  if (completed) {
    return (
      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300"
        role="status"
      >
        <CheckCircle2 className="h-4 w-4" />
        Done, saved
      </span>
    )
  }
  if (passed) {
    return (
      <Button onClick={onMarkDone} className="w-fit gap-2">
        <Check className="h-4 w-4" />
        {label}
      </Button>
    )
  }
  return null
}
