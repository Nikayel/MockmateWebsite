import { Button } from "@/components/ui/button"

interface ReviewSummaryProps {
  score: number
  grade: string
  problemTitle?: string
  testsPassed: number
  testsTotal: number
  elapsedTime: number
  onClose?: () => void
}

export function ReviewSummary({
  score,
  grade,
  problemTitle,
  testsPassed,
  testsTotal,
  elapsedTime,
}: Omit<ReviewSummaryProps, "onClose">) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-foreground font-medium tabular-nums">
        {Math.round(score)}/100 <span className="text-muted-foreground font-normal">· {grade}</span>
      </span>
      {problemTitle && <span className="max-w-prose break-words">{problemTitle}</span>}
      <span className="text-muted-foreground text-xs tabular-nums">
        {testsPassed}/{testsTotal} tests · {Math.floor(elapsedTime / 60)} min
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
