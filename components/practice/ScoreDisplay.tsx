"use client"

import { Progress } from "@/components/ui/progress"
import { getLetterGrade, SCORING } from "@/lib/constants"
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
  Download,
  Info,
  ChevronDown,
} from "lucide-react"
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
  problemType?: string
  onExport?: () => void
  problemTitle?: string
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  }
}

export function ScoreDisplay({
  sections,
  overallScore,
  technicalScore: technicalScoreProp,
  testsPassed,
  testsTotal,
  problemType,
  onExport,
  problemTitle,
  scores,
}: ScoreDisplayProps) {
  // Use stored technical score if available, otherwise derive it from the
  // breakdown using the canonical weights in lib/constants.
  const technicalScore =
    technicalScoreProp ??
    calculateTechnicalScoreFromBreakdown({
      codeQualityScore: scores.codeQuality,
      problemSolvingScore: scores.problemSolving,
      understandingScore: scores.understanding,
    })

  const grade = getLetterGrade(overallScore)

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
        doc.text(`Grade: ${grade} (${overallScore}/100)`, margin, y)
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
    <section
      aria-label="Session result"
      className="border-border/60 overflow-hidden rounded-xl border"
    >
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Grade: {grade}. Score: {overallScore}/100.
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:p-6">
        <div className="border-border/60 border-b pb-4 sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
          <h2 className="text-muted-foreground text-sm font-medium">Interview score</h2>
          <p
            className="text-foreground mt-2 flex items-baseline gap-1 tabular-nums"
            aria-label={`${Math.round(overallScore)} out of 100`}
          >
            <span className="text-4xl font-semibold tracking-tight">
              {Math.round(overallScore)}
            </span>
            <span className="text-muted-foreground text-base">/100</span>
          </p>
          <p className="text-muted-foreground mt-2 text-sm">Grade {grade}</p>
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-sm font-medium">Summary</h2>
          <p className="text-foreground mt-2 max-w-prose text-sm leading-6">
            {sections.tldr || "Review the score breakdown and feedback below."}
          </p>
          {testsTotal > 0 && problemType !== "system-design" && (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">Tests</span>
              <span className="text-foreground font-medium tabular-nums">
                {testsPassed}/{testsTotal} passed
              </span>
              <span className="text-muted-foreground text-xs">
                One part of the interview assessment
              </span>
            </div>
          )}
        </div>
      </div>
      <details className="group border-border/60 border-t">
        <summary className="text-foreground focus-visible:ring-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-inset sm:px-6 [&::-webkit-details-marker]:hidden">
          Score breakdown
          <ChevronDown
            className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-muted-foreground text-sm leading-6">
            Each category shows its score and weight in the overall assessment.
            {problemType === "bugfix" && " Focus or hover a category for its rubric."}
          </p>
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
                    <item.icon
                      className={cn("h-3.5 w-3.5 shrink-0", item.colorClass)}
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground min-w-0 text-xs break-words">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-lg font-semibold">{item.score}%</span>
                    <Progress value={item.score} className="bg-muted h-1 flex-1" />
                  </div>
                  <p
                    className="text-muted-foreground mt-2 flex items-center gap-1 text-xs"
                    aria-label={isDebugging ? `${item.weight} combined overall weight` : undefined}
                  >
                    {item.weight} weight
                    {isDebugging && <Info className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  </p>
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
          <div className="border-border/60 flex flex-wrap items-start justify-between gap-3 border-t pt-4">
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-foreground text-sm font-medium">
                Technical score: {Math.round(technicalScore)}/100
              </p>
              <p className="text-muted-foreground mt-1 max-w-prose text-xs leading-5">
                {technicalScoreProp === undefined
                  ? "Estimated from saved categories: 60% code quality, 25% problem solving, and 15% understanding. Excludes communication."
                  : "Your saved technical result, excluding communication. Historical sessions retain their original scoring rules."}
              </p>
            </div>
            <button
              onClick={handleExport}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm focus-visible:ring-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export PDF
            </button>
          </div>
        </div>
      </details>
    </section>
  )
}
