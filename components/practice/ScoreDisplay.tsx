"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import {
  Lightbulb,
  Zap,
  Code,
  MessageSquare,
  Search,
  Layers,
  Scale,
  Bug,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { FeedbackSection } from "@/lib/feedback/parsers"

interface ScoreDisplayProps {
  sections: FeedbackSection
  overallScore: number
  performanceScore: number
  technicalScore?: number // Pre-calculated technical score from backend
  scoreBreakdown?: {
    understandingScore?: number
    problemSolvingScore?: number
    codeQualityScore?: number
    communicationScore?: number
  }
  testsPassed: number
  testsTotal: number
  elapsedTime: number
  problemType?: string
  feedback: string
  timeComplexity?: string
  spaceComplexity?: string
  efficiencyScore?: number
}

function getLetterGrade(score: number) {
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

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m` : `${seconds}s`
}

export function ScoreDisplay({
  sections,
  overallScore,
  performanceScore,
  technicalScore: technicalScoreProp,
  scoreBreakdown,
  testsPassed,
  testsTotal,
  elapsedTime,
  problemType,
  feedback,
  timeComplexity,
  spaceComplexity,
  efficiencyScore,
}: ScoreDisplayProps) {
  const [showTechnicalOnly, setShowTechnicalOnly] = useState(false)
  const feedbackLower = feedback.toLowerCase()

  // Derived metrics based on problem type
  const testPassRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0
  const solutionWorks = testPassRate >= 50
  const complexityAccurate = (efficiencyScore || 0) >= 70 && solutionWorks

  const edgeCasesDiscussed =
    /edge cases considered:\s*yes/i.test(feedback) ||
    /discussed.*edge case/i.test(feedback) ||
    /mentioned.*edge case/i.test(feedback) ||
    feedbackLower.includes("edge case") ||
    feedbackLower.includes("corner case")

  const hasRequirements =
    feedbackLower.includes("requirement") ||
    feedbackLower.includes("clarif") ||
    feedbackLower.includes("scope")
  const hasScalability =
    feedbackLower.includes("scal") ||
    feedbackLower.includes("performance") ||
    feedbackLower.includes("load") ||
    feedbackLower.includes("capacity")
  const hasBugIdentified =
    feedbackLower.includes("bug") ||
    feedbackLower.includes("issue") ||
    feedbackLower.includes("problem") ||
    feedbackLower.includes("error")
  const hasRootCause =
    feedbackLower.includes("root cause") ||
    feedbackLower.includes("because") ||
    feedbackLower.includes("reason") ||
    feedbackLower.includes("why")

  const normalizeScore = (score: number | undefined): number => {
    if (score === undefined || score === null || isNaN(score)) return 0
    // Normalize: if score is <= 10, assume it's on a 0-10 scale and multiply by 10
    // Otherwise, assume it's already on a 0-100 scale
    return score <= 10 ? score * 10 : score
  }

  // Priority for category scores:
  // 1. scoreBreakdown from backend (most authoritative)
  // 2. Parsed scores from feedback text
  // 3. Fallback to performanceScore for all categories
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
    // Fallback: use performanceScore for all categories
    const baseScore = normalizeScore(performanceScore)
    scores = {
      understanding: baseScore,
      problemSolving: baseScore,
      codeQuality: baseScore,
      communication: baseScore,
    }
  } else {
    scores = {
      understanding: 0,
      problemSolving: 0,
      codeQuality: 0,
      communication: 0,
    }
  }

  // Use stored technical score if available, otherwise calculate from breakdown
  // Technical score weights from lib/scoring/types.ts:
  // codeQuality: 60%, problemSolving: 25%, understanding: 15%
  const technicalScore =
    technicalScoreProp ??
    Math.round(
      scores.codeQuality * 0.6 + scores.problemSolving * 0.25 + scores.understanding * 0.15
    )

  // Use technical or overall score based on toggle
  const displayScore = showTechnicalOnly ? technicalScore : overallScore
  const { grade, color } = getLetterGrade(displayScore)

  // Score items config based on problem type
  const scoreItems =
    problemType === "system-design"
      ? [
          {
            name: "Requirements",
            score: scores.understanding,
            weight: "20%",
            icon: Search,
            colorClass: "text-sky-400",
          },
          {
            name: "Architecture",
            score: scores.problemSolving,
            weight: "30%",
            icon: Layers,
            colorClass: "text-emerald-400",
          },
          {
            name: "Scalability",
            score: scores.codeQuality,
            weight: "20%",
            icon: Scale,
            colorClass: "text-violet-400",
          },
          {
            name: "Communication",
            score: scores.communication,
            weight: "30%",
            icon: MessageSquare,
            colorClass: "text-amber-400",
          },
        ]
      : problemType === "bugfix"
        ? [
            {
              name: "Bug Found",
              score: scores.understanding,
              weight: "35%",
              icon: Bug,
              colorClass: "text-sky-400",
            },
            {
              name: "Root Cause",
              score: scores.problemSolving,
              weight: "25%",
              icon: Search,
              colorClass: "text-emerald-400",
            },
            {
              name: "Fix Quality",
              score: scores.codeQuality,
              weight: "20%",
              icon: Wrench,
              colorClass: "text-violet-400",
            },
            {
              name: "Communication",
              score: scores.communication,
              weight: "20%",
              icon: MessageSquare,
              colorClass: "text-amber-400",
            },
          ]
        : [
            {
              name: "Understanding",
              score: scores.understanding,
              weight: "25%",
              icon: Lightbulb,
              colorClass: "text-sky-400",
            },
            {
              name: "Problem-Solving",
              score: scores.problemSolving,
              weight: "25%",
              icon: Zap,
              colorClass: "text-emerald-400",
            },
            {
              name: "Code Quality",
              score: scores.codeQuality,
              weight: "30%",
              icon: Code,
              colorClass: "text-violet-400",
            },
            {
              name: "Communication",
              score: scores.communication,
              weight: "20%",
              icon: MessageSquare,
              colorClass: "text-amber-400",
            },
          ]

  return (
    <div className="w-full space-y-4">
      {/* Screen reader */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Grade: {grade}. Score: {displayScore}/100.
      </div>

      {/* Compact Header with Grade */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50">
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Grade Circle - Compact with score toggle */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl border",
                  displayScore >= 80
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : displayScore >= 60
                      ? "border-sky-500/30 bg-sky-500/10"
                      : displayScore >= 40
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-red-500/30 bg-red-500/10"
                )}
              >
                <div className="flex flex-col items-center">
                  <span className={cn("text-xl leading-none font-bold", color)}>{grade}</span>
                  <span className={cn("text-[10px] font-medium", color)}>
                    {Math.round(displayScore)}%
                  </span>
                </div>
              </div>
              {/* Score type toggle */}
              <button
                onClick={() => setShowTechnicalOnly(!showTechnicalOnly)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  showTechnicalOnly
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700"
                )}
                title={
                  showTechnicalOnly
                    ? "Technical score: Test pass rate (60%), Time efficiency (25%), Independence (15%)"
                    : "Overall score: Includes communication (20%)"
                }
              >
                {showTechnicalOnly ? "Technical" : "Overall"}
              </button>
            </div>

            {/* TL;DR */}
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-zinc-300">
                {sections.tldr ||
                  (problemType === "system-design"
                    ? overallScore < 25
                      ? `Submitted without engagement. No design discussion provided.`
                      : overallScore < 40
                        ? `Minimal system design discussion. More participation needed.`
                        : `Completed design discussion in ${formatTime(elapsedTime)}.`
                    : problemType === "bugfix"
                      ? `Completed bug fix in ${formatTime(elapsedTime)}. Fixed ${testsPassed}/${testsTotal} issues.`
                      : `Completed ${testsPassed}/${testsTotal} tests in ${formatTime(elapsedTime)}.`)}
              </p>

              {/* Quick stats */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsedTime)}
                </span>
                {problemType === "system-design" ? (
                  <>
                    <span className="flex items-center gap-1">
                      {hasRequirements ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-zinc-600" />
                      )}
                      Requirements
                    </span>
                    <span className="flex items-center gap-1">
                      {hasScalability ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-zinc-600" />
                      )}
                      Scalability
                    </span>
                  </>
                ) : problemType === "bugfix" ? (
                  <>
                    <span className="flex items-center gap-1">
                      {hasBugIdentified ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-zinc-600" />
                      )}
                      Bug Found
                    </span>
                    <span className="flex items-center gap-1">
                      {hasRootCause ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-zinc-600" />
                      )}
                      Root Cause
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      {complexityAccurate ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-zinc-600" />
                      )}
                      Complexity
                    </span>
                    <span className="flex items-center gap-1">
                      {edgeCasesDiscussed ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-zinc-600" />
                      )}
                      Edge Cases
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown - Horizontal compact cards */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {scoreItems.map((item) => (
          <div key={item.name} className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <item.icon className={cn("h-3.5 w-3.5", item.colorClass)} />
              <span className="text-[11px] text-zinc-400">{item.name}</span>
              <span className="ml-auto text-[10px] text-zinc-600">{item.weight}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">{item.score}%</span>
              <Progress value={item.score} className="h-1 flex-1 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
