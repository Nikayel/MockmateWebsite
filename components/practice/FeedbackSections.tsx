"use client"

import { useState } from "react"
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
} from "lucide-react"
import { LearningRecommendations } from "@/components/LearningRecommendations"
import { NextProblemRecommendations } from "@/components/NextProblemRecommendations"
import { ScoreInfoTooltip } from "@/components/ui/score-info-tooltip"
import type { FeedbackSection } from "@/lib/feedback/parsers"

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
}

export function FeedbackSections({
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
}: FeedbackSectionsProps) {
  const [showCode, setShowCode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [showQualityCheck, setShowQualityCheck] = useState(false)

  return (
    <div className="w-full space-y-4">
      {/* Warning Banners - Show important feedback penalties */}
      {silentSolution && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <MessageSquareOff className="h-4 w-4" />
            <span className="text-xs font-medium">Silent Solution Detected</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            You solved the problem but didn&apos;t explain your approach. In real FAANG interviews,
            <span className="font-medium text-yellow-400"> communication is required</span> —
            interviewers want to understand your thought process. Your Communication score was
            capped, limiting your overall grade.
          </p>
          <p className="mt-2 text-[10px] text-zinc-500">
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
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            Your solution closely matches AI Partner suggestions. In real interviews,
            <span className="font-medium text-orange-400">
              {" "}
              you must understand and adapt suggestions
            </span>
            , not copy them directly. Your Understanding score was reduced.
          </p>
          <p className="mt-2 text-[10px] text-zinc-500">
            💡 Tip: Use AI as a collaborator, not a solution provider. Ask questions and build
            understanding.
          </p>
        </div>
      )}

      {/* Mastery Score - Shows what affects spaced repetition */}
      {masteryScore !== undefined && (
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
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
          <p className="mt-2 text-[10px] text-zinc-500">
            {masteryScore >= 80
              ? "Great! This problem won't repeat often in your practice queue."
              : masteryScore >= 60
                ? "Good progress! You'll see this problem again in a few days to reinforce learning."
                : "Keep practicing! This problem will appear more frequently until you master it."}
          </p>
        </div>
      )}

      {/* What Worked / To Improve - Side by side compact */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* What Worked */}
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">What Worked</span>
          </div>
          <ul className="space-y-2">
            {sections.whatWorked.length > 0 ? (
              sections.whatWorked.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-zinc-600 italic">No strengths identified</li>
            )}
          </ul>
        </div>

        {/* To Improve */}
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">To Improve</span>
          </div>
          <ul className="space-y-2">
            {sections.fixNext.length > 0 ? (
              sections.fixNext.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
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
          <>
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3 transition-colors hover:bg-zinc-800/30"
            >
              <div className="flex items-center gap-2">
                {problemType === "system-design" ? (
                  <Layers className="h-3.5 w-3.5 text-zinc-400" />
                ) : (
                  <Code className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span className="text-xs font-medium text-zinc-300">
                  {problemType === "system-design" ? "Your Design" : "Your Solution"}
                </span>
              </div>
              {showCode ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              )}
            </button>
            {showCode && (
              <div className="max-h-64 overflow-auto rounded-xl border border-zinc-800/50 bg-zinc-950 p-4">
                <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
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
              className="flex w-full items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3 transition-colors hover:bg-zinc-800/30"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-medium text-zinc-300">Learning Recommendations</span>
              </div>
              {showRecommendations ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              )}
            </button>
            {showRecommendations && (
              <div className="space-y-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
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
              className="flex w-full items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3 transition-colors hover:bg-zinc-800/30"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">Action Plan</span>
                <span className="text-[10px] text-zinc-600">
                  ({sections.actionPlan.length} steps)
                </span>
              </div>
              {showDetails ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              )}
            </button>
            {showDetails && (
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
                <ol className="space-y-2">
                  {sections.actionPlan.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-medium text-zinc-400">
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

        {/* Constitutional AI Quality Check - Only shown if adjustments were made */}
        {constitutionalAICritique && (
          <>
            <button
              onClick={() => setShowQualityCheck(!showQualityCheck)}
              className="flex w-full items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 transition-colors hover:bg-yellow-500/20"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400">
                  Quality Check (Constitutional AI)
                </span>
              </div>
              {showQualityCheck ? (
                <ChevronUp className="h-3.5 w-3.5 text-yellow-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-yellow-500" />
              )}
            </button>
            {showQualityCheck && (
              <div className="space-y-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-xs font-semibold text-yellow-400">
                  Our AI reviewed its own work for fairness and accuracy.
                </p>

                {constitutionalAICritique.scoreCritique && (
                  <div className="rounded-lg border border-yellow-500/20 bg-zinc-900/50 p-3">
                    <p className="mb-2 text-xs font-semibold text-yellow-300">Score Adjustments:</p>
                    <p className="mb-3 text-[10px] text-zinc-300">
                      {constitutionalAICritique.scoreCritique.reasoning}
                    </p>
                    <div className="mb-3 grid grid-cols-2 gap-2 rounded bg-zinc-800/50 p-2 text-[10px]">
                      <div className="text-zinc-400">
                        Original Overall:{" "}
                        <span className="text-zinc-200">
                          {constitutionalAICritique.scoreCritique.originalScores.overall}
                        </span>
                      </div>
                      <div className="text-yellow-400">
                        Adjusted:{" "}
                        <span className="font-semibold">
                          {constitutionalAICritique.scoreCritique.adjustedScores.overall}
                        </span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {constitutionalAICritique.scoreCritique.critiques.map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[10px] text-zinc-300">
                          <span className="shrink-0 rounded bg-yellow-500/20 px-2 py-0.5 text-[9px] font-medium text-yellow-400 capitalize">
                            {c.aspect}
                          </span>
                          <span>{c.issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {constitutionalAICritique.feedbackCritique && (
                  <div className="rounded-lg border border-yellow-500/20 bg-zinc-900/50 p-3">
                    <p className="mb-2 text-xs font-semibold text-yellow-300">
                      Feedback Improvements:
                    </p>
                    <p className="mb-3 text-[10px] text-zinc-300">
                      {constitutionalAICritique.feedbackCritique.reasoning}
                    </p>
                    <ul className="space-y-2">
                      {constitutionalAICritique.feedbackCritique.critiques.map(
                        (c: any, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-[10px] text-zinc-300">
                            <span className="shrink-0 rounded bg-yellow-500/20 px-2 py-0.5 text-[9px] font-medium text-yellow-400 capitalize">
                              {c.aspect}
                            </span>
                            <span>{c.issue}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-zinc-600">
        {problemType === "system-design"
          ? "Graded like real FAANG system design interviews"
          : problemType === "bugfix"
            ? "Graded on debugging process & fix quality"
            : "Graded like real Meta/Google interviews"}
      </p>
    </div>
  )
}
