"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  TrendingUp,
  Target,
  Code,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Play,
  Download,
  Sparkles,
  Clock,
  Lightbulb,
  AlertTriangle,
  Zap,
  BookOpen,
  Layers,
  Scale,
  Search,
  Bug,
  Wrench,
  XCircle,
  MessageSquare
} from "lucide-react"
import { LearningRecommendations } from "@/components/LearningRecommendations"
import { NextProblemRecommendations } from "@/components/NextProblemRecommendations"
import { cn } from "@/lib/utils"

interface FeedbackSection {
  tldr: string
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    correctness: number
    efficiency: number
    reasoning: number
    aiCollaboration: number
    overall: number
  }
  scoreJustifications: {
    understanding?: string
    problemSolving?: string
    codeQuality?: string
    communication?: string
    correctness?: string
    efficiency?: string
    reasoning?: string
    aiCollaboration?: string
    overall?: string
  }
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  aiWatchlist: string
}

interface PracticeFeedbackProps {
  feedback: string
  performanceScore: number
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
  onRetry?: () => void
  onNewProblem?: () => void
  onExport?: () => void
  onEndInterview?: () => void
}

function parseFeedback(feedback: string): FeedbackSection {
  const sections: FeedbackSection = {
    tldr: "",
    scores: {
      understanding: 0,
      problemSolving: 0,
      codeQuality: 0,
      communication: 0,
      correctness: 0,
      efficiency: 0,
      reasoning: 0,
      aiCollaboration: 0,
      overall: 0,
    },
    scoreJustifications: {},
    whatWorked: [],
    fixNext: [],
    actionPlan: [],
    aiWatchlist: "",
  }

  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (tldrMatch) sections.tldr = tldrMatch[1].trim()

  const scoreSection = feedback.match(/\*\*Score Snapshot\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/i)
  if (scoreSection) {
    const scoreText = scoreSection[1]

    const parseScoreWithJustification = (label: string, scoreText: string, is100: boolean = true) => {
      const regexWithJustification = new RegExp(`[-•]?\\s*${label}[:\s–-]*(\\d+)\\s*\\/\\s*${is100 ? '100' : '10'}[–-\\s]+(.+?)(?=\\n|$)`, 'i')
      const matchWithJustification = scoreText.match(regexWithJustification)
      if (matchWithJustification && matchWithJustification[2]?.trim()) {
        const score = parseInt(matchWithJustification[1], 10)
        const justification = matchWithJustification[2].trim()
        return { score: is100 ? score : score * 10, justification }
      }
      const regexWithoutJustification = new RegExp(`[-•]?\\s*${label}[:\s–-]*(\\d+)\\s*\\/\\s*${is100 ? '100' : '10'}`, 'i')
      const matchWithoutJustification = scoreText.match(regexWithoutJustification)
      if (matchWithoutJustification) {
        return { score: is100 ? parseInt(matchWithoutJustification[1], 10) : parseInt(matchWithoutJustification[1], 10) * 10, justification: '' }
      }
      return { score: 0, justification: '' }
    }

    const understanding = parseScoreWithJustification('Understanding', scoreText, true)
    if (understanding.score === 0) {
      const alt = parseScoreWithJustification('Understanding', scoreText, false)
      sections.scores.understanding = alt.score
      if (alt.justification) sections.scoreJustifications.understanding = alt.justification
    } else {
      sections.scores.understanding = understanding.score
      if (understanding.justification) sections.scoreJustifications.understanding = understanding.justification
    }

    const problemSolving = parseScoreWithJustification('Problem[-\\s]?Solving', scoreText, true)
    if (problemSolving.score === 0) {
      const alt = parseScoreWithJustification('Problem[-\\s]?Solving', scoreText, false)
      sections.scores.problemSolving = alt.score
    } else {
      sections.scores.problemSolving = problemSolving.score
    }

    const codeQuality = parseScoreWithJustification('Code\\s+Quality', scoreText, true)
    if (codeQuality.score === 0) {
      const alt = parseScoreWithJustification('Code\\s+Quality', scoreText, false)
      sections.scores.codeQuality = alt.score
    } else {
      sections.scores.codeQuality = codeQuality.score
    }

    const communication = parseScoreWithJustification('Communication', scoreText, true)
    if (communication.score === 0) {
      const alt = parseScoreWithJustification('Communication', scoreText, false)
      sections.scores.communication = alt.score
    } else {
      sections.scores.communication = communication.score
    }

    const correctness = parseScoreWithJustification('Correctness', scoreText, true)
    sections.scores.correctness = correctness.score === 0 ? parseScoreWithJustification('Correctness', scoreText, false).score : correctness.score

    const efficiency = parseScoreWithJustification('Efficiency', scoreText, true)
    sections.scores.efficiency = efficiency.score === 0 ? parseScoreWithJustification('Efficiency', scoreText, false).score : efficiency.score

    const reasoning = parseScoreWithJustification('Reasoning(?:\\s+&\\s+Explanation)?', scoreText, true)
    sections.scores.reasoning = reasoning.score === 0 ? parseScoreWithJustification('Reasoning(?:\\s+&\\s+Explanation)?', scoreText, false).score : reasoning.score

    if (sections.scores.communication === 0 && sections.scores.reasoning > 0) {
      sections.scores.communication = sections.scores.reasoning
    }

    const aiCollaboration = parseScoreWithJustification('AI\\s+Collaboration', scoreText, true)
    sections.scores.aiCollaboration = aiCollaboration.score === 0 ? parseScoreWithJustification('AI\\s+Collaboration', scoreText, false).score : aiCollaboration.score

    if (sections.scores.understanding === 0 && sections.scores.correctness > 0) {
      sections.scores.understanding = Math.round((sections.scores.correctness + sections.scores.reasoning) / 2)
    }
    if (sections.scores.problemSolving === 0 && sections.scores.efficiency > 0) {
      sections.scores.problemSolving = sections.scores.efficiency
    }

    const hasNewScores = sections.scores.understanding > 0 || sections.scores.problemSolving > 0 ||
      sections.scores.codeQuality > 0 || sections.scores.communication > 0

    if (hasNewScores) {
      sections.scores.overall = Math.round(
        sections.scores.understanding * 0.30 +
        sections.scores.problemSolving * 0.25 +
        sections.scores.codeQuality * 0.25 +
        sections.scores.communication * 0.20
      )
    } else {
      sections.scores.overall = Math.round(
        (sections.scores.correctness + sections.scores.efficiency + sections.scores.codeQuality +
          sections.scores.reasoning + sections.scores.aiCollaboration) / 5
      )
    }
  }

  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1].split(/\n[-•]/).map(s => s.trim()).filter(s => s && s.length > 0)
  }

  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1].split(/\n[-•]/).map(s => s.trim()).filter(s => s && s.length > 0)
  }

  const actionPlanMatch = feedback.match(/\*\*Action Plan\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (actionPlanMatch) {
    sections.actionPlan = actionPlanMatch[1].split(/\n\d+\./).map(s => s.trim()).filter(s => s && s.length > 0)
  }

  const aiWatchlistMatch = feedback.match(/\*\*AI & Communication Watchlist\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (aiWatchlistMatch) sections.aiWatchlist = aiWatchlistMatch[1].trim()

  return sections
}

export default function PracticeFeedback({
  feedback,
  performanceScore,
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
  onRetry,
  onNewProblem,
  onExport,
  onEndInterview,
}: PracticeFeedbackProps) {
  const [showCode, setShowCode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)

  const sections = parseFeedback(feedback)
  const feedbackLower = feedback.toLowerCase()

  const edgeCasesDiscussed = /edge cases considered:\s*yes/i.test(feedback) ||
    /discussed.*edge case/i.test(feedback) ||
    /mentioned.*edge case/i.test(feedback) ||
    feedbackLower.includes('edge case') || feedbackLower.includes('corner case')
  const hasAlternatives = feedbackLower.includes('alternative') || feedbackLower.includes('another approach') || feedbackLower.includes('trade-off') || feedbackLower.includes('tradeoff')

  const testPassRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0
  const solutionWorks = testPassRate >= 50
  const complexityAccurate = (efficiencyScore || 0) >= 70 && solutionWorks

  const hasRequirements = feedbackLower.includes('requirement') || feedbackLower.includes('clarif') || feedbackLower.includes('scope')
  const hasScalability = feedbackLower.includes('scal') || feedbackLower.includes('performance') || feedbackLower.includes('load') || feedbackLower.includes('capacity')
  const hasBugIdentified = feedbackLower.includes('bug') || feedbackLower.includes('issue') || feedbackLower.includes('problem') || feedbackLower.includes('error')
  const hasRootCause = feedbackLower.includes('root cause') || feedbackLower.includes('because') || feedbackLower.includes('reason') || feedbackLower.includes('why')

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m` : `${seconds}s`
  }

  const hasParsedScores = sections.scores.understanding > 0 || sections.scores.problemSolving > 0 ||
    sections.scores.codeQuality > 0 || sections.scores.communication > 0

  if (!hasParsedScores && performanceScore > 0) {
    const baseScore = performanceScore <= 10 ? performanceScore * 10 : performanceScore
    const testPassRateVal = testsTotal > 0 ? testsPassed / testsTotal : 1
    const hasCommunicationIssues = feedbackLower.includes('explain') || feedbackLower.includes('thought process')

    sections.scores.understanding = Math.round(baseScore * testPassRateVal * 0.9)
    sections.scores.problemSolving = Math.round(baseScore * (testPassRateVal > 0.8 ? 1 : 0.8))
    sections.scores.codeQuality = Math.round(baseScore * testPassRateVal)
    sections.scores.communication = Math.round(baseScore * (hasCommunicationIssues ? 0.5 : 0.7))

    sections.scores.overall = Math.round(
      sections.scores.understanding * 0.30 +
      sections.scores.problemSolving * 0.25 +
      sections.scores.codeQuality * 0.25 +
      sections.scores.communication * 0.20
    )
  }

  const normalizeScore = (score: number) => score <= 10 ? score * 10 : score

  const scores = {
    understanding: normalizeScore(sections.scores.understanding || 0),
    problemSolving: normalizeScore(sections.scores.problemSolving || 0),
    codeQuality: normalizeScore(sections.scores.codeQuality || 0),
    communication: normalizeScore(sections.scores.communication || 0),
  }

  const overallScore = performanceScore > 0 ? normalizeScore(performanceScore) :
    (sections.scores.overall > 0 ? normalizeScore(sections.scores.overall) : 0)

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

  const { grade, color } = getLetterGrade(overallScore)

  const generatePDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    const margin = 20
    let y = 20

    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("MockMate - Interview Feedback", margin, y)
    y += 12

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`${problemTitle || "Interview Session"} | ${new Date().toLocaleDateString()}`, margin, y)
    y += 15

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(`Grade: ${grade} (${overallScore}/100)`, margin, y)
    y += 12

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    const criteria = [
      { name: "Understanding", score: scores.understanding, weight: "30%" },
      { name: "Problem-Solving", score: scores.problemSolving, weight: "25%" },
      { name: "Code Quality", score: scores.codeQuality, weight: "25%" },
      { name: "Communication", score: scores.communication, weight: "20%" },
    ]
    criteria.forEach(c => {
      doc.text(`${c.name} (${c.weight}): ${c.score}%`, margin + 5, y)
      y += 6
    })
    y += 8

    if (sections.fixNext.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Areas to Improve", margin, y)
      y += 8
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      sections.fixNext.slice(0, 3).forEach((item, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${item}`, 170)
        doc.text(lines, margin + 5, y)
        y += lines.length * 5 + 2
      })
    }

    doc.save(`mockmate-feedback-${Date.now()}.pdf`)
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

        {/* Action buttons - Compact bar */}
        <div className="flex border-t border-zinc-800/50 text-xs">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
          <div className="w-px bg-zinc-800/50" />
          <button
            onClick={onNewProblem}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white hover:bg-zinc-800/50 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            New Problem
          </button>
          <div className="w-px bg-zinc-800/50" />
          <button
            onClick={onExport || generatePDF}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {onEndInterview && (
            <>
              <div className="w-px bg-zinc-800/50" />
              <button
                onClick={onEndInterview}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                End
              </button>
            </>
          )}
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

      {/* What Worked / To Improve - Side by side compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* What Worked */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">What Worked</span>
          </div>
          <ul className="space-y-2">
            {sections.whatWorked.length > 0 ? (
              sections.whatWorked.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-zinc-600 italic">No strengths identified</li>
            )}
          </ul>
        </div>

        {/* To Improve */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">To Improve</span>
          </div>
          <ul className="space-y-2">
            {sections.fixNext.length > 0 ? (
              sections.fixNext.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-zinc-600 italic">Review feedback for details</li>
            )}
          </ul>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-2">
        {/* Code Solution */}
        {code && (
          <button
            onClick={() => setShowCode(!showCode)}
            className="w-full flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              {problemType === 'system-design' ? (
                <Layers className="h-3.5 w-3.5 text-zinc-400" />
              ) : (
                <Code className="h-3.5 w-3.5 text-zinc-400" />
              )}
              <span className="text-xs font-medium text-zinc-300">
                {problemType === 'system-design' ? 'Your Design' : 'Your Solution'}
              </span>
            </div>
            {showCode ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
          </button>
        )}
        {showCode && code && (
          <div className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-4 max-h-64 overflow-auto">
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
              <code>{code}</code>
            </pre>
          </div>
        )}

        {/* Learning Recommendations */}
        {userId && (
          <>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="w-full flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-medium text-zinc-300">Learning Recommendations</span>
              </div>
              {showRecommendations ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
            </button>
            {showRecommendations && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 space-y-4">
                <LearningRecommendations
                  userId={userId}
                  currentProblemType={problemType}
                  currentDifficulty={difficulty}
                  performanceScore={overallScore}
                  onSelectProblem={() => onNewProblem?.()}
                />
                {problemTitle && (
                  <NextProblemRecommendations
                    userId={userId}
                    currentProblemText={`${problemTitle}: ${feedback.substring(0, 200)}`}
                    currentProblemId={problemTitle}
                    onSelectProblem={() => onNewProblem?.()}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Action Plan */}
        {sections.actionPlan.length > 0 && (
          <>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">Action Plan</span>
                <span className="text-[10px] text-zinc-600">({sections.actionPlan.length} steps)</span>
              </div>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
            </button>
            {showDetails && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                <ol className="space-y-2">
                  {sections.actionPlan.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="w-5 h-5 bg-zinc-800 text-zinc-400 rounded flex items-center justify-center text-[10px] font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-zinc-600">
        {problemType === 'system-design'
          ? "Graded like real FAANG system design interviews"
          : problemType === 'bugfix'
            ? "Graded on debugging process & fix quality"
            : "Graded like real Meta/Google interviews"}
      </p>
    </div>
  )
}
