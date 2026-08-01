"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { getLetterGrade, GRADE_COLOR_CLASS } from "@/lib/constants"
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
  Download,
  Info,
  X,
  ArrowLeft,
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { calculateTechnicalScoreFromBreakdown } from "@/lib/constants"
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
  onExport?: () => void
  onClose?: () => void
  problemTitle?: string
  grade?: string
  scores?: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  }
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
  onExport,
  onClose,
  problemTitle,
  grade: gradeProp,
  scores: scoresProp,
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
    return Math.min(100, score <= 10 ? score * 10 : score)
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

  // Use stored technical score if available, otherwise derive it from the
  // breakdown using the canonical weights in lib/constants.
  const technicalScore =
    technicalScoreProp ??
    calculateTechnicalScoreFromBreakdown({
      codeQualityScore: scores.codeQuality,
      problemSolvingScore: scores.problemSolving,
      understandingScore: scores.understanding,
    })

  // Use technical or overall score based on toggle
  const displayScore = showTechnicalOnly ? technicalScore : overallScore
  const grade = getLetterGrade(displayScore)
  const color = GRADE_COLOR_CLASS[grade]

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
              name: "Investigation",
              score: scores.understanding,
              weight: "35%",
              icon: Search,
              colorClass: "text-sky-400",
            },
            {
              name: "Root Cause",
              score: scores.problemSolving,
              weight: "25%",
              icon: Bug,
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

  const handleExport = async () => {
    try {
      if (onExport) {
        onExport()
      } else {
        const { default: jsPDF } = await import("jspdf")
        const doc = new jsPDF()
        const margin = 20
        let y = 20

        doc.setFontSize(20)
        doc.setFont("helvetica", "bold")
        doc.text("CodeSparring - Interview Feedback", margin, y)
        y += 12

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(
          `${problemTitle || "Interview Session"} | ${new Date().toLocaleDateString()}`,
          margin,
          y
        )
        y += 15

        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.text(`Grade: ${gradeProp || grade} (${overallScore}/100)`, margin, y)
        y += 12

        doc.setFontSize(11)
        doc.setFont("helvetica", "normal")
        const exportScores = scoresProp || scores
        const criteria = [
          { name: "Understanding", score: exportScores.understanding, weight: "25%" },
          { name: "Problem-Solving", score: exportScores.problemSolving, weight: "25%" },
          { name: "Code Quality", score: exportScores.codeQuality, weight: "30%" },
          { name: "Communication", score: exportScores.communication, weight: "20%" },
        ]
        criteria.forEach((c) => {
          doc.text(`${c.name} (${c.weight}): ${c.score}%`, margin + 5, y)
          y += 6
        })

        doc.save(`codesparring-feedback-${Date.now()}.pdf`)
      }
    } catch (error) {
      console.error("Failed to export PDF:", error)
      alert("Failed to export PDF. Please try again.")
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Screen reader */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Grade: {grade}. Score: {displayScore}/100.
      </div>

      {/* Compact Header with Grade */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
        {/* Close Button - Apple-style prominent placement */}
        {onClose && (
          <div className="flex items-center justify-end border-b border-border/50 px-5 py-3">
            <button
              onClick={onClose}
              className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-sm font-medium text-muted-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" />
              Close
            </button>
          </div>
        )}
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowTechnicalOnly(!showTechnicalOnly)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                    showTechnicalOnly
                      ? "bg-violet-500/20 text-violet-400"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {showTechnicalOnly ? "Technical" : "Overall"}
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "transition-colors",
                        showTechnicalOnly
                          ? "text-violet-400 hover:text-violet-300"
                          : "text-muted-foreground hover:text-muted-foreground"
                      )}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-xs border border-border bg-muted text-foreground"
                  >
                    {showTechnicalOnly ? (
                      <div className="space-y-2 p-1">
                        <p className="font-semibold text-violet-400">Technical Score Breakdown</p>
                        <p className="text-[11px] text-muted-foreground">
                          Excludes communication - pure coding ability:
                        </p>
                        <ul className="space-y-1 text-[11px] text-muted-foreground">
                          <li>
                            <span className="font-medium text-violet-400">60%</span> Code Quality —
                            test pass rate, efficiency, complexity
                          </li>
                          <li>
                            <span className="font-medium text-violet-400">25%</span> Problem Solving
                            — approach, debugging, optimization attempts
                          </li>
                          <li>
                            <span className="font-medium text-violet-400">15%</span> Understanding —
                            code explanation, complexity analysis
                          </li>
                        </ul>
                        <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">
                          Technical can differ from Overall because it heavily weights Code Quality
                          (60%) while Overall includes Communication (20%) and weights Code Quality
                          at only 30%.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 p-1">
                        <p className="font-semibold text-foreground">Overall Score Breakdown</p>
                        <p className="text-[11px] text-muted-foreground">
                          Full interview performance including soft skills:
                        </p>
                        <ul className="space-y-1 text-[11px] text-muted-foreground">
                          <li>
                            <span className="font-medium text-foreground">30%</span> Code Quality —
                            test pass rate, efficiency, complexity
                          </li>
                          <li>
                            <span className="font-medium text-foreground">25%</span> Problem Solving —
                            approach, debugging, optimization attempts
                          </li>
                          <li>
                            <span className="font-medium text-foreground">25%</span> Understanding —
                            code explanation, complexity analysis
                          </li>
                          <li>
                            <span className="font-medium text-foreground">20%</span> Communication —
                            thought process, answering questions
                          </li>
                        </ul>
                        <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">
                          Click to see Technical score which excludes communication and focuses on
                          pure coding ability.
                        </p>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* TL;DR */}
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-muted-foreground">
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
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsedTime)}
                </span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Export feedback as PDF"
                >
                  <Download className="h-3 w-3" />
                  Export
                </button>
                {problemType === "system-design" ? (
                  <>
                    <span className="flex items-center gap-1">
                      {hasRequirements ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                      )}
                      Requirements
                    </span>
                    <span className="flex items-center gap-1">
                      {hasScalability ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
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
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                      )}
                      Bug Found
                    </span>
                    <span className="flex items-center gap-1">
                      {hasRootCause ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
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
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                      )}
                      Complexity
                    </span>
                    <span className="flex items-center gap-1">
                      {edgeCasesDiscussed ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
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
          <div key={item.name} className="rounded-xl border border-border/50 bg-card/50 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <item.icon className={cn("h-3.5 w-3.5", item.colorClass)} />
              <span className="text-[11px] text-muted-foreground">{item.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{item.weight}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">{item.score}%</span>
              <Progress value={item.score} className="h-1 flex-1 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
