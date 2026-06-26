"use client"

import { memo } from "react"
import { Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
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
            : "hover:border-accent/30 border border-border/50 bg-muted/95 text-foreground backdrop-blur-md hover:bg-muted/95 hover:text-foreground"
        }`}
        title="Peek at problem description (quick reference)"
      >
        <Target className={`h-4 w-4 ${showProblemPeek ? "" : "text-accent"}`} />
        <span>{showProblemPeek ? "Hide Problem" : "Show Problem"}</span>
      </button>

      {showProblemPeek && (
        <div className="focus-float-button border-accent/20 fixed top-32 left-4 z-40 max-h-[60vh] w-[420px] overflow-hidden rounded-2xl border bg-card/98 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Target className="text-accent h-4 w-4" />
              <span className="text-sm font-semibold text-foreground">{scenario.title}</span>
            </div>
            <Badge className={`text-xs ${difficultyColorClass(scenario.difficulty)}`}>
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
              className="text-sm leading-relaxed text-foreground"
            />
            {scenario.type === "dsa" && scenario.examples && scenario.examples.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-accent text-xs font-semibold tracking-wide uppercase">
                  Examples
                </h4>
                {scenario.examples.slice(0, 2).map((ex, idx) => (
                  <div key={idx} className="rounded-lg bg-muted/50 p-3 font-mono text-xs">
                    <div className="text-muted-foreground">
                      Input: <span className="text-foreground">{ex.input}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Output: <span className="text-foreground">{ex.output}</span>
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
