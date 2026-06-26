"use client"

import { type Dispatch, type SetStateAction } from "react"
import { Eye, Lightbulb, ThumbsDown, ThumbsUp } from "lucide-react"

interface ProblemHintSectionProps {
  isBugfix: boolean
  ragHints: Array<{ level: number; hint: string; id?: string }>
  hintFetchStatus: "idle" | "loading" | "success" | "error"
  hintFeedback: Map<string, "helpful" | "unhelpful">
  revealedAIHintIndices: Set<number>
  selectedScenarioId: string | undefined
  hintAgent: { revealHint: (hintId: string) => void }
  fetchRAGHints: () => Promise<void>
  submitHintFeedback: (hintIndex: number, feedbackType: "helpful" | "unhelpful") => Promise<void>
  setRevealedAIHintIndices: Dispatch<SetStateAction<Set<number>>>
}

export function ProblemHintSection({
  isBugfix,
  ragHints,
  hintFetchStatus,
  hintFeedback,
  revealedAIHintIndices,
  selectedScenarioId,
  hintAgent,
  fetchRAGHints,
  submitHintFeedback,
  setRevealedAIHintIndices,
}: ProblemHintSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-200 uppercase">
        <span className="h-4 w-1 rounded-full bg-amber-300"></span>
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
        {isBugfix ? "Debugging Signals" : "Interview Signals"}
        {ragHints.length > 0 && (
          <span className="text-muted-foreground text-xs font-normal">
            ({revealedAIHintIndices.size}/{ragHints.length} revealed)
          </span>
        )}
      </h3>
      {hintFetchStatus === "loading" ? (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-sm">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          Reading your session signal...
        </div>
      ) : hintFetchStatus === "error" || ragHints.length === 0 ? (
        <div className="border-border/30 bg-muted/30 rounded-lg border p-3">
          <p className="text-muted-foreground text-sm">
            Signals will appear here as you code. Keep working from evidence first.
          </p>
          <button
            onClick={fetchRAGHints}
            className="mt-2 flex items-center gap-1.5 text-xs text-amber-300 transition-colors hover:text-amber-200"
          >
            <Lightbulb className="h-3 w-3" aria-hidden="true" />
            Request another signal
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ragHints
            .slice(0, Math.min(revealedAIHintIndices.size + 1, ragHints.length))
            .map((hint, i) => {
              const hintId = `hint-${selectedScenarioId}-${i}`
              const isRevealed = revealedAIHintIndices.has(i)
              const feedback = hintFeedback.get(hintId)

              return (
                <div
                  key={`ai-hint-${i}`}
                  className={`rounded-lg border transition-all ${
                    isRevealed
                      ? "border-amber-400/30 bg-amber-500/10"
                      : "cursor-pointer border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10"
                  }`}
                >
                  {isRevealed ? (
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1 text-sm leading-relaxed text-amber-50">
                          <span className="font-medium text-amber-200">Level {hint.level}:</span>{" "}
                          {hint.hint}
                        </p>
                        {/* Feedback buttons */}
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <button
                            onClick={() => submitHintFeedback(i, "helpful")}
                            className={`rounded p-1 transition-colors ${
                              feedback === "helpful"
                                ? "bg-green-500/30 text-green-400"
                                : "text-muted-foreground hover:bg-green-500/10 hover:text-green-400"
                            }`}
                            title="Helpful"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => submitHintFeedback(i, "unhelpful")}
                            className={`rounded p-1 transition-colors ${
                              feedback === "unhelpful"
                                ? "bg-red-500/30 text-red-400"
                                : "text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                            }`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="relative w-full p-3 text-left focus:ring-2 focus:ring-amber-300 focus:outline-none"
                      onClick={() => {
                        if (hint.id) {
                          hintAgent.revealHint(hint.id)
                        }
                        setRevealedAIHintIndices((prev) => new Set([...prev, i]))
                      }}
                    >
                      <p className="pointer-events-none text-sm leading-relaxed text-amber-200/20 blur-sm select-none">
                        <span className="font-medium">Level {hint.level}:</span>{" "}
                        {hint.hint.substring(0, 60)}...
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200">
                          <Eye className="h-3.5 w-3.5" />
                          Reveal signal {i + 1}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
