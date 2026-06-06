"use client"

import { memo } from "react"
import { Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import type { Scenario } from "@/lib/scenarios"

interface FocusProblemPeekProps {
  scenario: Scenario | null
  realInterviewMode: boolean
  showProblemPeek: boolean
  onShowProblemPeekChange: (show: boolean) => void
}

export const FocusProblemPeek = memo(function FocusProblemPeek({
  scenario,
  realInterviewMode,
  showProblemPeek,
  onShowProblemPeekChange,
}: FocusProblemPeekProps) {
  if (!scenario) return null

  return (
    <>
      <button
        onClick={() => onShowProblemPeekChange(!showProblemPeek)}
        className={`focus-float-button focus:ring-accent/50 fixed top-20 left-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl transition-all duration-200 focus:ring-2 focus:outline-none ${
          showProblemPeek
            ? "bg-accent/90 text-accent-foreground shadow-accent/25"
            : "hover:border-accent/30 border border-gray-600/50 bg-gray-800/95 text-gray-200 backdrop-blur-md hover:bg-gray-700/95 hover:text-white"
        }`}
        title="Peek at problem description (quick reference)"
      >
        <Target className={`h-4 w-4 ${showProblemPeek ? "" : "text-accent"}`} />
        <span>{showProblemPeek ? "Hide Problem" : "Show Problem"}</span>
      </button>

      {showProblemPeek && (
        <div className="focus-float-button border-accent/20 fixed top-32 left-4 z-40 max-h-[60vh] w-[420px] overflow-hidden rounded-2xl border bg-gray-900/98 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <Target className="text-accent h-4 w-4" />
              <span className="text-sm font-semibold text-white">{scenario.title}</span>
            </div>
            <Badge
              className={`text-xs ${
                scenario.difficulty === "easy"
                  ? "bg-green-500/20 text-green-400"
                  : scenario.difficulty === "medium"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {scenario.difficulty}
            </Badge>
          </div>
          <div className="max-h-[calc(60vh-60px)] overflow-y-auto p-4">
            <MarkdownRenderer
              content={
                realInterviewMode && (scenario as { fuzzyStatement?: string }).fuzzyStatement
                  ? (scenario as { fuzzyStatement?: string }).fuzzyStatement || ""
                  : scenario.problemStatement
              }
              className="text-sm leading-relaxed text-gray-200"
            />
            {scenario.type === "dsa" && scenario.examples && scenario.examples.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-accent text-xs font-semibold tracking-wide uppercase">
                  Examples
                </h4>
                {scenario.examples.slice(0, 2).map((ex, idx) => (
                  <div key={idx} className="rounded-lg bg-gray-800/50 p-3 font-mono text-xs">
                    <div className="text-gray-400">
                      Input: <span className="text-blue-300">{ex.input}</span>
                    </div>
                    <div className="text-gray-400">
                      Output: <span className="text-green-300">{ex.output}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
})
