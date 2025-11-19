"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CheckCircle, TrendingUp, Target, Zap, Code, MessageSquare, Activity, ChevronDown, ChevronUp, XCircle, FileText, RotateCcw, Play } from "lucide-react"
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
    
    // Parse scores - handle both /10 and /100 formats
    const parseScore = (match: RegExpMatchArray | null, is100: boolean) => {
      if (!match) return 0
      const score = parseInt(match[1], 10)
      // If format is /10, convert to /100; if /100, use as-is
      return is100 ? score : score * 10
    }
    
    // Try /100 first, then /10
    const correctnessMatch100 = scoreText.match(/Correctness[:\s–-]*(\d+)\s*\/\s*100/i)
    const correctnessMatch10 = scoreText.match(/Correctness[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.correctness = parseScore(correctnessMatch100, true) || parseScore(correctnessMatch10, false)
    
    const efficiencyMatch100 = scoreText.match(/Efficiency[:\s–-]*(\d+)\s*\/\s*100/i)
    const efficiencyMatch10 = scoreText.match(/Efficiency[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.efficiency = parseScore(efficiencyMatch100, true) || parseScore(efficiencyMatch10, false)
    
    const codeQualityMatch100 = scoreText.match(/Code\s+Quality[:\s–-]*(\d+)\s*\/\s*100/i)
    const codeQualityMatch10 = scoreText.match(/Code\s+Quality[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.codeQuality = parseScore(codeQualityMatch100, true) || parseScore(codeQualityMatch10, false)
    
    // Handle "Reasoning & Explanation" or just "Reasoning"
    const reasoningMatch100 = scoreText.match(/Reasoning(?:\s+&\s+Explanation)?[:\s–-]*(\d+)\s*\/\s*100/i)
    const reasoningMatch10 = scoreText.match(/Reasoning(?:\s+&\s+Explanation)?[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.reasoning = parseScore(reasoningMatch100, true) || parseScore(reasoningMatch10, false)
    
    const aiCollaborationMatch100 = scoreText.match(/AI\s+Collaboration[:\s–-]*(\d+)\s*\/\s*100/i)
    const aiCollaborationMatch10 = scoreText.match(/AI\s+Collaboration[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.aiCollaboration = parseScore(aiCollaborationMatch100, true) || parseScore(aiCollaborationMatch10, false)
    
    const overallMatch100 = scoreText.match(/Overall[:\s–-]*(\d+)\s*\/\s*100/i)
    const overallMatch10 = scoreText.match(/Overall[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.overall = parseScore(overallMatch100, true) || parseScore(overallMatch10, false)
    
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
    
    // If overall is high but there are improvement suggestions, adjust scores accordingly (0-100 scale)
    if (baseScore >= 90) {
      // High scores but with improvement suggestions means some areas need work
      sections.scores.efficiency = hasReasoningIssues || hasAiIssues ? baseScore - 10 : baseScore
      sections.scores.codeQuality = baseScore
      sections.scores.reasoning = hasReasoningIssues ? Math.max(60, baseScore - 30) : baseScore
      sections.scores.aiCollaboration = hasAiIssues ? Math.max(60, baseScore - 30) : baseScore
    } else {
      // Lower overall score - distribute more evenly
      sections.scores.efficiency = baseScore
      sections.scores.codeQuality = baseScore
      sections.scores.reasoning = hasReasoningIssues ? Math.max(40, baseScore - 20) : baseScore
      sections.scores.aiCollaboration = hasAiIssues ? Math.max(40, baseScore - 20) : baseScore
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
                <div className="text-sm text-gray-400 mb-1">Edge Cases Discussed</div>
                <div className="text-base text-white">{hasEdgeCases ? "Yes" : "No"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Alternative Solutions</div>
                <div className="text-base text-white">{hasAlternatives ? "Yes" : "No"}</div>
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

          {/* Actions */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onExport || (() => {
                  const data = {
                    feedback,
                    performanceScore: normalizedPerformanceScore,
                    testsPassed,
                    testsTotal,
                    timeComplexity,
                    spaceComplexity,
                    efficiencyScore,
                    elapsedTime,
                    timestamp: new Date().toISOString(),
                  }
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `mockmate-feedback-${Date.now()}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                })}
                variant="outline"
                className="flex-1 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export Report (JSON)
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
