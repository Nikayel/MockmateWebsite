"use client"

import { memo } from "react"
import { Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { Scenario } from "@/lib/scenarios"
import type { BugSymptom } from "@/lib/scenarios/types"
import { BugfixBrief } from "./_sub/BugfixBrief"

type PeekScenarioDetails = Scenario & {
  fuzzyStatement?: string
  successCriteria?: string[]
  symptom?: BugSymptom
  task?: string
}

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

  const peekDetails = scenario as PeekScenarioDetails
  const statement =
    realInterviewMode && peekDetails.fuzzyStatement
      ? peekDetails.fuzzyStatement
      : scenario.problemStatement

  return (
    <>
      <button
        onClick={() => onShowProblemPeekChange(!showProblemPeek)}
        className={`focus-float-button focus:ring-accent/50 fixed top-20 left-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl transition-all duration-200 focus:ring-2 focus:outline-none ${
          showProblemPeek
            ? "bg-accent/90 text-accent-foreground shadow-accent/25"
            : "hover:border-accent/30 border-border/50 bg-muted/95 text-foreground hover:bg-muted/95 hover:text-foreground border backdrop-blur-md"
        }`}
        title="Peek at problem description (quick reference)"
      >
        <Target className={`h-4 w-4 ${showProblemPeek ? "" : "text-accent"}`} />
        <span>{showProblemPeek ? "Hide Problem" : "Show Problem"}</span>
      </button>

      {showProblemPeek && (
        <div className="focus-float-button border-accent/20 bg-card/98 fixed top-32 left-4 z-40 max-h-[60vh] w-[420px] overflow-hidden rounded-2xl border shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Target className="text-accent h-4 w-4" />
              <span className="text-foreground text-sm font-semibold">{scenario.title}</span>
            </div>
            <Badge className={`text-xs ${difficultyColorClass(scenario.difficulty)}`}>
              {scenario.difficulty}
            </Badge>
          </div>
          <div className="max-h-[calc(60vh-60px)] overflow-y-auto p-4">
            {/* Focus mode hides the brief column, so this peek is the only place
                the task is readable. Show the same distilled brief rather than the
                full narrative the redesign exists to collapse. */}
            {scenario.type === "bugfix" ? (
              <BugfixBrief
                task={peekDetails.task}
                symptom={peekDetails.symptom}
                acceptance={peekDetails.successCriteria}
                report={statement}
                fallbackStatement={statement}
                isFuzzy={Boolean(realInterviewMode && peekDetails.fuzzyStatement)}
              />
            ) : (
              <MarkdownRenderer
                content={statement}
                className="text-foreground text-sm leading-relaxed"
              />
            )}
            {scenario.type === "dsa" && scenario.examples && scenario.examples.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-accent text-xs font-semibold tracking-wide uppercase">
                  Examples
                </h4>
                {scenario.examples.slice(0, 2).map((ex, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
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
