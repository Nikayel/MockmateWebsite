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
  Shield
} from "lucide-react"
import { LearningRecommendations } from "@/components/LearningRecommendations"
import { NextProblemRecommendations } from "@/components/NextProblemRecommendations"
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
  onNewProblem
}: FeedbackSectionsProps) {
  const [showCode, setShowCode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [showQualityCheck, setShowQualityCheck] = useState(false)

  return (
    <div className="w-full space-y-4">
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
          <>
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
            {showCode && (
              <div className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-4 max-h-64 overflow-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
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

        {/* Constitutional AI Quality Check - Only shown if adjustments were made */}
        {constitutionalAICritique && (
          <>
            <button
              onClick={() => setShowQualityCheck(!showQualityCheck)}
              className="w-full flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400">Quality Check (Constitutional AI)</span>
              </div>
              {showQualityCheck ? <ChevronUp className="h-3.5 w-3.5 text-yellow-500" /> : <ChevronDown className="h-3.5 w-3.5 text-yellow-500" />}
            </button>
            {showQualityCheck && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-3">
                <p className="text-yellow-400 font-semibold text-xs">Our AI reviewed its own work for fairness and accuracy.</p>

                {constitutionalAICritique.scoreCritique && (
                  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-lg p-3">
                    <p className="font-semibold mb-2 text-xs text-yellow-300">Score Adjustments:</p>
                    <p className="text-[10px] text-zinc-300 mb-3">{constitutionalAICritique.scoreCritique.reasoning}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-3 p-2 bg-zinc-800/50 rounded">
                      <div className="text-zinc-400">Original Overall: <span className="text-zinc-200">{constitutionalAICritique.scoreCritique.originalScores.overall}</span></div>
                      <div className="text-yellow-400">Adjusted: <span className="font-semibold">{constitutionalAICritique.scoreCritique.adjustedScores.overall}</span></div>
                    </div>
                    <ul className="space-y-2">
                      {constitutionalAICritique.scoreCritique.critiques.map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[10px] text-zinc-300">
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[9px] font-medium capitalize shrink-0">
                            {c.aspect}
                          </span>
                          <span>{c.issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {constitutionalAICritique.feedbackCritique && (
                  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-lg p-3">
                    <p className="font-semibold mb-2 text-xs text-yellow-300">Feedback Improvements:</p>
                    <p className="text-[10px] text-zinc-300 mb-3">{constitutionalAICritique.feedbackCritique.reasoning}</p>
                    <ul className="space-y-2">
                      {constitutionalAICritique.feedbackCritique.critiques.map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[10px] text-zinc-300">
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[9px] font-medium capitalize shrink-0">
                            {c.aspect}
                          </span>
                          <span>{c.issue}</span>
                        </li>
                      ))}
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
        {problemType === 'system-design'
          ? "Graded like real FAANG system design interviews"
          : problemType === 'bugfix'
            ? "Graded on debugging process & fix quality"
            : "Graded like real Meta/Google interviews"}
      </p>
    </div>
  )
}
