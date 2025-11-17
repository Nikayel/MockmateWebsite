"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CheckCircle, TrendingUp, Target, Zap, Code, MessageSquare, Activity, ChevronDown, ChevronUp } from "lucide-react"
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
}: PracticeFeedbackProps) {
  const sections = parseFeedback(feedback)

  // Progressive disclosure state
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false)
  const [showActionPlan, setShowActionPlan] = useState(false)
  const [showWhatWorked, setShowWhatWorked] = useState(false)
  const [showComplexity, setShowComplexity] = useState(false)
  const [showAIWatchlist, setShowAIWatchlist] = useState(false)

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
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-4 sm:space-y-8">
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Interview feedback loaded. Overall score: {normalizedPerformanceScore} out of 100.
        {sections.fixNext.length > 0 && ` ${sections.fixNext.length} areas need work.`}
      </div>

      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-400 mx-auto" aria-hidden="true" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">Interview Complete!</h1>
          <p className="text-sm sm:text-base text-gray-300 px-2">
            {sections.tldr || "Brutally honest review incoming. Scroll through the full breakdown."}
          </p>
        </div>
      </div>

      {/* Overall Performance and Fix Next - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Overall Score */}
        <Card className="bg-black border border-white/10">
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-2 uppercase tracking-wider">Overall Performance</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-5xl sm:text-6xl font-bold text-white" aria-label={`Overall score: ${normalizedPerformanceScore} out of 100`}>{normalizedPerformanceScore}</span>
              <span className="text-2xl sm:text-3xl text-gray-500" aria-hidden="true">/100</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Badge className={`${getScoreBgColor(normalizedPerformanceScore)} text-white text-xs`}>
                {normalizedPerformanceScore >= 80 ? "Excellent" : normalizedPerformanceScore >= 60 ? "Good" : "Needs Work"}
              </Badge>
              <span className="text-xs text-gray-500" aria-label={`${testsPassed} out of ${testsTotal} tests passed`}>
                {testsPassed}/{testsTotal} tests passed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fix Next - Always Visible */}
        {sections.fixNext.length > 0 ? (
          <Card className="bg-black border border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" aria-hidden="true" />
                What Needs Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 sm:space-y-3" role="list">
                {sections.fixNext.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3">
                    <span className="bg-red-500/20 text-red-500 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-200 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-black border border-white/10">
            <CardContent className="p-4 sm:p-6 flex items-center justify-center h-full min-h-[300px]">
              <p className="text-gray-400 text-sm">No major issues identified</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Score Breakdown - Collapsible */}
      <Collapsible open={showDetailedBreakdown} onOpenChange={setShowDetailedBreakdown}>
        <Card className="bg-black border border-white/10">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 sm:p-6 hover:bg-white/5 rounded-lg transition-colors"
              aria-expanded={showDetailedBreakdown}
              aria-label={showDetailedBreakdown ? "Hide detailed breakdown" : "Show detailed breakdown"}
            >
              <span className="text-white text-sm sm:text-base flex items-center gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" aria-hidden="true" />
                Show Detailed Breakdown
              </span>
              {showDetailedBreakdown ? (
                <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
              {/* Score Table */}
              <div>
                <h3 className="text-white text-sm sm:text-base font-semibold mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: "Correctness", score: normalizedScores.correctness },
                    { label: "Efficiency", score: normalizedScores.efficiency },
                    { label: "Code Quality", score: normalizedScores.codeQuality },
                    { label: "Reasoning & Explanation", score: normalizedScores.reasoning },
                    { label: "AI Collaboration", score: normalizedScores.aiCollaboration },
                  ].map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-300">{item.label}</span>
                        <span className="font-bold text-white" aria-label={`${item.label}: ${item.score} out of 100`}>{item.score}/100</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow={item.score} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${item.score}%`,
                            backgroundColor: getScoreColor(item.score),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar and Bar Charts */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-white text-sm sm:text-base font-semibold mb-2">Radar View</h3>
                  <div className="h-[200px] sm:h-[220px]" role="img" aria-label="Radar chart showing score distribution across five categories">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: "#9ca3af", fontSize: 9 }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 8 }} />
                        <Radar name="Score" dataKey="value" stroke="#ff5733" fill="#ff5733" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-white text-sm sm:text-base font-semibold mb-2">Bar Comparison</h3>
                  <div className="h-[200px] sm:h-[220px]" role="img" aria-label="Bar chart comparing scores across five categories">
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
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Complexity Analysis - Collapsible */}
      <Collapsible open={showComplexity} onOpenChange={setShowComplexity}>
        <Card className="bg-black border border-white/10">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 sm:p-6 hover:bg-white/5 rounded-lg transition-colors"
              aria-expanded={showComplexity}
              aria-label={showComplexity ? "Hide complexity analysis" : "Show complexity analysis"}
            >
              <span className="text-white text-sm sm:text-base flex items-center gap-2">
                <Code className="h-4 w-4 sm:h-5 sm:w-5 text-white" aria-hidden="true" />
                Show Complexity Analysis
              </span>
              {showComplexity ? (
                <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Time Complexity</p>
                <p className="text-lg sm:text-xl font-mono font-bold text-white">
                  {timeComplexity || "O(?)"}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Space Complexity</p>
                <p className="text-lg sm:text-xl font-mono font-bold text-white">
                  {spaceComplexity || "O(?)"}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Efficiency Score</p>
                <p className="text-lg sm:text-xl font-bold text-white">{efficiencyScore || "—"}/100</p>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2" role="progressbar" aria-valuenow={efficiencyScore || 0} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${efficiencyScore || 0}%`,
                      backgroundColor: getScoreColor(efficiencyScore || 0),
                    }}
                  />
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Test Coverage</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {testsPassed}/{testsTotal}
                </p>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2" role="progressbar" aria-valuenow={testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* What Worked - Collapsible */}
      {sections.whatWorked.length > 0 && (
        <Collapsible open={showWhatWorked} onOpenChange={setShowWhatWorked}>
          <Card className="bg-black border border-white/10">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 sm:p-6 hover:bg-white/5 rounded-lg transition-colors"
                aria-expanded={showWhatWorked}
                aria-label={showWhatWorked ? "Hide what worked" : "Show what worked"}
              >
                <span className="text-white text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" aria-hidden="true" />
                  Show What Worked
                </span>
                {showWhatWorked ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <ul className="space-y-2 sm:space-y-3 mt-4" role="list">
                {sections.whatWorked.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3">
                    <span className="text-green-500 mt-1 flex-shrink-0" aria-hidden="true">✓</span>
                    <span className="text-xs sm:text-sm text-gray-200 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Action Plan - Collapsible */}
      {sections.actionPlan.length > 0 && (
        <Collapsible open={showActionPlan} onOpenChange={setShowActionPlan}>
          <Card className="bg-black border border-white/10">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 sm:p-6 hover:bg-white/5 rounded-lg transition-colors"
                aria-expanded={showActionPlan}
                aria-label={showActionPlan ? "Hide action plan" : "Show action plan"}
              >
                <span className="text-white text-sm sm:text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff5733]" aria-hidden="true" />
                  Show Action Plan
                </span>
                {showActionPlan ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-3 sm:space-y-4 mt-4">
                {sections.actionPlan.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="bg-[#ff5733] text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" aria-hidden="true">
                      {index + 1}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-200 leading-relaxed pt-0.5 sm:pt-1">{item}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}



      {/* AI & Communication Watchlist - Collapsible */}
      {sections.aiWatchlist && (
        <Collapsible open={showAIWatchlist} onOpenChange={setShowAIWatchlist}>
          <Card className="bg-black border border-white/10">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 sm:p-6 hover:bg-white/5 rounded-lg transition-colors"
                aria-expanded={showAIWatchlist}
                aria-label={showAIWatchlist ? "Hide AI watchlist" : "Show AI watchlist"}
              >
                <span className="text-white text-sm sm:text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" aria-hidden="true" />
                  Show AI & Communication Watchlist
                </span>
                {showAIWatchlist ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mt-4">{sections.aiWatchlist}</p>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
