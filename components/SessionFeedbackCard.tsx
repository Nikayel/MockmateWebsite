"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  CheckCircle,
  Target,
  Zap,
  Code,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react"
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

interface ScoreAdjustmentSummary {
  category: string
  original: number
  adjusted: number
  reason: string
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
      // User-friendly fields
      userSummary?: string
      scoreChanges?: ScoreAdjustmentSummary[]
    }
    feedbackCritique?: {
      critiques: Array<{ aspect: string; issue: string; suggestion: string }>
      reasoning: string
      userSummary?: string
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
    const reasoningMatch = scoreText.match(
      /Reasoning(?:\s+&\s+Explanation)?[:\s–-]*(\d+)\s*\/\s*10/i
    )
    sections.scores.reasoning = reasoningMatch ? parseInt(reasoningMatch[1]) : 0

    const aiCollaborationMatch = scoreText.match(/AI\s+Collaboration[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.aiCollaboration = aiCollaborationMatch ? parseInt(aiCollaborationMatch[1]) : 0

    const overallMatch = scoreText.match(/Overall[:\s–-]*(\d+)\s*\/\s*10/i)
    sections.scores.overall = overallMatch ? parseInt(overallMatch[1]) : 0

    // Debug: log if scores are still 0 after parsing
    if (
      sections.scores.correctness === 0 &&
      sections.scores.efficiency === 0 &&
      sections.scores.codeQuality === 0 &&
      sections.scores.reasoning === 0 &&
      sections.scores.aiCollaboration === 0
    ) {
      console.warn("Failed to parse scores from feedback. Score text:", scoreText.substring(0, 200))
    }
  }

  // Extract What Worked
  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1]
      .split(/\n[-•]/)
      .map((s) => s.trim())
      .filter((s) => s && s.length > 0)
  }

  // Extract Fix Next
  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1]
      .split(/\n[-•]/)
      .map((s) => s.trim())
      .filter((s) => s && s.length > 0)
  }

  // Extract Action Plan
  const actionPlanMatch = feedback.match(/\*\*Action Plan\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (actionPlanMatch) {
    sections.actionPlan = actionPlanMatch[1]
      .split(/\n\d+\./)
      .map((s) => s.trim())
      .filter((s) => s && s.length > 0)
  }

  // Extract AI Watchlist
  const aiWatchlistMatch = feedback.match(
    /\*\*AI & Communication Watchlist\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/
  )
  if (aiWatchlistMatch) sections.aiWatchlist = aiWatchlistMatch[1].trim()

  return sections
}

export default function SessionFeedbackCard({
  feedback,
  performanceScore,
  constitutionalAICritique,
}: SessionFeedbackCardProps) {
  const sections = parseFeedback(feedback)

  // Progressive disclosure state
  const [showRadarChart, setShowRadarChart] = useState(false)
  const [showWhatWorked, setShowWhatWorked] = useState(false)
  const [showActionPlan, setShowActionPlan] = useState(false)
  const [showAIWatchlist, setShowAIWatchlist] = useState(false)
  const [showQualityCheck, setShowQualityCheck] = useState(false)

  // Fallback: If scores weren't parsed, use overall score as baseline and adjust based on feedback content
  const hasParsedScores =
    sections.scores.correctness > 0 ||
    sections.scores.efficiency > 0 ||
    sections.scores.codeQuality > 0 ||
    sections.scores.reasoning > 0 ||
    sections.scores.aiCollaboration > 0

  if (!hasParsedScores && (performanceScore || sections.scores.overall) > 0) {
    // Use overall score as starting point
    const baseScore = sections.scores.overall || performanceScore || 7

    // Check feedback for hints about reasoning and AI collaboration
    const feedbackLower = feedback.toLowerCase()
    const hasReasoningIssues =
      feedbackLower.includes("walk through") ||
      feedbackLower.includes("narrate") ||
      feedbackLower.includes("explain") ||
      feedbackLower.includes("reasoning") ||
      feedbackLower.includes("proactive communication") ||
      feedbackLower.includes("thought process")
    const hasAiIssues =
      feedbackLower.includes("ai partner") ||
      feedbackLower.includes("ai collaboration") ||
      feedbackLower.includes("engage with ai") ||
      feedbackLower.includes("engage with the ai") ||
      feedbackLower.includes("use the ai partner")

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
    sections.scores.aiCollaboration = Math.min(
      Math.max(sections.scores.aiCollaboration, 0),
      maxScore
    )
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
      <Card className="border border-border bg-background">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">TL;DR</p>
              <p className="text-xs leading-relaxed text-foreground sm:text-sm">
                {sections.tldr || "Review complete"}
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="flex items-baseline gap-1">
                <span
                  className="text-2xl font-bold text-foreground sm:text-3xl"
                  aria-label={`Score: ${performanceScore || sections.scores.overall} out of 10`}
                >
                  {performanceScore || sections.scores.overall}
                </span>
                <span className="text-sm text-muted-foreground" aria-hidden="true">
                  /10
                </span>
              </div>
              <Badge
                className={`${getScoreBgColor(performanceScore || sections.scores.overall)} mt-1 text-[10px] text-foreground`}
              >
                {(performanceScore || sections.scores.overall) >= 8
                  ? "Excellent"
                  : (performanceScore || sections.scores.overall) >= 6
                    ? "Good"
                    : "Improve"}
              </Badge>
            </div>
          </div>

          {/* Quick Stats - Always Visible */}
          <div className="grid grid-cols-5 gap-1 border-t border-border pt-3 text-center sm:gap-2">
            <div>
              <div className="text-xs font-bold text-foreground sm:text-sm">
                {sections.scores.correctness}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-[10px]">Correct</div>
            </div>
            <div>
              <div className="text-xs font-bold text-foreground sm:text-sm">
                {sections.scores.efficiency}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-[10px]">Efficient</div>
            </div>
            <div>
              <div className="text-xs font-bold text-foreground sm:text-sm">
                {sections.scores.codeQuality}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-[10px]">Quality</div>
            </div>
            <div>
              <div className="text-xs font-bold text-foreground sm:text-sm">
                {sections.scores.reasoning}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-[10px]">Reason</div>
            </div>
            <div>
              <div className="text-xs font-bold text-foreground sm:text-sm">
                {sections.scores.aiCollaboration}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-[10px]">AI</div>
            </div>
          </div>

          {/* Radar Chart - Collapsible */}
          <Collapsible open={showRadarChart} onOpenChange={setShowRadarChart}>
            <div className="border-t border-border pt-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full cursor-pointer justify-between hover:bg-foreground/5"
                  aria-expanded={showRadarChart}
                  aria-label={showRadarChart ? "Hide radar chart" : "Show radar chart"}
                >
                  <span className="text-xs text-muted-foreground">Radar Chart</span>
                  {showRadarChart ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div
                  className="-mx-2 mt-2 h-[180px] sm:h-[200px]"
                  role="img"
                  aria-label="Radar chart showing score distribution"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 9 }} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 10]}
                        tick={{ fill: "#6b7280", fontSize: 8 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#c4703f"
                        fill="#c4703f"
                        fillOpacity={0.6}
                      />
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
          <Card className="border border-border bg-background">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full cursor-pointer justify-between rounded-lg p-3 transition-colors hover:bg-foreground/5 sm:p-4"
                aria-expanded={showWhatWorked}
                aria-label={showWhatWorked ? "Hide what worked" : "Show what worked"}
              >
                <span className="flex items-center gap-2 text-xs text-foreground sm:text-sm">
                  <CheckCircle
                    className="h-3 w-3 flex-shrink-0 text-green-500 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  What Worked
                </span>
                {showWhatWorked ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <ul className="mt-2 space-y-1.5 sm:space-y-2" role="list">
                {sections.whatWorked.slice(0, 3).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 flex-shrink-0 text-xs text-green-500"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span className="text-[10px] leading-relaxed text-foreground sm:text-xs">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Fix Next - Always Visible */}
      {sections.fixNext.length > 0 && (
        <Card className="border border-border bg-background">
          <div className="p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <Target
                className="h-3 w-3 flex-shrink-0 text-red-500 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
              <h4 className="text-xs font-semibold text-foreground sm:text-sm">Fix Next</h4>
            </div>
            <ul className="space-y-1.5 sm:space-y-2" role="list">
              {sections.fixNext.slice(0, 3).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[9px] font-bold text-red-500"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[10px] leading-relaxed text-foreground sm:text-xs">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Action Plan - Collapsible */}
      {sections.actionPlan.length > 0 && (
        <Collapsible open={showActionPlan} onOpenChange={setShowActionPlan}>
          <Card className="border border-border bg-background">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full cursor-pointer justify-between rounded-lg p-3 transition-colors hover:bg-foreground/5 sm:p-4"
                aria-expanded={showActionPlan}
                aria-label={showActionPlan ? "Hide action plan" : "Show action plan"}
              >
                <span className="flex items-center gap-2 text-xs text-foreground sm:text-sm">
                  <Zap
                    className="text-accent h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  Action Plan
                </span>
                {showActionPlan ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="mt-2 space-y-2">
                {sections.actionPlan.slice(0, 3).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded border border-border bg-foreground/5 p-2"
                  >
                    <div
                      className="bg-accent flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-foreground sm:h-5 sm:w-5"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>
                    <span className="pt-0.5 text-[10px] leading-relaxed text-foreground sm:text-xs">
                      {item}
                    </span>
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
          <Card className="border border-border bg-background">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full cursor-pointer justify-between rounded-lg p-3 transition-colors hover:bg-foreground/5 sm:p-4"
                aria-expanded={showAIWatchlist}
                aria-label={showAIWatchlist ? "Hide AI watchlist" : "Show AI watchlist"}
              >
                <span className="flex items-center gap-2 text-xs text-foreground sm:text-sm">
                  <MessageSquare
                    className="text-accent h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  AI & Communication
                </span>
                {showAIWatchlist ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <p className="mt-2 text-[10px] leading-relaxed text-foreground sm:text-xs">
                {sections.aiWatchlist}
              </p>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Grading Verification - Shows AI self-review results */}
      {constitutionalAICritique && (
        <Collapsible open={showQualityCheck} onOpenChange={setShowQualityCheck}>
          <Card className="overflow-hidden border border-indigo-500/20 bg-background">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full cursor-pointer justify-between rounded-lg p-3 transition-colors hover:bg-indigo-500/5 sm:p-4"
                aria-expanded={showQualityCheck}
                aria-label={
                  showQualityCheck ? "Hide grading verification" : "Show grading verification"
                }
              >
                <span className="flex items-center gap-2 text-xs text-foreground sm:text-sm">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 sm:h-7 sm:w-7">
                    <Shield className="h-3 w-3 text-indigo-400 sm:h-4 sm:w-4" aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Grading Verified</div>
                    <div className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                      AI double-checked for fairness
                    </div>
                  </div>
                </span>
                <div className="flex items-center gap-2">
                  {constitutionalAICritique.scoreCritique && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400 sm:text-[10px]">
                      {constitutionalAICritique.scoreCritique.adjustedScores.overall -
                        constitutionalAICritique.scoreCritique.originalScores.overall >
                      0
                        ? "+"
                        : ""}
                      {constitutionalAICritique.scoreCritique.adjustedScores.overall -
                        constitutionalAICritique.scoreCritique.originalScores.overall}{" "}
                      pts
                    </span>
                  )}
                  {showQualityCheck ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-indigo-500/10 px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="mt-3 space-y-3">
                {/* User-friendly Summary - with fallback for old sessions */}
                {(() => {
                  const scoreCritique = constitutionalAICritique.scoreCritique
                  const feedbackCritique = constitutionalAICritique.feedbackCritique
                  const summary = scoreCritique?.userSummary || feedbackCritique?.userSummary
                  if (summary) {
                    return (
                      <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                        {summary}
                      </p>
                    )
                  }
                  // Fallback for old sessions without userSummary
                  if (scoreCritique?.adjustedScores && scoreCritique?.originalScores) {
                    const delta =
                      scoreCritique.adjustedScores.overall - scoreCritique.originalScores.overall
                    if (delta !== 0) {
                      return (
                        <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                          {delta > 0
                            ? `We reviewed your grading and adjusted your score by +${delta} points to better reflect your performance.`
                            : `We reviewed your grading and made adjustments for accuracy.`}
                        </p>
                      )
                    }
                  }
                  return null
                })()}

                {/* Score Change Summary */}
                {constitutionalAICritique.scoreCritique && (
                  <div>
                    <div className="mb-3 flex items-center justify-center gap-4 rounded-lg bg-foreground/5 p-3">
                      <div className="text-center">
                        <div className="text-base font-semibold text-muted-foreground line-through sm:text-lg">
                          {constitutionalAICritique.scoreCritique.originalScores.overall}
                        </div>
                        <div className="text-[9px] text-muted-foreground sm:text-[10px]">Original</div>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="text-center">
                        <div className="text-base font-semibold text-emerald-400 sm:text-lg">
                          {constitutionalAICritique.scoreCritique.adjustedScores.overall}
                        </div>
                        <div className="text-[9px] text-muted-foreground sm:text-[10px]">Verified</div>
                      </div>
                    </div>

                    {/* Per-category score changes (user-friendly) - with fallback for old sessions */}
                    {(() => {
                      const scoreCritique = constitutionalAICritique.scoreCritique
                      let changes = scoreCritique?.scoreChanges

                      // Fallback: compute changes from original/adjusted scores for old sessions
                      if (
                        (!changes || changes.length === 0) &&
                        scoreCritique?.originalScores &&
                        scoreCritique?.adjustedScores
                      ) {
                        const orig = scoreCritique.originalScores
                        const adj = scoreCritique.adjustedScores
                        const computed: Array<{
                          category: string
                          original: number
                          adjusted: number
                          reason: string
                        }> = []

                        const categories = [
                          {
                            key: "understanding" as const,
                            label: "Understanding",
                            upReason: "Your grasp of the problem deserved more credit",
                            downReason: "Adjusted for accuracy",
                          },
                          {
                            key: "problemSolving" as const,
                            label: "Problem-Solving",
                            upReason: "Your approach was stronger than initially scored",
                            downReason: "Adjusted for accuracy",
                          },
                          {
                            key: "codeQuality" as const,
                            label: "Code Quality",
                            upReason: "Your code quality deserved a higher score",
                            downReason: "Adjusted for accuracy",
                          },
                          {
                            key: "communication" as const,
                            label: "Communication",
                            upReason: "Your explanations were better than initially credited",
                            downReason: "Adjusted for accuracy",
                          },
                        ]

                        for (const cat of categories) {
                          if (orig[cat.key] !== adj[cat.key]) {
                            computed.push({
                              category: cat.label,
                              original: orig[cat.key],
                              adjusted: adj[cat.key],
                              reason: adj[cat.key] > orig[cat.key] ? cat.upReason : cat.downReason,
                            })
                          }
                        }
                        changes = computed
                      }

                      if (!changes || changes.length === 0) return null

                      return (
                        <div className="space-y-2">
                          <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase sm:text-[10px]">
                            Score Adjustments
                          </p>
                          {changes.map((change: any, i: number) => (
                            <div
                              key={i}
                              className="rounded-lg border border-border bg-foreground/5 p-2.5"
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-foreground sm:text-xs">
                                  {change.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
                                  <span className="text-muted-foreground line-through">
                                    {change.original}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span
                                    className={
                                      change.adjusted > change.original
                                        ? "font-medium text-emerald-400"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {change.adjusted}
                                  </span>
                                  {change.adjusted > change.original && (
                                    <span className="text-[9px] text-emerald-500">
                                      +{change.adjusted - change.original}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                                {change.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Feedback refinement summary */}
                {constitutionalAICritique.feedbackCritique?.userSummary &&
                  !constitutionalAICritique.scoreCritique?.userSummary && (
                    <div
                      className={
                        constitutionalAICritique.scoreCritique
                          ? "border-t border-border pt-3"
                          : ""
                      }
                    >
                      <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                        {constitutionalAICritique.feedbackCritique.userSummary}
                      </p>
                    </div>
                  )}

                <p className="pt-2 text-[9px] text-muted-foreground sm:text-[10px]">
                  This verification helps ensure fair and accurate feedback for your interview
                  practice.
                </p>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
