import { Button } from "@/components/ui/button"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import {
  clampPracticeMinutesFromSeconds,
  MAX_SESSION_PRACTICE_MINUTES,
} from "@/lib/session-duration"

interface ReviewSummaryProps {
  difficulty?: string
  sessionDate?: string
  elapsedTime: number
  onClose?: () => void
}

export function ReviewSummary({
  difficulty,
  sessionDate,
  elapsedTime,
}: Omit<ReviewSummaryProps, "onClose">) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {difficulty && (
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${difficultyColorClass(difficulty, "badgeOnLight")}`}
        >
          {difficulty}
        </span>
      )}
      {sessionDate && <span>{sessionDate}</span>}
      <span className="tabular-nums" title="Elapsed session time, including pauses">
        {elapsedTime < 60
          ? `${Math.max(0, Math.round(elapsedTime))}s`
          : `${clampPracticeMinutesFromSeconds(elapsedTime)}${elapsedTime / 60 > MAX_SESSION_PRACTICE_MINUTES ? "+" : ""} min`}
      </span>
    </div>
  )
}

export function ReviewClose({ onClose }: Pick<ReviewSummaryProps, "onClose">) {
  return onClose ? (
    <Button variant="outline" className="min-h-11" onClick={onClose}>
      Done
    </Button>
  ) : null
}
