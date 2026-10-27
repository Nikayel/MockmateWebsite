"use client"

import { GuidedLabReview } from "./practice/GuidedLabReview"
import type { LabAssessment } from "@/lib/bugfix/guided-lab/assessment/schema"
import type { ReactNode } from "react"
import { parseFeedback } from "@/lib/feedback/parsers"
import { getLetterGrade } from "@/lib/constants"
import { ScoreDisplay } from "@/components/practice/ScoreDisplay"
import { FeedbackSections } from "@/components/practice/FeedbackSections"
import type { ChatMessage } from "@/lib/types"
import type { SessionComplexityAnalysis } from "@/lib/rag/knowledge-base/types"
import { useFeedbackViewAnalytics } from "@/lib/hooks/useFeedbackViewAnalytics"
import { ReviewFrame } from "@/components/practice/ReviewFrame"
import { ReviewSummary, ReviewClose } from "@/components/practice/ReviewSummary"

interface AlternativeApproach {
  name: string
  timeComplexity: string
  spaceComplexity: string
  tradeOff: string
  isOptimalTime: boolean
  isOptimalSpace: boolean
}

interface PracticeFeedbackProps {
  isGuidedLab?: boolean
  guidedLabAssessment?: LabAssessment | null
  contained?: boolean
  feedback: string
  performanceScore: number
  technicalScore?: number // Code-focused score (excludes communication)
  scoreBreakdown?: {
    understandingScore?: number
    problemSolvingScore?: number
    codeQualityScore?: number
    communicationScore?: number
  }
  constitutionalAICritique?: any
  // Pre-parsed structured feedback from API (preferred over parsing raw text)
  structuredFeedback?: {
    whatWorked?: string[]
    fixNext?: string[]
    actionPlan?: string[]
    tldr?: string
  }
  testsPassed: number
  testsTotal: number
  timeComplexity?: string
  spaceComplexity?: string
  efficiencyScore?: number
  elapsedTime?: number
  userId?: string
  sessionId?: string
  feedbackSurface?: "interview" | "saved_session"
  problemType?: string
  difficulty?: string
  problemTitle?: string
  code?: string
  language?: string
  chatMessages?: ChatMessage[]
  interviewerMessages?: ChatMessage[]
  onExport?: () => void
  onNewProblem?: () => void
  onClose?: () => void
  // Complexity analysis
  complexityAnalysis?: SessionComplexityAnalysis | null
  alternativeApproaches?: AlternativeApproach[]
  // Clarifying questions assessment (Real Interview Mode)
  clarifyingQuestionsAssessment?: {
    score: number
    totalExpected: number
    totalAsked: number
    requiredAsked: number
    requiredTotal: number
    results: Array<{
      question: string
      required: boolean
      asked: boolean
      matchedPhrase?: string
    }>
  } | null
  /** A high-priority next action rendered after the score and before detail. */
  afterScore?: ReactNode
  /** Keep the score visible while the written report is being retried. */
  feedbackPending?: boolean
}

export default function PracticeFeedback({
  contained = false,
  isGuidedLab = false,
  guidedLabAssessment,
  feedback,
  performanceScore,
  technicalScore,
  scoreBreakdown,
  constitutionalAICritique,
  structuredFeedback,
  testsPassed,
  testsTotal,
  elapsedTime = 0,
  userId,
  sessionId,
  feedbackSurface = "interview",
  problemType,
  problemTitle,
  code,
  language = "javascript",
  chatMessages,
  interviewerMessages,
  onExport,
  onClose,
  complexityAnalysis,
  alternativeApproaches,
  clarifyingQuestionsAssessment,
  afterScore,
  feedbackPending = false,
}: PracticeFeedbackProps) {
  useFeedbackViewAnalytics({
    sessionId,
    feedbackReady: !feedbackPending && Boolean(feedback.trim()),
    surface: feedbackSurface,
    problemType,
    language,
  })
  if (isGuidedLab)
    return (
      <GuidedLabReview
        assessment={guidedLabAssessment}
        contained={contained}
        problemTitle={problemTitle}
        testsPassed={testsPassed}
        testsTotal={testsTotal}
        onClose={onClose}
        afterReview={afterScore}
      />
    )
  // Parse feedback text, then override with structured data if available from API
  const parsedSections = parseFeedback(feedback)

  // If we have pre-parsed structured feedback from API, use it (more reliable than parsing)
  const sections = {
    ...parsedSections,
    whatWorked:
      structuredFeedback?.whatWorked && structuredFeedback.whatWorked.length > 0
        ? structuredFeedback.whatWorked
        : parsedSections.whatWorked,
    fixNext:
      structuredFeedback?.fixNext && structuredFeedback.fixNext.length > 0
        ? structuredFeedback.fixNext
        : parsedSections.fixNext,
    actionPlan:
      structuredFeedback?.actionPlan && structuredFeedback.actionPlan.length > 0
        ? structuredFeedback.actionPlan
        : parsedSections.actionPlan,
    tldr: structuredFeedback?.tldr || parsedSections.tldr,
  }

  const normalizeScore = (score: number | undefined): number => {
    // API scores and parseFeedback output both use the canonical 0–100 scale.
    // The parser handles explicit /10 denominators at the text boundary.
    if (score === undefined || !Number.isFinite(score)) return 0
    return Math.min(100, Math.max(0, score))
  }

  // Priority for scores:
  // 1. scoreBreakdown from backend (most authoritative)
  // 2. Parsed scores from feedback text
  // 3. Fallback estimation based on performanceScore (last resort)
  const hasBackendScores =
    scoreBreakdown &&
    (scoreBreakdown.understandingScore !== undefined ||
      scoreBreakdown.problemSolvingScore !== undefined ||
      scoreBreakdown.codeQualityScore !== undefined ||
      scoreBreakdown.communicationScore !== undefined)

  const hasParsedScores =
    sections.scores.understanding > 0 ||
    sections.scores.problemSolving > 0 ||
    sections.scores.codeQuality > 0 ||
    sections.scores.communication > 0

  // Calculate scores with clear priority chain
  let scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  }

  if (hasBackendScores) {
    // Use backend scores (most authoritative)
    // These should already be in 0-100 format from the API
    scores = {
      understanding: normalizeScore(scoreBreakdown!.understandingScore),
      problemSolving: normalizeScore(scoreBreakdown!.problemSolvingScore),
      codeQuality: normalizeScore(scoreBreakdown!.codeQualityScore),
      communication: normalizeScore(scoreBreakdown!.communicationScore),
    }
  } else if (hasParsedScores) {
    // Use parsed scores from feedback text
    // These might be in different formats, so normalize them
    scores = {
      understanding: normalizeScore(sections.scores.understanding || 0),
      problemSolving: normalizeScore(sections.scores.problemSolving || 0),
      codeQuality: normalizeScore(sections.scores.codeQuality || 0),
      communication: normalizeScore(sections.scores.communication || 0),
    }
  } else if (performanceScore > 0) {
    // Fallback: estimate category scores from overall performance score
    // This ensures category scores align with the overall score
    const baseScore = normalizeScore(performanceScore)
    scores = {
      understanding: baseScore,
      problemSolving: baseScore,
      codeQuality: baseScore,
      communication: baseScore,
    }
  } else {
    // No scores available
    scores = {
      understanding: 0,
      problemSolving: 0,
      codeQuality: 0,
      communication: 0,
    }
  }

  // Use performanceScore from the backend as the authoritative overall score
  // The backend calculates this using validated algorithms, score floors, and Constitutional AI critique
  // We should NOT recalculate from category scores as that would give different results
  const overallScore =
    performanceScore > 0
      ? normalizeScore(performanceScore)
      : sections.scores.overall > 0
        ? normalizeScore(sections.scores.overall)
        : 0

  const grade = getLetterGrade(overallScore)

  return (
    <ReviewFrame
      title="Interview feedback"
      contained={contained}
      summary={
        <ReviewSummary
          score={overallScore}
          grade={grade}
          problemTitle={problemTitle}
          testsPassed={testsPassed}
          testsTotal={testsTotal}
          elapsedTime={elapsedTime}
        />
      }
      actions={<ReviewClose onClose={onClose} />}
    >
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        {sections.tldr && (
          <p className="text-foreground max-w-prose text-sm leading-6">{sections.tldr}</p>
        )}
        <details className="border-border/60 rounded-xl border">
          <summary className="text-muted-foreground focus-visible:ring-ring min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm font-medium focus-visible:ring-2">
            Scores &amp; rubric
          </summary>
          <div className="px-3 pb-3">
            <ScoreDisplay
              sections={sections}
              overallScore={overallScore}
              technicalScore={technicalScore}
              testsPassed={testsPassed}
              testsTotal={testsTotal}
              elapsedTime={elapsedTime}
              problemType={problemType}
              onExport={onExport}
              problemTitle={problemTitle}
              grade={grade}
              scores={scores}
            />
          </div>
        </details>

        {afterScore}

        {!feedbackPending && (
          <FeedbackSections
            sections={sections}
            code={code}
            language={language}
            problemType={problemType}
            userId={userId}
            sessionId={sessionId}
            constitutionalAICritique={constitutionalAICritique}
            chatMessages={chatMessages}
            interviewerMessages={interviewerMessages}
            complexityAnalysis={complexityAnalysis}
            alternativeApproaches={alternativeApproaches}
            clarifyingQuestionsAssessment={clarifyingQuestionsAssessment}
          />
        )}
      </div>
    </ReviewFrame>
  )
}
