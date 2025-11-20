"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CheckCircle, TrendingUp, Target, Zap, Code, MessageSquare, Activity, ChevronDown, ChevronUp, XCircle, FileText, RotateCcw, Play, Download, AlertCircle } from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

interface FeedbackSection {
  tldr: string
  scores: {
    correctness: number
    efficiency: number
    codeQuality: number
    reasoning: number
    aiCollaboration: number
    overall: number
  }
  scoreJustifications: {
    correctness?: string
    efficiency?: string
    codeQuality?: string
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
  onRetry?: () => void
  onNewProblem?: () => void
  onExport?: () => void
}

function parseFeedback(feedback: string): FeedbackSection {
  const sections: FeedbackSection = {
    tldr: "",
    scores: {
      correctness: 0,
      efficiency: 0,
      codeQuality: 0,
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

  // Extract TL;DR
  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (tldrMatch) sections.tldr = tldrMatch[1].trim()

  // Extract scores - improved regex to handle various formats
  const scoreSection = feedback.match(/\*\*Score Snapshot\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/i)
  if (scoreSection) {
    const scoreText = scoreSection[1]
    
    // More flexible regex patterns that handle:
    // - "Correctness: 10/10" or "Correctness: 10/10 – justification"
    // - Bullet points: "- Correctness: 10/10"
    // - Variations in spacing and dashes
    
    // Parse scores - handle both /10 and /100 formats, and extract justifications
    const parseScore = (match: RegExpMatchArray | null, is100: boolean) => {
      if (!match) return 0
      const score = parseInt(match[1], 10)
      // If format is /10, convert to /100; if /100, use as-is
      return is100 ? score : score * 10
    }
    
    // Extract score and justification (format: "Label: X/100 – justification" or "- Label: X/100 – justification")
    const parseScoreWithJustification = (label: string, scoreText: string, is100: boolean = true) => {
      // Try with justification first (handles "Label: X/100 – justification" or "- Label: X/100 – justification")
      const regexWithJustification = new RegExp(`[-•]?\\s*${label}[:\s–-]*(\\d+)\\s*\\/\\s*${is100 ? '100' : '10'}[–-\\s]+(.+?)(?=\\n|$)`, 'i')
      const matchWithJustification = scoreText.match(regexWithJustification)
      if (matchWithJustification && matchWithJustification[2]?.trim()) {
        const score = parseInt(matchWithJustification[1], 10)
        const justification = matchWithJustification[2].trim()
        return { score: is100 ? score : score * 10, justification }
      }
      // Fallback: try without justification
      const regexWithoutJustification = new RegExp(`[-•]?\\s*${label}[:\s–-]*(\\d+)\\s*\\/\\s*${is100 ? '100' : '10'}`, 'i')
      const matchWithoutJustification = scoreText.match(regexWithoutJustification)
      return { score: parseScore(matchWithoutJustification, is100), justification: '' }
    }
    
    // Try /100 first, then /10
    const correctness100 = parseScoreWithJustification('Correctness', scoreText, true)
    const correctness10 = correctness100.score === 0 ? parseScoreWithJustification('Correctness', scoreText, false) : correctness100
    sections.scores.correctness = correctness10.score
    if (correctness10.justification) sections.scoreJustifications.correctness = correctness10.justification
    
    const efficiency100 = parseScoreWithJustification('Efficiency', scoreText, true)
    const efficiency10 = efficiency100.score === 0 ? parseScoreWithJustification('Efficiency', scoreText, false) : efficiency100
    sections.scores.efficiency = efficiency10.score
    if (efficiency10.justification) sections.scoreJustifications.efficiency = efficiency10.justification
    
    const codeQuality100 = parseScoreWithJustification('Code\\s+Quality', scoreText, true)
    const codeQuality10 = codeQuality100.score === 0 ? parseScoreWithJustification('Code\\s+Quality', scoreText, false) : codeQuality100
    sections.scores.codeQuality = codeQuality10.score
    if (codeQuality10.justification) sections.scoreJustifications.codeQuality = codeQuality10.justification
    
    // Handle "Reasoning & Explanation" or just "Reasoning"
    const reasoning100 = parseScoreWithJustification('Reasoning(?:\\s+&\\s+Explanation)?', scoreText, true)
    const reasoning10 = reasoning100.score === 0 ? parseScoreWithJustification('Reasoning(?:\\s+&\\s+Explanation)?', scoreText, false) : reasoning100
    sections.scores.reasoning = reasoning10.score
    if (reasoning10.justification) sections.scoreJustifications.reasoning = reasoning10.justification
    
    const aiCollaboration100 = parseScoreWithJustification('AI\\s+Collaboration', scoreText, true)
    const aiCollaboration10 = aiCollaboration100.score === 0 ? parseScoreWithJustification('AI\\s+Collaboration', scoreText, false) : aiCollaboration100
    sections.scores.aiCollaboration = aiCollaboration10.score
    if (aiCollaboration10.justification) sections.scoreJustifications.aiCollaboration = aiCollaboration10.justification
    
    const overall100 = parseScoreWithJustification('Overall', scoreText, true)
    const overall10 = overall100.score === 0 ? parseScoreWithJustification('Overall', scoreText, false) : overall100
    sections.scores.overall = overall10.score
    if (overall10.justification) sections.scoreJustifications.overall = overall10.justification
    
    // Explicitly check for 0 scores in feedback text (in case AI mentions "0/100" explicitly)
    const feedbackLower = feedback.toLowerCase()
    if (feedbackLower.includes('reasoning') && feedbackLower.includes('0/100')) {
      sections.scores.reasoning = 0
    }
    if (feedbackLower.includes('ai collaboration') && feedbackLower.includes('0/100')) {
      sections.scores.aiCollaboration = 0
    }
    
    // Debug: log if scores are still 0 after parsing
    if (sections.scores.correctness === 0 && sections.scores.efficiency === 0 && 
        sections.scores.codeQuality === 0 && sections.scores.reasoning === 0 && 
        sections.scores.aiCollaboration === 0) {
      console.warn("Failed to parse scores from feedback. Score text:", scoreText.substring(0, 200))
    }
  }

  // Extract What Worked
  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1]
      .split(/\n[-•]/)
      .map(s => s.trim())
      .filter(s => s && s.length > 0)
  }

  // Extract Fix Next
  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1]
      .split(/\n[-•]/)
      .map(s => s.trim())
      .filter(s => s && s.length > 0)
  }

  // Extract Action Plan
  const actionPlanMatch = feedback.match(/\*\*Action Plan\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (actionPlanMatch) {
    sections.actionPlan = actionPlanMatch[1]
      .split(/\n\d+\./)
      .map(s => s.trim())
      .filter(s => s && s.length > 0)
  }

  // Extract AI Watchlist
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
  onRetry,
  onNewProblem,
  onExport,
}: PracticeFeedbackProps) {
  const sections = parseFeedback(feedback)

  // Progressive disclosure state
  const [showGraph, setShowGraph] = useState(false)
  const [openImprovements, setOpenImprovements] = useState<Record<number, boolean>>({})
  const [showCodeQualityDetails, setShowCodeQualityDetails] = useState(false)

  // Parse feedback for edge cases and alternative solutions
  const feedbackLower = feedback.toLowerCase()
  const hasEdgeCases = feedbackLower.includes('edge case') || feedbackLower.includes('edge cases') || 
                       feedbackLower.includes('corner case') || feedbackLower.includes('boundary')
  const hasAlternatives = feedbackLower.includes('alternative') || feedbackLower.includes('alternate solution') ||
                          feedbackLower.includes('another approach') || feedbackLower.includes('different method')

  // Format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    return `${secs} second${secs !== 1 ? 's' : ''}`
  }

  // Check complexity accuracy (if efficiency score is high, complexity is accurate)
  const complexityAccurate = (efficiencyScore || 0) >= 70

  // Fallback: If scores weren't parsed, use overall score as baseline and adjust based on feedback content
  const hasParsedScores = sections.scores.correctness > 0 || sections.scores.efficiency > 0 || 
                          sections.scores.codeQuality > 0 || sections.scores.reasoning > 0 || 
                          sections.scores.aiCollaboration > 0

  if (!hasParsedScores && performanceScore > 0) {
    // Use overall score as starting point - normalize to 0-100 scale
    const rawBaseScore = sections.scores.overall || performanceScore
    const baseScore = rawBaseScore <= 10 ? rawBaseScore * 10 : rawBaseScore
    
    // Infer individual scores based on test results and feedback content
    const testPassRate = testsTotal > 0 ? testsPassed / testsTotal : 1
    sections.scores.correctness = Math.round(baseScore * testPassRate)
    
    // Check feedback for hints about reasoning and AI collaboration
    const feedbackLower = feedback.toLowerCase()
    const hasReasoningIssues = feedbackLower.includes('walk through') || feedbackLower.includes('narrate') || 
                               feedbackLower.includes('explain') || feedbackLower.includes('reasoning') ||
                               feedbackLower.includes('proactive communication') || feedbackLower.includes('thought process')
    const hasAiIssues = feedbackLower.includes('ai partner') || feedbackLower.includes('ai collaboration') ||
                        feedbackLower.includes('engage with ai') || feedbackLower.includes('engage with the ai') ||
                        feedbackLower.includes('use the ai partner')
    
    // Check for zero collaboration indicators - these should get 0, not 40
    const noCollaboration = feedbackLower.includes('no collaboration') || 
                           feedbackLower.includes('never messaged') || 
                           feedbackLower.includes('no evidence') ||
                           feedbackLower.includes('did not collaborate') ||
                           feedbackLower.includes('zero collaboration') ||
                           (feedbackLower.includes('reasoning') && feedbackLower.includes('0/100')) ||
                           (feedbackLower.includes('ai collaboration') && feedbackLower.includes('0/100'))
    
    // If overall is high but there are improvement suggestions, adjust scores accordingly (0-100 scale)
    if (baseScore >= 90) {
      // High scores but with improvement suggestions means some areas need work
      sections.scores.efficiency = hasReasoningIssues || hasAiIssues ? baseScore - 10 : baseScore
      sections.scores.codeQuality = baseScore
      // If no collaboration detected, give 0, not a reduced score
      sections.scores.reasoning = noCollaboration ? 0 : (hasReasoningIssues ? Math.max(0, baseScore - 30) : baseScore)
      sections.scores.aiCollaboration = noCollaboration ? 0 : (hasAiIssues ? Math.max(0, baseScore - 30) : baseScore)
    } else {
      // Lower overall score - distribute more evenly
      sections.scores.efficiency = baseScore
      sections.scores.codeQuality = baseScore
      // If no collaboration detected, give 0, not 40
      sections.scores.reasoning = noCollaboration ? 0 : (hasReasoningIssues ? Math.max(0, baseScore - 20) : baseScore)
      sections.scores.aiCollaboration = noCollaboration ? 0 : (hasAiIssues ? Math.max(0, baseScore - 20) : baseScore)
    }
    
    // Ensure scores don't exceed overall and are within valid range (0-100 scale)
    const maxScore = Math.min(baseScore, 100)
    sections.scores.correctness = Math.min(Math.max(sections.scores.correctness, 0), maxScore)
    sections.scores.efficiency = Math.min(Math.max(sections.scores.efficiency, 0), maxScore)
    sections.scores.codeQuality = Math.min(Math.max(sections.scores.codeQuality, 0), maxScore)
    sections.scores.reasoning = Math.min(Math.max(sections.scores.reasoning, 0), maxScore)
    sections.scores.aiCollaboration = Math.min(Math.max(sections.scores.aiCollaboration, 0), maxScore)
  }

  // Convert scores from 0-10 to 0-100 if needed (for backward compatibility)
  const normalizeScore = (score: number) => {
    return score <= 10 ? score * 10 : score
  }

  const normalizedScores = {
    correctness: normalizeScore(sections.scores.correctness || 0),
    efficiency: normalizeScore(sections.scores.efficiency || 0),
    codeQuality: normalizeScore(sections.scores.codeQuality || 0),
    reasoning: normalizeScore(sections.scores.reasoning || 0),
    aiCollaboration: normalizeScore(sections.scores.aiCollaboration || 0),
  }

  const normalizedPerformanceScore = normalizeScore(performanceScore)

  const radarData = [
    { subject: "Correctness", value: normalizedScores.correctness, fullMark: 100 },
    { subject: "Efficiency", value: normalizedScores.efficiency, fullMark: 100 },
    { subject: "Code Quality", value: normalizedScores.codeQuality, fullMark: 100 },
    { subject: "Reasoning", value: normalizedScores.reasoning, fullMark: 100 },
    { subject: "AI Collab", value: normalizedScores.aiCollaboration, fullMark: 100 },
  ]

  const barData = [
    { name: "Correctness", score: normalizedScores.correctness },
    { name: "Efficiency", score: normalizedScores.efficiency },
    { name: "Code Quality", score: normalizedScores.codeQuality },
    { name: "Reasoning", score: normalizedScores.reasoning },
    { name: "AI Collab", score: normalizedScores.aiCollaboration },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981" // green
    if (score >= 60) return "#eab308" // yellow
    return "#ef4444" // red
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-600"
    if (score >= 60) return "bg-yellow-600"
    return "bg-red-600"
  }

  const generatePDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = 20

    // Title
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("MockMate - Interview Feedback Report", margin, yPosition)
    yPosition += 15

    // Date
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition)
    yPosition += 15

    // Overall Score - Large and Prominent
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Overall Score", margin, yPosition)
    yPosition += 10
    doc.setFontSize(32)
    const overallScore = sections.scores.overall > 0 ? normalizeScore(sections.scores.overall) : normalizedPerformanceScore
    doc.text(`${overallScore}/100`, margin, yPosition)
    yPosition += 15

    // Category Scores
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Category Breakdown", margin, yPosition)
    yPosition += 10

    const categories = [
      { name: "Correctness", score: normalizedScores.correctness },
      { name: "Efficiency", score: normalizedScores.efficiency },
      { name: "Code Quality", score: normalizedScores.codeQuality },
      { name: "Reasoning & Explanation", score: normalizedScores.reasoning },
      { name: "AI Collaboration", score: normalizedScores.aiCollaboration },
    ]

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    categories.forEach(cat => {
      doc.text(`${cat.name}: ${cat.score}/100`, margin + 5, yPosition)
      yPosition += 7
    })
    yPosition += 8

    // Performance Metrics
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Performance Metrics", margin, yPosition)
    yPosition += 10
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Time Taken: ${formatTime(elapsedTime)}`, margin + 5, yPosition)
    yPosition += 7
    doc.text(`Complexity Accuracy: ${complexityAccurate ? 'Yes' : 'No'}`, margin + 5, yPosition)
    yPosition += 7
    doc.text(`Edge Cases Discussed: ${hasEdgeCases ? 'Yes' : 'No'}`, margin + 5, yPosition)
    yPosition += 7
    doc.text(`Alternative Solutions: ${hasAlternatives ? 'Yes' : 'No'}`, margin + 5, yPosition)
    yPosition += 12

    // What to Improve Section
    if (sections.fixNext.length > 0) {
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("What to Improve", margin, yPosition)
      yPosition += 10
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      sections.fixNext.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        const lines = doc.splitTextToSize(`${index + 1}. ${item}`, pageWidth - 2 * margin - 10)
        doc.text(lines, margin + 5, yPosition)
        yPosition += lines.length * 5 + 3
      })
      yPosition += 8
    }

    // Action Plan
    if (sections.actionPlan.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Action Plan", margin, yPosition)
      yPosition += 10
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      sections.actionPlan.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        const lines = doc.splitTextToSize(`${index + 1}. ${item}`, pageWidth - 2 * margin - 10)
        doc.text(lines, margin + 5, yPosition)
        yPosition += lines.length * 5 + 3
      })
    }

    // Save PDF
    doc.save(`mockmate-feedback-${Date.now()}.pdf`)
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Overall score: {normalizedPerformanceScore} out of 100.
      </div>

      {/* Main Feedback Card */}
      <Card className="bg-gray-900/50 border-gray-700">
        {/* Header with MockMate branding */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">•</span>
            <span className="text-white font-semibold">MockMate</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Practice</span>
            <span>Simulate</span>
            <span>Analyze</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-600"></div>
              <div className="w-2 h-2 rounded-full bg-gray-600"></div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Feedback Summary</h1>

          {/* Overall Score - Prominent Display */}
          <div className="mb-8">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Overall Score</div>
              <div className={`text-6xl font-bold ${getScoreBgColor(sections.scores.overall > 0 ? normalizeScore(sections.scores.overall) : normalizedPerformanceScore)} bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500`}>
                {sections.scores.overall > 0 ? normalizeScore(sections.scores.overall) : normalizedPerformanceScore}/100
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Category Scores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">Correctness</span>
                  </div>
                  <Badge className={`${getScoreBgColor(normalizedScores.correctness)} text-white`}>
                    {normalizedScores.correctness}/100
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBgColor(normalizedScores.correctness)}`}
                    style={{ width: `${normalizedScores.correctness}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">Efficiency</span>
                  </div>
                  <Badge className={`${getScoreBgColor(normalizedScores.efficiency)} text-white`}>
                    {normalizedScores.efficiency}/100
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBgColor(normalizedScores.efficiency)}`}
                    style={{ width: `${normalizedScores.efficiency}%` }}
                  />
                </div>
              </div>

              <Collapsible open={showCodeQualityDetails} onOpenChange={setShowCodeQualityDetails}>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <CollapsibleTrigger asChild>
                    <div className={sections.scoreJustifications.codeQuality ? "cursor-pointer" : ""}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-cyan-400" />
                          <span className="text-sm text-gray-300">Code Quality</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getScoreBgColor(normalizedScores.codeQuality)} text-white`}>
                            {normalizedScores.codeQuality}/100
                          </Badge>
                          {sections.scoreJustifications.codeQuality && normalizedScores.codeQuality < 60 && (
                            showCodeQualityDetails ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getScoreBgColor(normalizedScores.codeQuality)}`}
                          style={{ width: `${normalizedScores.codeQuality}%` }}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  {sections.scoreJustifications.codeQuality && normalizedScores.codeQuality < 60 && (
                    <CollapsibleContent className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Why the score is low:</div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {sections.scoreJustifications.codeQuality}
                      </p>
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">Reasoning</span>
                  </div>
                  <Badge className={`${getScoreBgColor(normalizedScores.reasoning)} text-white`}>
                    {normalizedScores.reasoning}/100
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBgColor(normalizedScores.reasoning)}`}
                    style={{ width: `${normalizedScores.reasoning}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">AI Collaboration</span>
                  </div>
                  <Badge className={`${getScoreBgColor(normalizedScores.aiCollaboration)} text-white`}>
                    {normalizedScores.aiCollaboration}/100
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBgColor(normalizedScores.aiCollaboration)}`}
                    style={{ width: `${normalizedScores.aiCollaboration}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">Edge Cases</span>
                  </div>
                  <Badge className={hasEdgeCases ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                    {hasEdgeCases ? "Covered" : "Not Covered"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Performance Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Time Taken</div>
                <div className="text-base text-white">{formatTime(elapsedTime)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Complexity Accuracy</div>
                <div className="flex items-center gap-2">
                  {complexityAccurate ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-base text-white">{complexityAccurate ? "Yes" : "No"}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Alternative Solutions</div>
                <div className="text-base text-white">{hasAlternatives ? "Discussed" : "Not Discussed"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Interviewer Collaboration</div>
                <div className="text-base text-white">
                  {sections.scores.reasoning >= 70 ? "Excellent" : sections.scores.reasoning >= 50 ? "Good" : "Needs Work"}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Graph Section */}
          <Collapsible open={showGraph} onOpenChange={setShowGraph}>
            <div className="mb-6">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 hover:bg-white/5 rounded-lg transition-colors border border-gray-700 cursor-pointer"
                  aria-expanded={showGraph}
                >
                  <span className="text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-white" />
                    Performance Graph
                  </span>
                  {showGraph ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-2">Radar View</h3>
                    <div className="h-[250px]" role="img" aria-label="Radar chart showing score distribution">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#374151" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: "#9ca3af", fontSize: 10 }}
                          />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 8 }} />
                          <Radar name="Score" dataKey="value" stroke="#00d9ff" fill="#00d9ff" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-2">Bar Comparison</h3>
                    <div className="h-[250px]" role="img" aria-label="Bar chart comparing scores">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis type="number" domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#6b7280"
                            tick={{ fontSize: 10 }}
                            width={80}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                            labelStyle={{ color: "#fff" }}
                            itemStyle={{ color: "#fff" }}
                          />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {barData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* What to Improve Section */}
          {sections.fixNext.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                What to Improve
              </h2>
              <div className="space-y-3">
                {sections.fixNext.map((item, index) => {
                  const isOpen = openImprovements[index] || false
                  return (
                    <Collapsible
                      key={index}
                      open={isOpen}
                      onOpenChange={(open) => setOpenImprovements(prev => ({ ...prev, [index]: open }))}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-amber-500/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-amber-500 font-semibold text-sm mt-0.5">#{index + 1}</span>
                              <p className="text-white text-left text-sm font-medium line-clamp-2">
                                {item.split('.')[0] || item.substring(0, 80)}
                              </p>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 ml-8">
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {item}
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Plan Section */}
          {sections.actionPlan.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-cyan-400" />
                Action Plan
              </h2>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <ol className="space-y-2 list-decimal list-inside">
                  {sections.actionPlan.map((item, index) => (
                    <li key={index} className="text-gray-300 text-sm leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onExport || generatePDF}
                variant="outline"
                className="flex-1 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                Complete Breakdown (PDF)
              </Button>
              <Button
                onClick={onRetry}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry Session
              </Button>
              <Button
                onClick={onNewProblem}
                className="flex-1 bg-accent hover:bg-accent/80 text-black cursor-pointer"
              >
                <Play className="mr-2 h-4 w-4" />
                New Problem
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
