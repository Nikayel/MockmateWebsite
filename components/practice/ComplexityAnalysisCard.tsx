"use client"

import { useState } from "react"
import {
  Clock,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SessionComplexityAnalysis } from "@/lib/rag/knowledge-base/types"

interface AlternativeApproach {
  name: string
  timeComplexity: string
  spaceComplexity: string
  tradeOff: string
  isOptimalTime: boolean
  isOptimalSpace: boolean
}

interface ComplexityAnalysisCardProps {
  complexityAnalysis?: SessionComplexityAnalysis | null
  /** Alternative approaches from knowledge base */
  alternativeApproaches?: AlternativeApproach[]
  /** Problem type - only show for DSA problems */
  problemType?: string
}

/**
 * Displays complexity analysis comparison:
 * - What user stated vs what code analysis detected
 * - Whether their claim was accurate
 * - Alternative approaches they could have used
 */
export function ComplexityAnalysisCard({
  complexityAnalysis,
  alternativeApproaches,
  problemType,
}: ComplexityAnalysisCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)

  // Only show for DSA problems (not system-design or bugfix)
  if (problemType === "system-design" || problemType === "bugfix") {
    return null
  }

  // Don't show if no complexity data
  if (!complexityAnalysis) {
    return null
  }

  const { codeAnalyzed, userStated, approachUsed, isAccurate, feedback } = complexityAnalysis

  // Check if user stated anything
  const userStatedTime = userStated?.timeComplexity
  const userStatedSpace = userStated?.spaceComplexity
  const hasUserStated = userStatedTime || userStatedSpace

  // Determine if time/space were correct
  const timeMatches =
    userStatedTime && codeAnalyzed.timeComplexity
      ? normalizeComplexity(userStatedTime) === normalizeComplexity(codeAnalyzed.timeComplexity)
      : null

  const spaceMatches =
    userStatedSpace && codeAnalyzed.spaceComplexity
      ? normalizeComplexity(userStatedSpace) === normalizeComplexity(codeAnalyzed.spaceComplexity)
      : null

  // Filter alternatives to show approaches different from what was used
  const otherApproaches = alternativeApproaches?.filter(
    (a) => approachUsed && a.name.toLowerCase() !== approachUsed.toLowerCase()
  )

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-medium text-cyan-400">Complexity Analysis</span>
        {codeAnalyzed.confidence && (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px]",
              codeAnalyzed.confidence === "high"
                ? "bg-emerald-500/20 text-emerald-400"
                : codeAnalyzed.confidence === "medium"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-zinc-700 text-zinc-400"
            )}
          >
            {codeAnalyzed.confidence} confidence
          </span>
        )}
      </div>

      {/* Approach Used */}
      {approachUsed && (
        <div className="mb-3 rounded-lg bg-zinc-800/50 px-3 py-2">
          <span className="text-[10px] text-zinc-500">Your Approach</span>
          <p className="text-sm font-medium text-white">{approachUsed}</p>
        </div>
      )}

      {/* Complexity Comparison Table */}
      <div className="mb-3 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-400"></th>
              <th className="px-3 py-2 text-center font-medium text-zinc-400">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time
                </div>
              </th>
              <th className="px-3 py-2 text-center font-medium text-zinc-400">
                <div className="flex items-center justify-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Space
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* User Stated Row */}
            {hasUserStated && (
              <tr className="border-b border-zinc-800/50">
                <td className="px-3 py-2 text-zinc-400">You Said</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-white">{userStatedTime || "—"}</span>
                    {timeMatches !== null && (
                      <>
                        {timeMatches ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-white">{userStatedSpace || "—"}</span>
                    {spaceMatches !== null && (
                      <>
                        {spaceMatches ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Actual/Detected Row */}
            <tr>
              <td className="px-3 py-2 text-zinc-400">{hasUserStated ? "Actual" : "Detected"}</td>
              <td className="px-3 py-2 text-center">
                <span className="font-mono text-cyan-400">
                  {codeAnalyzed.timeComplexity || "—"}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className="font-mono text-cyan-400">
                  {codeAnalyzed.spaceComplexity || "—"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Accuracy Feedback */}
      {hasUserStated && isAccurate !== null && (
        <div
          className={cn(
            "mb-3 flex items-start gap-2 rounded-lg p-3",
            isAccurate ? "bg-emerald-500/10" : "bg-amber-500/10"
          )}
        >
          {isAccurate ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          )}
          <div>
            <p
              className={cn(
                "text-xs font-medium",
                isAccurate ? "text-emerald-400" : "text-amber-400"
              )}
            >
              {isAccurate ? "Correct Analysis!" : "Complexity Mismatch"}
            </p>
            {feedback && <p className="mt-1 text-[11px] text-zinc-400">{feedback}</p>}
          </div>
        </div>
      )}

      {/* No User Statement Warning */}
      {!hasUserStated && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-zinc-800/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <p className="text-[11px] text-zinc-400">
            You didn't discuss complexity during the interview. In real interviews, always state
            your time and space complexity after coding.
          </p>
        </div>
      )}

      {/* Detected Patterns */}
      {codeAnalyzed.detectedPatterns && codeAnalyzed.detectedPatterns.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] text-zinc-500">Detected Patterns</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {codeAnalyzed.detectedPatterns.map((pattern, i) => (
              <span key={i} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Approaches */}
      {otherApproaches && otherApproaches.length > 0 && (
        <>
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="flex w-full items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800/50"
          >
            <span>Other Valid Approaches ({otherApproaches.length})</span>
            {showAlternatives ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showAlternatives && (
            <div className="mt-2 space-y-2">
              {otherApproaches.map((approach, i) => (
                <div key={i} className="rounded-lg border border-zinc-800/50 bg-zinc-800/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{approach.name}</span>
                    <div className="flex gap-2">
                      {approach.isOptimalTime && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-400">
                          Optimal Time
                        </span>
                      )}
                      {approach.isOptimalSpace && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-400">
                          Optimal Space
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-[10px]">
                    <span className="text-zinc-400">
                      Time:{" "}
                      <span className="font-mono text-zinc-300">{approach.timeComplexity}</span>
                    </span>
                    <span className="text-zinc-400">
                      Space:{" "}
                      <span className="font-mono text-zinc-300">{approach.spaceComplexity}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-500">{approach.tradeOff}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Normalize complexity notation for comparison
 * e.g., "O(n)" === "O(N)" === "o(n)"
 */
function normalizeComplexity(complexity: string): string {
  return complexity
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\*\*/g, "^") // ** to ^
    .replace(/log_2/g, "log") // log_2 to log
    .replace(/logn/g, "log n") // logn to log n
}
