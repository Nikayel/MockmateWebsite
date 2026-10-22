import type { ReactNode } from "react"
import type { LabAssessment } from "@/lib/bugfix/guided-lab/assessment/schema"
import { GuidedLabFeedback } from "./GuidedLabFeedback"
import { ReviewFrame } from "./ReviewFrame"
import { ReviewClose } from "./ReviewSummary"

interface GuidedLabReviewProps {
  assessment?: LabAssessment | null
  contained?: boolean
  problemTitle?: string
  testsPassed: number
  testsTotal: number
  onClose?: () => void
  afterReview?: ReactNode
}
export function GuidedLabReview({
  assessment,
  contained,
  problemTitle,
  testsPassed,
  testsTotal,
  onClose,
  afterReview,
}: GuidedLabReviewProps) {
  return (
    <ReviewFrame
      title="Guided lab review"
      contained={contained}
      actions={<ReviewClose onClose={onClose} />}
      summary={
        <div className="space-y-1">
          <p className="text-sm font-medium">{problemTitle}</p>
          <p className="text-muted-foreground text-sm">
            {testsPassed}/{testsTotal} workspace checks passing
          </p>
          <p className="text-muted-foreground text-xs">
            Guided practice · excluded from interview readiness
          </p>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <GuidedLabFeedback assessment={assessment} />
        {afterReview}
      </div>
    </ReviewFrame>
  )
}
