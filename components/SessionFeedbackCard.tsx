"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CheckCircle, Target, Zap, Code, MessageSquare, ChevronDown, ChevronUp, Shield } from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
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

interface SessionFeedbackCardProps {
  feedback: string
  performanceScore?: number
  constitutionalAICritique?: {
    scoreCritique?: {
      critiques: Array<{ aspect: string; issue: string; suggestion: string }>
      reasoning: string
      originalScores: {
        understanding: number
        problemSolving: number
        codeQuality: number
        communication: number
        overall: number
      }
      adjustedScores: {
        understanding: number
        problemSolving: number
        codeQuality: number
        communication: number
        overall: number
      }
    }
    feedbackCritique?: {
      critiques: Array<{ aspect: string; issue: string; suggestion: string }>
      reasoning: string
    }
  }
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
    
    const correctnessMatch = scoreText.match(/Correctness[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.correctness = correctnessMatch ? parseInt(correctnessMatch[1]) : 0
    
    const efficiencyMatch = scoreText.match(/Efficiency[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.efficiency = efficiencyMatch ? parseInt(efficiencyMatch[1]) : 0
    
    const codeQualityMatch = scoreText.match(/Code\s+Quality[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.codeQuality = codeQualityMatch ? parseInt(codeQualityMatch[1]) : 0
    
    // Handle "Reasoning & Explanation" or just "Reasoning"
    const reasoningMatch = scoreText.match(/Reasoning(?:\s+&\s+Explanation)?[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.reasoning = reasoningMatch ? parseInt(reasoningMatch[1]) : 0
    
    const aiCollaborationMatch = scoreText.match(/AI\s+Collaboration[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.aiCollaboration = aiCollaborationMatch ? parseInt(aiCollaborationMatch[1]) : 0
    
    const overallMatch = scoreText.match(/Overall[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.overall = overallMatch ? parseInt(overallMatch[1]) : 0
    
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

export default function SessionFeedbackCard({ feedback, performanceScore, constitutionalAICritique }: SessionFeedbackCardProps) {
  const sections = parseFeedback(feedback)

  // Progressive disclosure state
  const [showRadarChart, setShowRadarChart] = useState(false)
  const [showWhatWorked, setShowWhatWorked] = useState(false)
  const [showActionPlan, setShowActionPlan] = useState(false)
  const [showAIWatchlist, setShowAIWatchlist] = useState(false)
  const [showQualityCheck, setShowQualityCheck] = useState(false)

  // Fallback: If scores weren't parsed, use overall score as baseline and adjust based on feedback content
  const hasParsedScores = sections.scores.correctness > 0 || sections.scores.efficiency > 0 || 
                          sections.scores.codeQuality > 0 || sections.scores.reasoning > 0 || 
                          sections.scores.aiCollaboration > 0

  if (!hasParsedScores && (performanceScore || sections.scores.overall) > 0) {
    // Use overall score as starting point
    const baseScore = sections.scores.overall || performanceScore || 7
    
    // Check feedback for hints about reasoning and AI collaboration
    const feedbackLower = feedback.toLowerCase()
    const hasReasoningIssues = feedbackLower.includes('walk through') || feedbackLower.includes('narrate') || 
                               feedbackLower.includes('explain') || feedbackLower.includes('reasoning') ||
                               feedbackLower.includes('proactive communication') || feedbackLower.includes('thought process')
    const hasAiIssues = feedbackLower.includes('ai partner') || feedbackLower.includes('ai collaboration') ||
                        feedbackLower.includes('engage with ai') || feedbackLower.includes('engage with the ai') ||
                        feedbackLower.includes('use the ai partner')
    
    // If overall is 10 but there are improvement suggestions, adjust scores accordingly
    if (baseScore >= 9) {
      // High scores but with improvement suggestions means some areas need work
      sections.scores.correctness = baseScore
      sections.scores.efficiency = hasReasoningIssues || hasAiIssues ? baseScore - 1 : baseScore
      sections.scores.codeQuality = baseScore
      sections.scores.reasoning = hasReasoningIssues ? Math.max(6, baseScore - 3) : baseScore
      sections.scores.aiCollaboration = hasAiIssues ? Math.max(6, baseScore - 3) : baseScore
    } else {
      // Lower overall score - distribute more evenly
      sections.scores.correctness = baseScore
      sections.scores.efficiency = baseScore
      sections.scores.codeQuality = baseScore
      sections.scores.reasoning = hasReasoningIssues ? Math.max(4, baseScore - 2) : baseScore
      sections.scores.aiCollaboration = hasAiIssues ? Math.max(4, baseScore - 2) : baseScore
    }
    
    // Ensure scores don't exceed overall and are within valid range
    const maxScore = Math.min(baseScore, 10)
    sections.scores.correctness = Math.min(Math.max(sections.scores.correctness, 0), maxScore)
    sections.scores.efficiency = Math.min(Math.max(sections.scores.efficiency, 0), maxScore)
    sections.scores.codeQuality = Math.min(Math.max(sections.scores.codeQuality, 0), maxScore)
    sections.scores.reasoning = Math.min(Math.max(sections.scores.reasoning, 0), maxScore)
    sections.scores.aiCollaboration = Math.min(Math.max(sections.scores.aiCollaboration, 0), maxScore)
  }

  const radarData = [
    { subject: "Correctness", value: sections.scores.correctness || 0, fullMark: 10 },
    { subject: "Efficiency", value: sections.scores.efficiency || 0, fullMark: 10 },
    { subject: "Code Quality", value: sections.scores.codeQuality || 0, fullMark: 10 },
    { subject: "Reasoning", value: sections.scores.reasoning || 0, fullMark: 10 },
    { subject: "AI Collab", value: sections.scores.aiCollaboration || 0, fullMark: 10 },
  ]

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return "bg-green-600"
    if (score >= 6) return "bg-yellow-600"
    return "bg-red-600"
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* TL;DR & Score - Always Visible */}
      <Card className="bg-black border border-white/10">
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">TL;DR</p>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                {sections.tldr || "Review complete"}
              </p>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-white" aria-label={`Score: ${performanceScore || sections.scores.overall} out of 10`}>{performanceScore || sections.scores.overall}</span>
                <span className="text-sm text-gray-500" aria-hidden="true">/10</span>
              </div>
              <Badge className={`${getScoreBgColor(performanceScore || sections.scores.overall)} text-white text-[10px] mt-1`}>
                {(performanceScore || sections.scores.overall) >= 8 ? "Excellent" : (performanceScore || sections.scores.overall) >= 6 ? "Good" : "Improve"}
              </Badge>
            </div>
          </div>

          {/* Quick Stats - Always Visible */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center border-t border-white/10 pt-3">
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">{sections.scores.correctness}</div>
              <div className="text-[9px] sm:text-[10px] text-gray-400">Correct</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">{sections.scores.efficiency}</div>
              <div className="text-[9px] sm:text-[10px] text-gray-400">Efficient</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">{sections.scores.codeQuality}</div>
              <div className="text-[9px] sm:text-[10px] text-gray-400">Quality</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">{sections.scores.reasoning}</div>
              <div className="text-[9px] sm:text-[10px] text-gray-400">Reason</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">{sections.scores.aiCollaboration}</div>
              <div className="text-[9px] sm:text-[10px] text-gray-400">AI</div>
            </div>
          </div>

          {/* Radar Chart - Collapsible */}
          <Collapsible open={showRadarChart} onOpenChange={setShowRadarChart}>
            <div className="border-t border-white/10 pt-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between hover:bg-white/5 cursor-pointer"
                  aria-expanded={showRadarChart}
                  aria-label={showRadarChart ? "Hide radar chart" : "Show radar chart"}
                >
                  <span className="text-xs text-gray-300">Radar Chart</span>
                  {showRadarChart ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="h-[180px] sm:h-[200px] -mx-2 mt-2" role="img" aria-label="Radar chart showing score distribution">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#9ca3af", fontSize: 9 }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "#6b7280", fontSize: 8 }} />
                      <Radar name="Score" dataKey="value" stroke="#00d9ff" fill="#00d9ff" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </Card>

      {/* What Worked - Collapsible */}
      {sections.whatWorked.length > 0 && (
        <Collapsible open={showWhatWorked} onOpenChange={setShowWhatWorked}>
          <Card className="bg-black border border-white/10">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 sm:p-4 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                aria-expanded={showWhatWorked}
                aria-label={showWhatWorked ? "Hide what worked" : "Show what worked"}
              >
                <span className="text-xs sm:text-sm text-white flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                  What Worked
                </span>
                {showWhatWorked ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <ul className="space-y-1.5 sm:space-y-2 mt-2" role="list">
                {sections.whatWorked.slice(0, 3).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 flex-shrink-0 text-xs" aria-hidden="true">✓</span>
                    <span className="text-[10px] sm:text-xs text-gray-200 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Fix Next - Always Visible */}
      {sections.fixNext.length > 0 && (
        <Card className="bg-black border border-white/10">
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" aria-hidden="true" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Fix Next</h4>
            </div>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              {sections.fixNext.slice(0, 3).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="bg-red-500/20 text-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold flex-shrink-0" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-200 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Action Plan - Collapsible */}
      {sections.actionPlan.length > 0 && (
        <Collapsible open={showActionPlan} onOpenChange={setShowActionPlan}>
          <Card className="bg-black border border-white/10">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 sm:p-4 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                aria-expanded={showActionPlan}
                aria-label={showActionPlan ? "Hide action plan" : "Show action plan"}
              >
                <span className="text-xs sm:text-sm text-white flex items-center gap-2">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-accent flex-shrink-0" aria-hidden="true" />
                  Action Plan
                </span>
                {showActionPlan ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="space-y-2 mt-2">
                {sections.actionPlan.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-white/5 rounded border border-white/10">
                    <div className="bg-accent text-black rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0" aria-hidden="true">
                      {index + 1}
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-200 leading-relaxed pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* AI Watchlist - Collapsible */}
      {sections.aiWatchlist && (
        <Collapsible open={showAIWatchlist} onOpenChange={setShowAIWatchlist}>
          <Card className="bg-black border border-white/10">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 sm:p-4 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                aria-expanded={showAIWatchlist}
                aria-label={showAIWatchlist ? "Hide AI watchlist" : "Show AI watchlist"}
              >
                <span className="text-xs sm:text-sm text-white flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-accent flex-shrink-0" aria-hidden="true" />
                  AI & Communication
                </span>
                {showAIWatchlist ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <p className="text-[10px] sm:text-xs text-gray-200 leading-relaxed mt-2">{sections.aiWatchlist}</p>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Constitutional AI Quality Check - Only shown if adjustments were made */}
      {constitutionalAICritique && (
        <Collapsible open={showQualityCheck} onOpenChange={setShowQualityCheck}>
          <Card className="bg-black border border-yellow-500/30">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 sm:p-4 hover:bg-yellow-500/5 rounded-lg transition-colors cursor-pointer"
                aria-expanded={showQualityCheck}
                aria-label={showQualityCheck ? "Hide quality check" : "Show quality check"}
              >
                <span className="text-xs sm:text-sm text-yellow-400 flex items-center gap-2">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
                  Quality Check (Constitutional AI)
                </span>
                {showQualityCheck ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="space-y-2 mt-2 text-xs text-gray-300">
                <p className="text-yellow-400 font-semibold text-[10px] sm:text-xs">Our AI reviewed its own work for fairness and accuracy.</p>

                {constitutionalAICritique.scoreCritique && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    <p className="font-semibold mb-1 text-[10px] sm:text-xs">Score Adjustments:</p>
                    <p className="text-[9px] sm:text-[10px] mb-2">{constitutionalAICritique.scoreCritique.reasoning}</p>
                    <div className="grid grid-cols-2 gap-1 text-[8px] sm:text-[9px] mb-2">
                      <div>Original Overall: {constitutionalAICritique.scoreCritique.originalScores.overall}</div>
                      <div className="text-yellow-400">Adjusted: {constitutionalAICritique.scoreCritique.adjustedScores.overall}</div>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {constitutionalAICritique.scoreCritique.critiques.map((c, i) => (
                        <li key={i} className="text-[9px] sm:text-[10px]">
                          <span className="text-yellow-400 font-semibold capitalize">{c.aspect}:</span> {c.issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {constitutionalAICritique.feedbackCritique && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    <p className="font-semibold mb-1 text-[10px] sm:text-xs">Feedback Improvements:</p>
                    <p className="text-[9px] sm:text-[10px] mb-2">{constitutionalAICritique.feedbackCritique.reasoning}</p>
                    <ul className="mt-2 space-y-1">
                      {constitutionalAICritique.feedbackCritique.critiques.map((c, i) => (
                        <li key={i} className="text-[9px] sm:text-[10px]">
                          <span className="text-yellow-400 font-semibold capitalize">{c.aspect}:</span> {c.issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
