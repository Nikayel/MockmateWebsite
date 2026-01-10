"use client"

import { parseFeedback } from "@/lib/feedback/parsers"
import { ScoreDisplay, FeedbackSections, FeedbackActions } from "@/components/practice"
import type { ChatMessage } from "@/lib/types"

interface PracticeFeedbackProps {
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
  testsPassed: number
  testsTotal: number
  timeComplexity?: string
  spaceComplexity?: string
  efficiencyScore?: number
  elapsedTime?: number
  userId?: string
  problemType?: string
  difficulty?: string
  problemTitle?: string
  code?: string
  language?: string
  chatMessages?: ChatMessage[]
  interviewerMessages?: ChatMessage[]
  onRetry?: () => void
  onNewProblem?: () => void
  onExport?: () => void
  onEndInterview?: () => void
}

export default function PracticeFeedback({
  feedback,
  performanceScore,
  technicalScore,
  scoreBreakdown,
  constitutionalAICritique,
  testsPassed,
  testsTotal,
  timeComplexity,
  spaceComplexity,
  efficiencyScore,
  elapsedTime = 0,
  userId,
  problemType,
  difficulty,
  problemTitle,
  code,
  language = "javascript",
  chatMessages,
  interviewerMessages,
  onRetry,
  onNewProblem,
  onExport,
  onEndInterview,
}: PracticeFeedbackProps) {
  const sections = parseFeedback(feedback)
  const feedbackLower = feedback.toLowerCase()

  // Calculate scores with fallback logic
  const hasParsedScores =
    sections.scores.understanding > 0 ||
    sections.scores.problemSolving > 0 ||
    sections.scores.codeQuality > 0 ||
    sections.scores.communication > 0

  if (!hasParsedScores && performanceScore > 0) {
    const baseScore = performanceScore <= 10 ? performanceScore * 10 : performanceScore
    const testPassRateVal = testsTotal > 0 ? testsPassed / testsTotal : 1
    const hasCommunicationIssues =
      feedbackLower.includes("explain") || feedbackLower.includes("thought process")

    sections.scores.understanding = Math.round(baseScore * testPassRateVal * 0.9)
    sections.scores.problemSolving = Math.round(baseScore * (testPassRateVal > 0.8 ? 1 : 0.8))
    sections.scores.codeQuality = Math.round(baseScore * testPassRateVal)
    sections.scores.communication = Math.round(baseScore * (hasCommunicationIssues ? 0.5 : 0.7))

    sections.scores.overall = Math.round(
      sections.scores.understanding * 0.25 +
        sections.scores.problemSolving * 0.25 +
        sections.scores.codeQuality * 0.3 +
        sections.scores.communication * 0.2
    )
  }

  const normalizeScore = (score: number) => (score <= 10 ? score * 10 : score)

  const scores = {
    understanding: normalizeScore(sections.scores.understanding || 0),
    problemSolving: normalizeScore(sections.scores.problemSolving || 0),
    codeQuality: normalizeScore(sections.scores.codeQuality || 0),
    communication: normalizeScore(sections.scores.communication || 0),
  }

  // Calculate weighted average from category scores using canonical weights
  // SCORE_WEIGHTS.performance: U=25%, PS=25%, CQ=30%, Comm=20%
  const hasValidCategoryScores =
    scores.understanding > 0 ||
    scores.problemSolving > 0 ||
    scores.codeQuality > 0 ||
    scores.communication > 0

  const weightedAverage = hasValidCategoryScores
    ? Math.round(
        scores.understanding * 0.25 +
          scores.problemSolving * 0.25 +
          scores.codeQuality * 0.3 +
          scores.communication * 0.2
      )
    : 0

  // Use performanceScore from the backend as the authoritative overall score
  // The backend calculates this using validated algorithms, score floors, and Constitutional AI critique
  // We should NOT recalculate from category scores as that would give different results
  const overallScore =
    performanceScore > 0
      ? normalizeScore(performanceScore)
      : weightedAverage > 0
        ? weightedAverage
        : sections.scores.overall > 0
          ? normalizeScore(sections.scores.overall)
          : 0

  const getLetterGrade = (score: number) => {
    if (score >= 95) return { grade: "A+", color: "text-emerald-400" }
    if (score >= 90) return { grade: "A", color: "text-emerald-400" }
    if (score >= 85) return { grade: "A-", color: "text-emerald-400" }
    if (score >= 80) return { grade: "B+", color: "text-sky-400" }
    if (score >= 75) return { grade: "B", color: "text-sky-400" }
    if (score >= 70) return { grade: "B-", color: "text-sky-400" }
    if (score >= 65) return { grade: "C+", color: "text-amber-400" }
    if (score >= 60) return { grade: "C", color: "text-amber-400" }
    if (score >= 55) return { grade: "C-", color: "text-amber-400" }
    if (score >= 50) return { grade: "D", color: "text-orange-400" }
    return { grade: "F", color: "text-red-400" }
  }

  const { grade } = getLetterGrade(overallScore)

  return (
    <div className="w-full space-y-4">
      <ScoreDisplay
        sections={sections}
        overallScore={overallScore}
        performanceScore={performanceScore}
        technicalScore={technicalScore}
        scoreBreakdown={scoreBreakdown}
        testsPassed={testsPassed}
        testsTotal={testsTotal}
        elapsedTime={elapsedTime}
        problemType={problemType}
        feedback={feedback}
        timeComplexity={timeComplexity}
        spaceComplexity={spaceComplexity}
        efficiencyScore={efficiencyScore}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50">
        <FeedbackActions
          onRetry={onRetry}
          onNewProblem={onNewProblem}
          onExport={onExport}
          onEndInterview={onEndInterview}
          overallScore={overallScore}
          problemTitle={problemTitle}
          grade={grade}
          scores={scores}
        />
      </div>

      <FeedbackSections
        sections={sections}
        code={code}
        language={language}
        problemType={problemType}
        userId={userId}
        difficulty={difficulty}
        problemTitle={problemTitle}
        feedback={feedback}
        overallScore={overallScore}
        constitutionalAICritique={constitutionalAICritique}
        onNewProblem={onNewProblem}
        chatMessages={chatMessages}
        interviewerMessages={interviewerMessages}
      />
    </div>
  )
}
