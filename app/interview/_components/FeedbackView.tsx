"use client"

import { useRouter } from "next/navigation"
import nextDynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { ArrowLeft } from "lucide-react"
import { useInterview } from "../_hooks/useInterview"
import { useAuth } from "@/lib/auth-context"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"

const PracticeFeedback = nextDynamic(() => import("@/components/PracticeFeedback"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-sm text-gray-400">Loading feedback...</div>
    </div>
  ),
})

/**
 * Props for FeedbackView
 *
 * Only callbacks that have complex dependencies in page.tsx
 */
export interface FeedbackViewProps {
  resetInterview: () => void
  elapsedTime: number
  isFromRoadmap: boolean
}

/**
 * Feedback View Component
 *
 * Displays comprehensive feedback after interview completion.
 * Uses InterviewContext for state.
 */
export function FeedbackView({ resetInterview, elapsedTime, isFromRoadmap }: FeedbackViewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { activeRoadmap } = useRoadmapStore()

  // Get state from context
  const {
    comprehensiveFeedback,
    performanceScore,
    technicalScore,
    scoreBreakdown,
    constitutionalAICritique,
    testSummary,
    efficiencyMetrics,
    selectedScenario,
    code,
    selectedLanguage,
  } = useInterview()

  return (
    <>
      <ErrorBoundary>
        <PracticeFeedback
          feedback={comprehensiveFeedback || ""}
          performanceScore={performanceScore ?? 0}
          technicalScore={technicalScore ?? undefined}
          scoreBreakdown={scoreBreakdown || undefined}
          constitutionalAICritique={constitutionalAICritique}
          testsPassed={testSummary.passed}
          testsTotal={testSummary.total}
          timeComplexity={efficiencyMetrics?.estimatedTimeComplexity}
          spaceComplexity={efficiencyMetrics?.estimatedSpaceComplexity}
          efficiencyScore={efficiencyMetrics?.efficiencyScore}
          elapsedTime={elapsedTime}
          userId={user?.id}
          problemType={selectedScenario?.type}
          difficulty={selectedScenario?.difficulty}
          problemTitle={selectedScenario?.title}
          code={code}
          language={selectedLanguage}
          onRetry={resetInterview}
          onNewProblem={resetInterview}
          onEndInterview={() => router.push("/practice")}
        />
      </ErrorBoundary>
      {isFromRoadmap && activeRoadmap && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => router.push("/roadmap")}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roadmap
          </Button>
        </div>
      )}
    </>
  )
}
