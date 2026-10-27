"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { getLetterGrade, GRADE_COLOR_CLASS, SCORING } from "@/lib/constants"
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
  Download,
  Info,
  ArrowLeft,
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { calculateTechnicalScoreFromBreakdown } from "@/lib/constants"
import type { FeedbackSection } from "@/lib/feedback/parsers"
import { BUGFIX_SCORE_CATEGORIES, bugfixCategoryOverallWeight } from "@/lib/bugfix/score-dimensions"
import { DebuggingScoreTooltip } from "./DebuggingScoreTooltip"

interface ScoreDisplayProps {
  sections: FeedbackSection
  overallScore: number
  technicalScore?: number // Pre-calculated technical score from backend
  testsPassed: number
  testsTotal: number
  elapsedTime: number
  problemType?: string
  onExport?: () => void
  onClose?: () => void
  problemTitle?: string
  grade?: string
  scores: {
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
  technicalScore: technicalScoreProp,
  testsPassed,
  testsTotal,
  elapsedTime,
  problemType,
  onExport,
  onClose,
  problemTitle,
  grade: gradeProp,
  scores,
}: ScoreDisplayProps) {
  const [showTechnicalOnly, setShowTechnicalOnly] = useState(false)
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
            weight: `${SCORING.SYSTEM_DESIGN_WEIGHTS.UNDERSTANDING * 100}%`,
            icon: Search,
            colorClass: "text-sky-400",
          },
          {
            name: "Architecture",
            score: scores.problemSolving,
            weight: `${SCORING.SYSTEM_DESIGN_WEIGHTS.PROBLEM_SOLVING * 100}%`,
            icon: Layers,
            colorClass: "text-emerald-400",
          },
          {
            name: "Scalability",
            score: scores.codeQuality,
            weight: `${SCORING.SYSTEM_DESIGN_WEIGHTS.CODE_QUALITY * 100}%`,
            icon: Scale,
            colorClass: "text-violet-400",
          },
          {
            name: "Communication",
            score: scores.communication,
            weight: `${SCORING.SYSTEM_DESIGN_WEIGHTS.COMMUNICATION * 100}%`,
            icon: MessageSquare,
            colorClass: "text-amber-400",
          },
        ]
      : problemType === "bugfix"
        ? [
            {
              category: "understanding" as const,
              name: BUGFIX_SCORE_CATEGORIES.understanding.label,
              score: scores.understanding,
              weight: `${bugfixCategoryOverallWeight("understanding")}%`,
              icon: Search,
              colorClass: "text-sky-400",
            },
            {
              category: "problemSolving" as const,
              name: BUGFIX_SCORE_CATEGORIES.problemSolving.label,
              score: scores.problemSolving,
              weight: `${bugfixCategoryOverallWeight("problemSolving")}%`,
              icon: Bug,
              colorClass: "text-emerald-400",
            },
            {
              category: "codeQuality" as const,
              name: BUGFIX_SCORE_CATEGORIES.codeQuality.label,
              score: scores.codeQuality,
              weight: `${bugfixCategoryOverallWeight("codeQuality")}%`,
              icon: Wrench,
              colorClass: "text-violet-400",
            },
            {
              category: "communication" as const,
              name: BUGFIX_SCORE_CATEGORIES.communication.label,
              score: scores.communication,
              weight: `${bugfixCategoryOverallWeight("communication")}%`,
              icon: MessageSquare,
              colorClass: "text-amber-400",
            },
          ]
        : [
            {
              name: "Understanding",
              score: scores.understanding,
              weight: `${SCORING.PERFORMANCE_WEIGHTS.UNDERSTANDING * 100}%`,
              icon: Lightbulb,
              colorClass: "text-sky-400",
            },
            {
              name: "Problem-Solving",
              score: scores.problemSolving,
              weight: `${SCORING.PERFORMANCE_WEIGHTS.PROBLEM_SOLVING * 100}%`,
              icon: Zap,
              colorClass: "text-emerald-400",
            },
            {
              name: "Code Quality",
              score: scores.codeQuality,
              weight: `${SCORING.PERFORMANCE_WEIGHTS.CODE_QUALITY * 100}%`,
              icon: Code,
              colorClass: "text-violet-400",
            },
            {
              name: "Communication",
              score: scores.communication,
              weight: `${SCORING.PERFORMANCE_WEIGHTS.COMMUNICATION * 100}%`,
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
        const criteria = scoreItems
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
      <div className="border-border/50 bg-card/50 overflow-hidden rounded-2xl border">
        {/* Close Button - Apple-style prominent placement */}
        {onClose && (
          <div className="border-border/50 flex items-center justify-end border-b px-5 py-3">
            <button
              onClick={onClose}
              className="bg-muted text-muted-foreground hover:bg-muted hover:text-foreground flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-sm transition-all duration-200 active:scale-[0.98]"
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
                    className="border-border bg-muted text-foreground max-w-xs border"
                  >
                    {showTechnicalOnly ? (
                      <div className="space-y-2 p-1">
                        <p className="font-semibold">Technical score</p>
                        <p className="text-xs leading-relaxed">
                          {technicalScoreProp === undefined
                            ? "Estimated from saved categories: 60% code quality, 25% problem solving, and 15% understanding."
                            : "Uses your saved technical result. Current scoring combines 80% judged test correctness with 20% recorded hint use. Elapsed time does not affect it; historical sessions retain their original rules."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 p-1">
                        <p className="font-semibold">Overall score</p>
                        <ul className="space-y-1 text-xs">
                          {scoreItems.map((entry) => (
                            <li key={entry.name}>
                              {entry.name}: {entry.weight}
                            </li>
                          ))}
                        </ul>
                        {problemType === "bugfix" && (
                          <p className="text-xs">
                            Hover or focus each card for its subcategories and individual weights.
                          </p>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* TL;DR */}
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-sm leading-relaxed">
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
              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span
                  className="flex items-center gap-1"
                  title="Elapsed session time, including pauses"
                >
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsedTime)}
                </span>
                <button
                  onClick={handleExport}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors"
                  title="Export feedback as PDF"
                >
                  <Download className="h-3 w-3" />
                  Export
                </button>
                {testsTotal > 0 && (
                  <span>
                    {testsPassed}/{testsTotal} tests passed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown - Horizontal compact cards */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {scoreItems.map((item) => {
          const isDebugging = problemType === "bugfix" && "category" in item
          const card = (
            <div
              key={item.name}
              role={isDebugging ? "group" : undefined}
              tabIndex={isDebugging ? 0 : undefined}
              aria-label={isDebugging ? `${item.name} score details` : undefined}
              className={cn(
                "border-border/50 bg-card/50 rounded-xl border p-3",
                isDebugging &&
                  "focus-visible:ring-ring cursor-help focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <item.icon className={cn("h-3.5 w-3.5", item.colorClass)} />
                <span className="text-muted-foreground text-[11px]">{item.name}</span>
                {isDebugging && (
                  <Info className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden="true" />
                )}
                <span
                  className="text-muted-foreground ml-auto text-[10px]"
                  aria-label={isDebugging ? `${item.weight} combined overall weight` : undefined}
                >
                  {item.weight}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-lg font-semibold">{item.score}%</span>
                <Progress value={item.score} className="bg-muted h-1 flex-1" />
              </div>
            </div>
          )
          return isDebugging ? (
            <DebuggingScoreTooltip key={item.name} category={item.category}>
              {card}
            </DebuggingScoreTooltip>
          ) : (
            card
          )
        })}
      </div>
    </div>
  )
}
