"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CheckCircle, TrendingUp, Target, Zap, Code, MessageSquare, Activity, ChevronDown, ChevronUp, XCircle, FileText, RotateCcw, Play, Download, AlertCircle, Sparkles, Clock, BarChart3, Lightbulb, AlertTriangle } from "lucide-react"
import { LearningRecommendations } from "@/components/LearningRecommendations"
import { Progress } from "@/components/ui/progress"

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
    if (overall10.justification) sections.scoreJustifications.overall = overall10.justification

    // Explicitly check for 0 scores in feedback text (in case AI mentions "0/100" explicitly)
    const feedbackLower = feedback.toLowerCase()
    if (feedbackLower.includes('reasoning') && feedbackLower.includes('0/100')) {
      sections.scores.reasoning = 0
    }
    if (feedbackLower.includes('ai collaboration') && feedbackLower.includes('0/100')) {
      sections.scores.aiCollaboration = 0
    }

    // ALWAYS recalculate overall from component scores
    // This ensures 0s in reasoning/collaboration properly affect the overall score
    const calculatedOverall = Math.round(
      (sections.scores.correctness + sections.scores.efficiency + sections.scores.codeQuality +
       sections.scores.reasoning + sections.scores.aiCollaboration) / 5
    )
    sections.scores.overall = calculatedOverall

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
  const sections = parseFeedback(feedback)

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

  // Use consistent platform colors - accent cyan for all score indicators
  // Opacity/intensity varies based on score level for visual hierarchy
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#00d9ff" // cyan accent - excellent
    if (score >= 60) return "#00d9ff" // cyan accent - good
    return "#94a3b8" // slate gray - needs improvement
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-[#00d9ff]"
    if (score >= 60) return "bg-[#00d9ff]/70"
    return "bg-gray-500"
  }

  // Calculate letter grade from score
  const getLetterGrade = (score: number) => {
    if (score >= 95) return "A+"
    if (score >= 90) return "A"
    if (score >= 85) return "A-"
    if (score >= 80) return "B+"
    if (score >= 75) return "B"
    if (score >= 70) return "B-"
    if (score >= 65) return "C+"
    if (score >= 60) return "C"
    if (score >= 55) return "C-"
    if (score >= 50) return "D"
    return "F"
  }

  const overallScore = sections.scores.overall > 0 ? normalizeScore(sections.scores.overall) : normalizedPerformanceScore
  const letterGrade = getLetterGrade(overallScore)

  const generatePDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = 20

    // Title
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("Skillon - Interview Feedback Report", margin, yPosition)
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
    doc.save(`skillon-feedback-${Date.now()}.pdf`)
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Overall grade: {letterGrade}. Score: {overallScore} out of 100.
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30">
                {difficulty || "Medium"}
              </Badge>
              <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30">Completed</Badge>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white">
              {problemTitle || problemType || "Interview Session"}
            </h1>
            <p className="text-gray-300 mt-2">
              {sections.tldr || `${problemType || "Technical"} problem - ${difficulty || "Medium"} difficulty`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-[#00d9ff] mb-1">{letterGrade}</div>
            <div className="text-gray-400">Overall Grade</div>
          </div>
        </div>
      </div>

      {/* Performance Overview Card */}
      <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
              <div>
                <div className="text-gray-400 text-sm">Time Taken</div>
                <div className="text-white text-xl font-semibold">{formatTime(elapsedTime)}</div>
              </div>
              <Clock className="h-8 w-8 text-[#00d9ff]" />
            </div>

            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
              <div>
                <div className="text-gray-400 text-sm">Complexity Accuracy</div>
                <div className="text-white text-xl font-semibold">{complexityAccurate ? "Good" : "Needs Work"}</div>
              </div>
              {complexityAccurate ? (
                <CheckCircle className="h-8 w-8 text-[#00d9ff]" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
              <div>
                <div className="text-gray-400 text-sm">Edge Cases Discussed</div>
                <div className="text-white text-xl font-semibold">{hasEdgeCases ? "Yes" : "No"}</div>
              </div>
              {hasEdgeCases ? (
                <CheckCircle className="h-8 w-8 text-[#00d9ff]" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
              <div>
                <div className="text-gray-400 text-sm">Alternative Solutions</div>
                <div className="text-white text-xl font-semibold">{hasAlternatives ? "Discussed" : "Not Discussed"}</div>
              </div>
              {hasAlternatives ? (
                <CheckCircle className="h-8 w-8 text-[#00d9ff]" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Code + AI Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Code Solution */}
        {code && (
          <Card className="bg-gray-900/50 border-gray-700 glass-effect">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Code className="h-5 w-5 text-[#00d9ff]" />
                <span>Your Solution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black rounded-lg p-4 max-h-[300px] overflow-auto">
                <pre className="text-sm text-white font-mono leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
              <div className="mt-4 space-y-2">
                {sections.whatWorked.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-[#00d9ff]" />
                    <span className="text-[#00d9ff] text-sm">{item}</span>
                  </div>
                ))}
                {sections.fixNext.slice(0, 1).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">{item.split('.')[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Feedback */}
        <Card className="bg-gray-900/50 border-gray-700 glass-effect">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-[#00d9ff]" />
              <span>AI Feedback</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strengths */}
            {sections.whatWorked.length > 0 && (
              <div className="bg-[#00d9ff]/10 border border-[#00d9ff]/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-[#00d9ff]" />
                  <span className="text-[#00d9ff] font-semibold">Strengths</span>
                </div>
                <ul className="text-gray-300 text-sm space-y-1">
                  {sections.whatWorked.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {sections.fixNext.length > 0 && (
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400 font-semibold">Areas for Improvement</span>
                </div>
                <ul className="text-gray-300 text-sm space-y-1">
                  {sections.fixNext.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {sections.actionPlan.length > 0 && (
              <div className="bg-[#00d9ff]/5 border border-[#00d9ff]/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-[#00d9ff]" />
                  <span className="text-[#00d9ff] font-semibold">Next Steps</span>
                </div>
                <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                  {sections.actionPlan.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Metrics */}
      <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-[#00d9ff]" />
            <span>Detailed Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Correctness</span>
                <span className="text-[#00d9ff] font-semibold">{normalizedScores.correctness}%</span>
              </div>
              <Progress value={normalizedScores.correctness} className="h-2 bg-gray-800" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Code Quality</span>
                <span className="text-[#00d9ff] font-semibold">{normalizedScores.codeQuality}%</span>
              </div>
              <Progress value={normalizedScores.codeQuality} className="h-2 bg-gray-800" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Communication</span>
                <span className="text-[#00d9ff] font-semibold">{normalizedScores.reasoning}%</span>
              </div>
              <Progress value={normalizedScores.reasoning} className="h-2 bg-gray-800" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Efficiency</span>
                <span className="text-[#00d9ff] font-semibold">{normalizedScores.efficiency}%</span>
              </div>
              <Progress value={normalizedScores.efficiency} className="h-2 bg-gray-800" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">AI Collaboration</span>
                <span className="text-[#00d9ff] font-semibold">{normalizedScores.aiCollaboration}%</span>
              </div>
              <Progress value={normalizedScores.aiCollaboration} className="h-2 bg-gray-800" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Overall</span>
                <span className="text-[#00d9ff] font-semibold">{overallScore}%</span>
              </div>
              <Progress value={overallScore} className="h-2 bg-gray-800" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Recommendations */}
      {userId && (
        <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-[#00d9ff]" />
              <span>Personalized Learning Path</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LearningRecommendations
              userId={userId}
              currentProblemType={problemType}
              currentDifficulty={difficulty}
              performanceScore={overallScore}
              onSelectProblem={(type, diff) => onNewProblem?.()}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="bg-gray-900/50 border-gray-700 glass-effect">
        <CardHeader>
          <CardTitle className="text-white">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={onExport || generatePDF}
              className="bg-gray-700 hover:bg-gray-600 text-white flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report (PDF)
            </Button>
            <Button
              onClick={onRetry}
              className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Session
            </Button>
            <Button
              onClick={onNewProblem}
              className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              New Problem
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
