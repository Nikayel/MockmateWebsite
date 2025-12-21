"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  CheckCircle,
  TrendingUp,
  Target,
  Code,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
  Play,
  Download,
  Sparkles,
  Clock,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  Award,
  Zap,
  BookOpen,
  Layers,
  Scale,
  Search,
  Bug,
  Wrench
} from "lucide-react"
import { LearningRecommendations } from "@/components/LearningRecommendations"
import { NextProblemRecommendations } from "@/components/NextProblemRecommendations"
import { Progress } from "@/components/ui/progress"
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

    // Legacy scores
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
}: PracticeFeedbackProps) {
  const [showCode, setShowCode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)

  const sections = parseFeedback(feedback)

  const feedbackLower = feedback.toLowerCase()
  const hasEdgeCases = feedbackLower.includes('edge case') || feedbackLower.includes('corner case')
  const hasAlternatives = feedbackLower.includes('alternative') || feedbackLower.includes('another approach') || feedbackLower.includes('trade-off') || feedbackLower.includes('tradeoff')
  const complexityAccurate = (efficiencyScore || 0) >= 70

  // System design specific indicators
  const hasRequirements = feedbackLower.includes('requirement') || feedbackLower.includes('clarif') || feedbackLower.includes('scope')
  const hasScalability = feedbackLower.includes('scal') || feedbackLower.includes('performance') || feedbackLower.includes('load') || feedbackLower.includes('capacity')

  // Bug fix specific indicators
  const hasBugIdentified = feedbackLower.includes('bug') || feedbackLower.includes('issue') || feedbackLower.includes('problem') || feedbackLower.includes('error')
  const hasRootCause = feedbackLower.includes('root cause') || feedbackLower.includes('because') || feedbackLower.includes('reason') || feedbackLower.includes('why')

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m` : `${seconds}s`
  }

  // Fallback score inference
  const hasParsedScores = sections.scores.understanding > 0 || sections.scores.problemSolving > 0 ||
                          sections.scores.codeQuality > 0 || sections.scores.communication > 0

  if (!hasParsedScores && performanceScore > 0) {
    const baseScore = performanceScore <= 10 ? performanceScore * 10 : performanceScore
    const testPassRate = testsTotal > 0 ? testsPassed / testsTotal : 1
    const hasCommunicationIssues = feedbackLower.includes('explain') || feedbackLower.includes('thought process')

    sections.scores.understanding = Math.round(baseScore * testPassRate * 0.9)
    sections.scores.problemSolving = Math.round(baseScore * (testPassRate > 0.8 ? 1 : 0.8))
    sections.scores.codeQuality = Math.round(baseScore * testPassRate)
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

  const overallScore = sections.scores.overall > 0 ? normalizeScore(sections.scores.overall) : normalizeScore(performanceScore)

  const getLetterGrade = (score: number) => {
    if (score >= 95) return { grade: "A+", color: "text-emerald-400" }
    if (score >= 90) return { grade: "A", color: "text-emerald-400" }
    if (score >= 85) return { grade: "A-", color: "text-emerald-400" }
    if (score >= 80) return { grade: "B+", color: "text-[#00d9ff]" }
    if (score >= 75) return { grade: "B", color: "text-[#00d9ff]" }
    if (score >= 70) return { grade: "B-", color: "text-[#00d9ff]" }
    if (score >= 65) return { grade: "C+", color: "text-yellow-400" }
    if (score >= 60) return { grade: "C", color: "text-yellow-400" }
    if (score >= 55) return { grade: "C-", color: "text-yellow-400" }
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
    doc.text("Skillon - Interview Feedback", margin, y)
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

    doc.save(`skillon-feedback-${Date.now()}.pdf`)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Screen reader */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Grade: {grade}. Score: {overallScore}/100.
      </div>

      {/* Hero Section - Grade + Quick Actions */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30 text-xs">
                  {difficulty || "Medium"}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  Completed
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-white truncate">
                {problemTitle || problemType || "Interview Session"}
              </h1>
            </div>

            {/* Grade circle */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center border-4",
                overallScore >= 80 ? "border-emerald-500/50 bg-emerald-500/10" :
                overallScore >= 60 ? "border-[#00d9ff]/50 bg-[#00d9ff]/10" :
                "border-yellow-500/50 bg-yellow-500/10"
              )}>
                <span className={cn("text-2xl font-bold", color)}>{grade}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1">{overallScore}%</span>
            </div>
          </div>

          {/* TL;DR - scenario-specific fallback */}
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            {sections.tldr || (
              problemType === 'system-design'
                ? `Completed system design discussion in ${formatTime(elapsedTime)}.`
                : problemType === 'bugfix'
                  ? `Completed bug fix in ${formatTime(elapsedTime)}. Fixed ${testsPassed}/${testsTotal} issues.`
                  : `Completed ${testsPassed}/${testsTotal} tests in ${formatTime(elapsedTime)}.`
            )}
          </p>

          {/* Quick stats row - scenario-specific */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(elapsedTime)}
            </span>
            {problemType === 'system-design' ? (
              // System design quick stats
              <>
                <span className="flex items-center gap-1.5">
                  {hasRequirements ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Requirements
                </span>
                <span className="flex items-center gap-1.5">
                  {hasScalability ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Scalability
                </span>
                <span className="flex items-center gap-1.5">
                  {hasAlternatives ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Trade-offs
                </span>
              </>
            ) : problemType === 'bugfix' ? (
              // Bug fix quick stats
              <>
                <span className="flex items-center gap-1.5">
                  {hasBugIdentified ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Bug Found
                </span>
                <span className="flex items-center gap-1.5">
                  {hasRootCause ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Root Cause
                </span>
                <span className="flex items-center gap-1.5">
                  {testsPassed === testsTotal && testsTotal > 0 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Fix Applied
                </span>
              </>
            ) : (
              // DSA quick stats (default)
              <>
                <span className="flex items-center gap-1.5">
                  {complexityAccurate ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Complexity
                </span>
                <span className="flex items-center gap-1.5">
                  {hasEdgeCases ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Edge Cases
                </span>
                <span className="flex items-center gap-1.5">
                  {hasAlternatives ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />}
                  Alternatives
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex border-t border-gray-800">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors border-r border-gray-800"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
          <button
            onClick={onNewProblem}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors border-r border-gray-800"
          >
            <Play className="h-4 w-4" />
            New Problem
          </button>
          <button
            onClick={onExport || generatePDF}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Scores Grid - Compact 2x2, scenario-specific dimensions */}
      <div className="grid grid-cols-2 gap-3">
        {(problemType === 'system-design' ? [
          // System Design: Requirements, Architecture, Scalability, Communication
          { name: "Requirements", score: scores.understanding, weight: "20%", icon: Search, color: "#00d9ff", tooltip: "Clarifying functional & non-functional requirements" },
          { name: "Architecture", score: scores.problemSolving, weight: "30%", icon: Layers, color: "#00ff88", tooltip: "High-level design & component decisions" },
          { name: "Scalability", score: scores.codeQuality, weight: "20%", icon: Scale, color: "#a78bfa", tooltip: "Scaling strategies & trade-offs" },
          { name: "Communication", score: scores.communication, weight: "30%", icon: MessageSquare, color: "#fbbf24", tooltip: "Explaining decisions & collaboration" },
        ] : problemType === 'bugfix' ? [
          // Bug Fix: Bug Identification, Root Cause, Fix Quality, Communication
          { name: "Bug Found", score: scores.understanding, weight: "35%", icon: Bug, color: "#00d9ff", tooltip: "Identifying the bug correctly" },
          { name: "Root Cause", score: scores.problemSolving, weight: "25%", icon: Search, color: "#00ff88", tooltip: "Understanding why the bug occurred" },
          { name: "Fix Quality", score: scores.codeQuality, weight: "20%", icon: Wrench, color: "#a78bfa", tooltip: "Clean, correct fix without side effects" },
          { name: "Communication", score: scores.communication, weight: "20%", icon: MessageSquare, color: "#fbbf24", tooltip: "Explaining debugging process" },
        ] : [
          // DSA (default): Understanding, Problem-Solving, Code Quality, Communication
          { name: "Understanding", score: scores.understanding, weight: "30%", icon: Lightbulb, color: "#00d9ff", tooltip: "Explaining approach & complexity" },
          { name: "Problem-Solving", score: scores.problemSolving, weight: "25%", icon: Zap, color: "#00ff88", tooltip: "Algorithm choice & optimization" },
          { name: "Code Quality", score: scores.codeQuality, weight: "25%", icon: Code, color: "#a78bfa", tooltip: "Clean, efficient, readable code" },
          { name: "Communication", score: scores.communication, weight: "20%", icon: MessageSquare, color: "#fbbf24", tooltip: "Thinking out loud" },
        ]).map((item) => (
          <div key={item.name} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4" style={{ color: item.color }} />
                <span className="text-sm text-gray-300">{item.name}</span>
              </div>
              <span className="text-xs text-gray-600">{item.weight}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{item.score}%</span>
              <div className="flex-1 ml-3">
                <Progress value={item.score} className="h-1.5 bg-gray-800" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feedback Sections - Two columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* What Worked - scenario-specific fallbacks */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">What Worked</span>
          </div>
          <ul className="space-y-2">
            {(sections.whatWorked.length > 0 ? sections.whatWorked : (
              problemType === 'system-design'
                ? ["Engaged in system design discussion", "Proposed architecture components"]
                : problemType === 'bugfix'
                  ? [`Fixed ${testsPassed}/${testsTotal} issues`, "Identified bug location"]
                  : [`Passed ${testsPassed}/${testsTotal} tests`]
            )).slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas to Improve - scenario-specific fallbacks */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">To Improve</span>
          </div>
          <ul className="space-y-2">
            {(sections.fixNext.length > 0 ? sections.fixNext : (
              problemType === 'system-design'
                ? ["Clarify requirements before designing", "Discuss scalability trade-offs", "Consider failure scenarios"]
                : problemType === 'bugfix'
                  ? ["Explain root cause before fixing", "Consider edge cases that caused the bug"]
                  : ["Practice explaining your thought process", "Discuss complexity before coding"]
            )).slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Collapsible: Code/Design Solution */}
      {code && (
        <Collapsible open={showCode} onOpenChange={setShowCode}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                {problemType === 'system-design' ? (
                  <Layers className="h-4 w-4 text-[#00d9ff]" />
                ) : (
                  <Code className="h-4 w-4 text-[#00d9ff]" />
                )}
                <span className="text-sm font-medium text-white">
                  {problemType === 'system-design' ? 'Your Design Notes' : 'Your Solution'}
                </span>
              </div>
              {showCode ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-black/50 border border-gray-800 rounded-xl p-4 max-h-[300px] overflow-auto">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                <code>{code}</code>
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Collapsible: Action Plan */}
      {sections.actionPlan.length > 0 && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#00d9ff]" />
                <span className="text-sm font-medium text-white">Action Plan</span>
                <span className="text-xs text-gray-600">({sections.actionPlan.length} steps)</span>
              </div>
              {showDetails ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-gray-900/30 border border-gray-800 rounded-xl p-4">
              <ol className="space-y-3">
                {sections.actionPlan.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 bg-[#00d9ff]/20 text-[#00d9ff] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Collapsible: Learning Recommendations */}
      {userId && (
        <Collapsible open={showRecommendations} onOpenChange={setShowRecommendations}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#00d9ff]/10 to-transparent border border-[#00d9ff]/20 rounded-xl hover:bg-[#00d9ff]/5 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#00d9ff]" />
                <span className="text-sm font-medium text-white">Learning Recommendations</span>
              </div>
              {showRecommendations ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-4">
              <Card className="bg-gray-900/30 border-gray-800">
                <CardContent className="p-4">
                  <LearningRecommendations
                    userId={userId}
                    currentProblemType={problemType}
                    currentDifficulty={difficulty}
                    performanceScore={overallScore}
                    onSelectProblem={() => onNewProblem?.()}
                  />
                </CardContent>
              </Card>

              {problemTitle && (
                <NextProblemRecommendations
                  userId={userId}
                  currentProblemText={`${problemTitle}: ${feedback.substring(0, 200)}`}
                  currentProblemId={problemTitle}
                  onSelectProblem={() => onNewProblem?.()}
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Footer note - scenario-specific */}
      <p className="text-center text-xs text-gray-600">
        {problemType === 'system-design'
          ? "Evaluated like real FAANG system design interviews · Discussion-based"
          : problemType === 'bugfix'
            ? "Graded on debugging process & fix quality · AI collaboration allowed"
            : "Graded like real Meta/Google interviews · AI usage optional"}
      </p>
    </div>
  )
}
