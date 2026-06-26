"use client"

import { useState, memo } from "react"
import {
  CheckCircle,
  TrendingUp,
  Target,
  Code,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Layers,
  Shield,
  MessageSquareOff,
  Copy,
  Brain,
  MessageCircle,
  User,
  Bot,
  HelpCircle,
  Lightbulb,
} from "lucide-react"
import type { ChatMessage } from "@/lib/types"
import { LearningRecommendations } from "@/components/LearningRecommendations"
import { NextProblemRecommendations } from "@/components/NextProblemRecommendations"
import { ScoreInfoTooltip } from "@/components/ui/score-info-tooltip"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FeedbackSection } from "@/lib/feedback/parsers"
import type { SessionComplexityAnalysis } from "@/lib/rag/knowledge-base/types"
import { ComplexityAnalysisCard } from "./ComplexityAnalysisCard"
import { FormattedText } from "@/components/ui/FormattedText"

interface AlternativeApproach {
  name: string
  timeComplexity: string
  spaceComplexity: string
  tradeOff: string
  isOptimalTime: boolean
  isOptimalSpace: boolean
}

interface FeedbackSectionsProps {
  sections: FeedbackSection
  code?: string
  language?: string
  problemType?: string
  userId?: string
  difficulty?: string
  problemTitle?: string
  feedback: string
  overallScore: number
  constitutionalAICritique?: any
  onNewProblem?: () => void
  // New props for warnings
  silentSolution?: boolean
  aiCopyingDetected?: boolean
  aiOverlapPercentage?: number
  masteryScore?: number
  // Chat history
  chatMessages?: ChatMessage[]
  interviewerMessages?: ChatMessage[]
  // Complexity analysis
  complexityAnalysis?: SessionComplexityAnalysis | null
  alternativeApproaches?: AlternativeApproach[]
  // Clarifying questions assessment (Real Interview Mode)
  clarifyingQuestionsAssessment?: {
    score: number
    totalExpected: number
    totalAsked: number
    requiredAsked: number
    requiredTotal: number
    results: Array<{
      question: string
      required: boolean
      asked: boolean
      matchedPhrase?: string
    }>
  } | null
}

export const FeedbackSections = memo(function FeedbackSections({
  sections,
  code,
  language = "javascript",
  problemType,
  userId,
  difficulty,
  problemTitle,
  feedback,
  overallScore,
  constitutionalAICritique,
  onNewProblem,
  silentSolution,
  aiCopyingDetected,
  aiOverlapPercentage,
  masteryScore,
  chatMessages,
  interviewerMessages,
  complexityAnalysis,
  alternativeApproaches,
  clarifyingQuestionsAssessment,
}: FeedbackSectionsProps) {
  const [showCode, setShowCode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [showQualityCheck, setShowQualityCheck] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showWhatYouMissed, setShowWhatYouMissed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  // Combine and sort chat messages by timestamp if available
  const hasChatHistory =
    (chatMessages && chatMessages.length > 0) ||
    (interviewerMessages && interviewerMessages.length > 0)
  const totalMessages = (chatMessages?.length || 0) + (interviewerMessages?.length || 0)

  return (
    <div className="w-full space-y-4">
      {/* Warning Banners - Show important feedback penalties */}
      {silentSolution && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <MessageSquareOff className="h-4 w-4" />
            <span className="text-xs font-medium">Silent Solution Detected</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            You solved the problem but didn&apos;t explain your approach. In real FAANG interviews,
            <span className="font-medium text-yellow-400"> communication is required</span> —
            interviewers want to understand your thought process. Your Communication score was
            capped, limiting your overall grade.
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            💡 Tip: Talk through your approach before coding. Discuss trade-offs and complexity as
            you go.
          </p>
        </div>
      )}

      {aiCopyingDetected && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center gap-2 text-orange-400">
            <Copy className="h-4 w-4" />
            <span className="text-xs font-medium">
              AI Copying Detected ({aiOverlapPercentage}% overlap)
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Your solution closely matches AI Partner suggestions. In real interviews,
            <span className="font-medium text-orange-400">
              {" "}
              you must understand and adapt suggestions
            </span>
            , not copy them directly. Your Understanding score was reduced.
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            💡 Tip: Use AI as a collaborator, not a solution provider. Ask questions and build
            understanding.
          </p>
        </div>
      )}

      {/* Mastery Score - Shows what affects spaced repetition */}
      {masteryScore !== undefined && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Brain className="h-3.5 w-3.5 text-violet-400" />
              Pattern Mastery
              <ScoreInfoTooltip type="mastery" />
            </span>
            <span
              className={`font-mono text-sm ${
                masteryScore >= 80
                  ? "text-emerald-400"
                  : masteryScore >= 60
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {masteryScore}%
            </span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {masteryScore >= 80
              ? "Great! This problem won't repeat often in your practice queue."
              : masteryScore >= 60
                ? "Good progress! You'll see this problem again in a few days to reinforce learning."
                : "Keep practicing! This problem will appear more frequently until you master it."}
          </p>
        </div>
      )}

      {/* Complexity Analysis - Shows user-stated vs actual complexity */}
      <ComplexityAnalysisCard
        complexityAnalysis={complexityAnalysis}
        alternativeApproaches={alternativeApproaches}
        problemType={problemType}
      />

      {/* What Worked / To Improve - Side by side compact */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* What Worked */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">What Worked</span>
          </div>
          <ul className="space-y-2">
            {sections.whatWorked.length > 0 ? (
              sections.whatWorked.slice(0, 3).map((item, i) => {
                const isExpanded = expandedItems.has(i + 100) // Offset to avoid conflicts with "To Improve"
                const isTruncated = item.length > 100 || item.split("\n").length > 2

                return (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            className={`cursor-pointer transition-colors hover:text-emerald-300 ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                            onClick={() => {
                              if (isTruncated) {
                                setExpandedItems((prev) => {
                                  const newSet = new Set(prev)
                                  const key = i + 100
                                  if (isExpanded) {
                                    newSet.delete(key)
                                  } else {
                                    newSet.add(key)
                                  }
                                  return newSet
                                })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                if (isTruncated) {
                                  setExpandedItems((prev) => {
                                    const newSet = new Set(prev)
                                    const key = i + 100
                                    if (isExpanded) {
                                      newSet.delete(key)
                                    } else {
                                      newSet.add(key)
                                    }
                                    return newSet
                                  })
                                }
                              }
                            }}
                          >
                            <FormattedText>{item}</FormattedText>
                          </span>
                        </TooltipTrigger>
                        {!isExpanded && isTruncated && (
                          <TooltipContent
                            className="max-w-sm border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground"
                            side="top"
                            sideOffset={5}
                          >
                            <FormattedText>{item}</FormattedText>
                            <p className="mt-2 text-[10px] text-muted-foreground">Click to expand inline</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                )
              })
            ) : (
              <li className="text-xs text-muted-foreground italic">No strengths identified</li>
            )}
          </ul>
        </div>

        {/* To Improve */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">To Improve</span>
          </div>
          <ul className="space-y-2">
            {sections.fixNext.length > 0 ? (
              sections.fixNext.slice(0, 3).map((item, i) => {
                const isExpanded = expandedItems.has(i)
                const isTruncated = item.length > 100 || item.split("\n").length > 2

                return (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            className={`cursor-pointer transition-colors hover:text-amber-300 ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                            onClick={() => {
                              if (isTruncated) {
                                setExpandedItems((prev) => {
                                  const newSet = new Set(prev)
                                  if (isExpanded) {
                                    newSet.delete(i)
                                  } else {
                                    newSet.add(i)
                                  }
                                  return newSet
                                })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                if (isTruncated) {
                                  setExpandedItems((prev) => {
                                    const newSet = new Set(prev)
                                    if (isExpanded) {
                                      newSet.delete(i)
                                    } else {
                                      newSet.add(i)
                                    }
                                    return newSet
                                  })
                                }
                              }
                            }}
                          >
                            <FormattedText>{item}</FormattedText>
                          </span>
                        </TooltipTrigger>
                        {!isExpanded && isTruncated && (
                          <TooltipContent
                            className="max-w-sm border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground"
                            side="top"
                            sideOffset={5}
                          >
                            <FormattedText>{item}</FormattedText>
                            <p className="mt-2 text-[10px] text-muted-foreground">Click to expand inline</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                )
              })
            ) : (
              <li className="text-xs text-muted-foreground italic">Review feedback for details</li>
            )}
          </ul>
        </div>
      </div>

      {/* What You Missed - Collapsible section with coaching tone */}
      {sections.whatYouMissed && sections.whatYouMissed.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50">
          <button
            onClick={() => setShowWhatYouMissed(!showWhatYouMissed)}
            className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Lightbulb className="h-4 w-4 text-violet-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-foreground">Learning Opportunities</h3>
                <p className="text-[10px] text-muted-foreground">
                  {sections.whatYouMissed.length} insight
                  {sections.whatYouMissed.length > 1 ? "s" : ""} from your session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-400">
                Review
              </span>
              {showWhatYouMissed ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {showWhatYouMissed && (
            <div className="border-t border-border/50 p-4">
              <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
                These are areas the interviewer noticed but didn&apos;t mention during the session.
                Understanding these will help you improve for future interviews.
              </p>
              <div className="space-y-2">
                {sections.whatYouMissed.slice(0, 5).map((item, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-medium text-violet-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 text-xs leading-relaxed text-muted-foreground">
                        <FormattedText>{item}</FormattedText>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground">
                💡 Focus on one or two areas at a time in your next practice session.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Clarifying Questions Assessment - Real Interview Mode */}
      {clarifyingQuestionsAssessment && clarifyingQuestionsAssessment.totalExpected > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10">
                <HelpCircle className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Clarifying Questions</h3>
                <p className="text-[10px] text-muted-foreground">Real Interview Mode assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  clarifyingQuestionsAssessment.score >= 70
                    ? "bg-emerald-500/10 text-emerald-400"
                    : clarifyingQuestionsAssessment.score >= 40
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {clarifyingQuestionsAssessment.score}/100
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <div className="text-lg font-semibold text-emerald-400">
                {clarifyingQuestionsAssessment.totalAsked}
              </div>
              <div className="text-[10px] text-muted-foreground">Questions Asked</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <div className="text-lg font-semibold text-muted-foreground">
                {clarifyingQuestionsAssessment.totalExpected}
              </div>
              <div className="text-[10px] text-muted-foreground">Expected</div>
            </div>
          </div>

          {/* Questions asked */}
          {clarifyingQuestionsAssessment.results.filter((r) => r.asked).length > 0 && (
            <div className="mb-3">
              <div className="mb-2 flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-400">
                  Questions You Asked
                </span>
              </div>
              <div className="space-y-1.5">
                {clarifyingQuestionsAssessment.results
                  .filter((r) => r.asked)
                  .map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-emerald-900/20 bg-emerald-950/20 p-2.5"
                    >
                      <div className="text-xs text-muted-foreground">{r.question}</div>
                      {r.matchedPhrase && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            &ldquo;{r.matchedPhrase}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Questions missed (required only) */}
          {clarifyingQuestionsAssessment.results.filter((r) => !r.asked && r.required).length >
            0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-[11px] font-medium text-amber-400">Should Have Asked</span>
              </div>
              <div className="space-y-1.5">
                {clarifyingQuestionsAssessment.results
                  .filter((r) => !r.asked && r.required)
                  .map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-amber-900/20 bg-amber-950/20 p-2.5"
                    >
                      <div className="text-xs text-muted-foreground">{r.question}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <p className="mt-4 rounded-lg bg-muted/30 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
            💡 In FAANG interviews, asking clarifying questions before coding demonstrates strong
            problem-solving and communication skills.
          </p>
        </div>
      )}

      {/* Expandable Sections */}
      <div className="space-y-2">
        {/* Code Solution */}
        {code && (
          <>
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/50 p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                {problemType === "system-design" ? (
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Code className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  {problemType === "system-design" ? "Your Design" : "Your Solution"}
                </span>
              </div>
              {showCode ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showCode && (
              <div className="max-h-64 overflow-auto rounded-xl border border-border/50 bg-background p-4">
                <pre className="font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                  <code>{code}</code>
                </pre>
              </div>
            )}
          </>
        )}

        {/* Learning Recommendations */}
        {userId && (
          <>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/50 p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-medium text-muted-foreground">Learning Recommendations</span>
              </div>
              {showRecommendations ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showRecommendations && (
              <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 p-4">
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
              className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/50 p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Action Plan</span>
                <span className="text-[10px] text-muted-foreground">
                  ({sections.actionPlan.length} steps)
                </span>
              </div>
              {showDetails ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showDetails && (
              <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                <ol className="space-y-2">
                  {sections.actionPlan.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <FormattedText>{item}</FormattedText>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {/* Chat History - Collapsible section showing conversation */}
        {hasChatHistory && (
          <>
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/50 p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-xs font-medium text-muted-foreground">Chat History</span>
                <span className="text-[10px] text-muted-foreground">({totalMessages} messages)</span>
              </div>
              {showChatHistory ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showChatHistory && (
              <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 p-4">
                {/* AI Partner Messages */}
                {chatMessages && chatMessages.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-xs font-medium text-violet-400">
                        AI Partner Conversation
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({chatMessages.length} messages)
                      </span>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 text-xs ${
                            msg.type === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.type === "ai" && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                              <Bot className="h-3 w-3 text-violet-400" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 ${
                              msg.type === "user"
                                ? "bg-sky-500/20 text-sky-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <FormattedText className="break-words">{msg.message}</FormattedText>
                          </div>
                          {msg.type === "user" && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
                              <User className="h-3 w-3 text-sky-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interviewer Messages */}
                {interviewerMessages && interviewerMessages.length > 0 && (
                  <div
                    className={
                      chatMessages && chatMessages.length > 0 ? "border-t border-border pt-4" : ""
                    }
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">
                        Interviewer Conversation
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({interviewerMessages.length} messages)
                      </span>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                      {interviewerMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 text-xs ${
                            msg.type === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.type === "ai" && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                              <Bot className="h-3 w-3 text-amber-400" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 ${
                              msg.type === "user"
                                ? "bg-sky-500/20 text-sky-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <FormattedText className="break-words">{msg.message}</FormattedText>
                          </div>
                          {msg.type === "user" && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
                              <User className="h-3 w-3 text-sky-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {(!chatMessages || chatMessages.length === 0) &&
                  (!interviewerMessages || interviewerMessages.length === 0) && (
                    <p className="py-4 text-center text-xs text-muted-foreground italic">
                      No chat messages recorded
                    </p>
                  )}
              </div>
            )}
          </>
        )}

        {/* Grading Verification - Shows AI self-review results */}
        {constitutionalAICritique && (
          <div className="overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent">
            <button
              onClick={() => setShowQualityCheck(!showQualityCheck)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-indigo-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Shield className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-foreground">Grading Verified</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Our AI double-checked this feedback for fairness
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {constitutionalAICritique.scoreCritique && (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                    {constitutionalAICritique.scoreCritique.adjustedScores.overall -
                      constitutionalAICritique.scoreCritique.originalScores.overall >
                    0
                      ? "+"
                      : ""}
                    {constitutionalAICritique.scoreCritique.adjustedScores.overall -
                      constitutionalAICritique.scoreCritique.originalScores.overall}{" "}
                    points
                  </span>
                )}
                {showQualityCheck ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {showQualityCheck && (
              <div className="border-t border-indigo-500/10 p-4">
                {/* User-friendly Summary - with fallback for old sessions */}
                {(() => {
                  const scoreCritique = constitutionalAICritique.scoreCritique
                  const feedbackCritique = constitutionalAICritique.feedbackCritique
                  const summary = scoreCritique?.userSummary || feedbackCritique?.userSummary
                  if (summary) {
                    return (
                      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">{summary}</p>
                    )
                  }
                  // Fallback for old sessions without userSummary
                  if (scoreCritique?.adjustedScores && scoreCritique?.originalScores) {
                    const delta =
                      scoreCritique.adjustedScores.overall - scoreCritique.originalScores.overall
                    if (delta !== 0) {
                      return (
                        <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
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
                  <div className="mb-4">
                    <div className="mb-3 flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-muted-foreground line-through">
                          {constitutionalAICritique.scoreCritique.originalScores.overall}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Original</div>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-emerald-400">
                          {constitutionalAICritique.scoreCritique.adjustedScores.overall}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Verified</div>
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
                          <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                            Score Adjustments
                          </p>
                          {changes.map((change: any, i: number) => (
                            <div
                              key={i}
                              className="rounded-lg border border-border/50 bg-muted/30 p-3"
                            >
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">
                                  {change.category}
                                </span>
                                <div className="flex items-center gap-2 text-[11px]">
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
                                    <span className="text-[10px] text-emerald-500">
                                      +{change.adjusted - change.original}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
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
                          ? "border-t border-border pt-4"
                          : ""
                      }
                    >
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {constitutionalAICritique.feedbackCritique.userSummary}
                      </p>
                    </div>
                  )}

                <p className="mt-4 text-[10px] text-muted-foreground">
                  This verification helps ensure fair and accurate feedback for your interview
                  practice.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-muted-foreground">
        {problemType === "system-design"
          ? "Graded like real FAANG system design interviews"
          : problemType === "bugfix"
            ? "Graded on debugging process & fix quality"
            : "Graded like real Meta/Google interviews"}
      </p>
    </div>
  )
})
