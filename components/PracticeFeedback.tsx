"use client"

import { parseFeedback } from "@/lib/feedback/parsers"
import { ScoreDisplay, FeedbackSections } from "@/components/practice"
import type { ChatMessage } from "@/lib/types"
import type { SessionComplexityAnalysis } from "@/lib/rag/knowledge-base/types"

interface AlternativeApproach {
  name: string
  timeComplexity: string
  spaceComplexity: string
  tradeOff: string
  isOptimalTime: boolean
  isOptimalSpace: boolean
}

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
}

export default function PracticeFeedback({
  feedback,
  performanceScore,
  technicalScore,
  scoreBreakdown,
  constitutionalAICritique,
  structuredFeedback,
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
  onExport,
  onNewProblem,
  onClose,
  complexityAnalysis,
  alternativeApproaches,
  clarifyingQuestionsAssessment,
}: PracticeFeedbackProps) {
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
    if (score === undefined || score === null || isNaN(score)) return 0
    // Normalize: if score is <= 10, assume it's on a 0-10 scale and multiply by 10
    // Otherwise, assume it's already on a 0-100 scale
    return score <= 10 ? score * 10 : score
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
        onExport={onExport}
        onClose={onClose}
        problemTitle={problemTitle}
        grade={grade}
        scores={scores}
      />

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
        complexityAnalysis={complexityAnalysis}
        alternativeApproaches={alternativeApproaches}
        clarifyingQuestionsAssessment={clarifyingQuestionsAssessment}
      />
    </div>
  )
}
