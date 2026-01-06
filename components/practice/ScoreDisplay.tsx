"use client"

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
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { FeedbackSection } from "@/lib/feedback/parsers"

interface ScoreDisplayProps {
  sections: FeedbackSection
  overallScore: number
  performanceScore: number
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
  testsPassed,
  testsTotal,
  elapsedTime,
  problemType,
  feedback,
  timeComplexity,
  spaceComplexity,
  efficiencyScore
}: ScoreDisplayProps) {
  const { grade, color } = getLetterGrade(overallScore)
  const feedbackLower = feedback.toLowerCase()

  // Derived metrics based on problem type
  const testPassRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0
  const solutionWorks = testPassRate >= 50
  const complexityAccurate = (efficiencyScore || 0) >= 70 && solutionWorks

  const edgeCasesDiscussed = /edge cases considered:\s*yes/i.test(feedback) ||
    /discussed.*edge case/i.test(feedback) ||
    /mentioned.*edge case/i.test(feedback) ||
    feedbackLower.includes('edge case') || feedbackLower.includes('corner case')

  const hasRequirements = feedbackLower.includes('requirement') || feedbackLower.includes('clarif') || feedbackLower.includes('scope')
  const hasScalability = feedbackLower.includes('scal') || feedbackLower.includes('performance') || feedbackLower.includes('load') || feedbackLower.includes('capacity')
  const hasBugIdentified = feedbackLower.includes('bug') || feedbackLower.includes('issue') || feedbackLower.includes('problem') || feedbackLower.includes('error')
  const hasRootCause = feedbackLower.includes('root cause') || feedbackLower.includes('because') || feedbackLower.includes('reason') || feedbackLower.includes('why')

  const normalizeScore = (score: number) => score <= 10 ? score * 10 : score

  const scores = {
    understanding: normalizeScore(sections.scores.understanding || 0),
    problemSolving: normalizeScore(sections.scores.problemSolving || 0),
    codeQuality: normalizeScore(sections.scores.codeQuality || 0),
    communication: normalizeScore(sections.scores.communication || 0),
  }

  // Score items config based on problem type
  const scoreItems = problemType === 'system-design' ? [
    { name: "Requirements", score: scores.understanding, weight: "20%", icon: Search, colorClass: "text-sky-400" },
    { name: "Architecture", score: scores.problemSolving, weight: "30%", icon: Layers, colorClass: "text-emerald-400" },
    { name: "Scalability", score: scores.codeQuality, weight: "20%", icon: Scale, colorClass: "text-violet-400" },
    { name: "Communication", score: scores.communication, weight: "30%", icon: MessageSquare, colorClass: "text-amber-400" },
  ] : problemType === 'bugfix' ? [
    { name: "Bug Found", score: scores.understanding, weight: "35%", icon: Bug, colorClass: "text-sky-400" },
    { name: "Root Cause", score: scores.problemSolving, weight: "25%", icon: Search, colorClass: "text-emerald-400" },
    { name: "Fix Quality", score: scores.codeQuality, weight: "20%", icon: Wrench, colorClass: "text-violet-400" },
    { name: "Communication", score: scores.communication, weight: "20%", icon: MessageSquare, colorClass: "text-amber-400" },
  ] : [
    { name: "Understanding", score: scores.understanding, weight: "30%", icon: Lightbulb, colorClass: "text-sky-400" },
    { name: "Problem-Solving", score: scores.problemSolving, weight: "25%", icon: Zap, colorClass: "text-emerald-400" },
    { name: "Code Quality", score: scores.codeQuality, weight: "25%", icon: Code, colorClass: "text-violet-400" },
    { name: "Communication", score: scores.communication, weight: "20%", icon: MessageSquare, colorClass: "text-amber-400" },
  ]

  return (
    <div className="w-full space-y-4">
      {/* Screen reader */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Grade: {grade}. Score: {overallScore}/100.
      </div>

      {/* Compact Header with Grade */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Grade Circle - Compact */}
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center border shrink-0",
              overallScore >= 80 ? "border-emerald-500/30 bg-emerald-500/10" :
                overallScore >= 60 ? "border-sky-500/30 bg-sky-500/10" :
                  overallScore >= 40 ? "border-amber-500/30 bg-amber-500/10" :
                    "border-red-500/30 bg-red-500/10"
            )}>
              <span className={cn("text-xl font-bold", color)}>{grade}</span>
            </div>

            {/* TL;DR */}
            <div className="flex-1 min-w-0">
              <p className="text-zinc-300 text-sm leading-relaxed">
                {sections.tldr || (
                  problemType === 'system-design'
                    ? (overallScore < 25
                        ? `Submitted without engagement. No design discussion provided.`
                        : overallScore < 40
                          ? `Minimal system design discussion. More participation needed.`
                          : `Completed design discussion in ${formatTime(elapsedTime)}.`)
                    : problemType === 'bugfix'
                      ? `Completed bug fix in ${formatTime(elapsedTime)}. Fixed ${testsPassed}/${testsTotal} issues.`
                      : `Completed ${testsPassed}/${testsTotal} tests in ${formatTime(elapsedTime)}.`
                )}
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsedTime)}
                </span>
                {problemType === 'system-design' ? (
                  <>
                    <span className="flex items-center gap-1">
                      {hasRequirements ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-zinc-600" />}
                      Requirements
                    </span>
                    <span className="flex items-center gap-1">
                      {hasScalability ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-zinc-600" />}
                      Scalability
                    </span>
                  </>
                ) : problemType === 'bugfix' ? (
                  <>
                    <span className="flex items-center gap-1">
                      {hasBugIdentified ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-zinc-600" />}
                      Bug Found
                    </span>
                    <span className="flex items-center gap-1">
                      {hasRootCause ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-zinc-600" />}
                      Root Cause
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      {complexityAccurate ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-zinc-600" />}
                      Complexity
                    </span>
                    <span className="flex items-center gap-1">
                      {edgeCasesDiscussed ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-zinc-600" />}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {scoreItems.map((item) => (
          <div key={item.name} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <item.icon className={cn("h-3.5 w-3.5", item.colorClass)} />
              <span className="text-[11px] text-zinc-400">{item.name}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">{item.weight}</span>
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
