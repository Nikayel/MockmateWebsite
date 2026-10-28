"use client"

import { type Dispatch, type SetStateAction } from "react"
import { Eye, Lightbulb, RefreshCw } from "lucide-react"
import { AIResponseRating } from "@/components/interview/AIResponseRating"
import { Button } from "@/components/ui/button"

interface ProblemHintSectionProps {
  isBugfix: boolean
  ragHints: Array<{ level: number; hint: string; id?: string; generationId?: string }>
  hintFetchStatus: "idle" | "loading" | "success" | "error"
  revealedAIHintIndices: Set<number>
  hintAgent: { revealHint: (hintId: string) => void }
  /** Test outcome changed since these hints were generated. */
  hintsStale: boolean
  fetchRAGHints: () => Promise<void>
  setRevealedAIHintIndices: Dispatch<SetStateAction<Set<number>>>
}

export function ProblemHintSection({
  isBugfix,
  ragHints,
  hintFetchStatus,
  revealedAIHintIndices,
  hintAgent,
  hintsStale,
  fetchRAGHints,
  setRevealedAIHintIndices,
}: ProblemHintSectionProps) {
  return (
    <div className="space-y-2 pt-1">
      {hintFetchStatus === "loading" ? (
        <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-sm">
          <div className="border-muted-foreground h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
          Generating a signal…
        </div>
      ) : hintFetchStatus === "error" || ragHints.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchRAGHints}
          className="border-border/60 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground h-9"
        >
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          Request a signal
        </Button>
      ) : (
        <div className="space-y-2">
          <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            {isBugfix ? "Debugging signals" : "Interview signals"}
            <span className="font-normal">
              ({revealedAIHintIndices.size}/{ragHints.length})
            </span>
          </h3>
          {hintsStale && (
            <button
              onClick={fetchRAGHints}
              className="border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted flex w-full items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition-colors"
            >
              <RefreshCw className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              Your test results changed since these signals. Refresh them?
            </button>
          )}
          {ragHints
            .slice(0, Math.min(revealedAIHintIndices.size + 1, ragHints.length))
            .map((hint, i) => {
              const isRevealed = revealedAIHintIndices.has(i)

              return (
                <div
                  key={`${hint.generationId ?? "legacy"}:${hint.id ?? i}`}
                  className={`rounded-lg border transition-all ${
                    isRevealed
                      ? "border-border/70 bg-muted/30"
                      : "border-border/60 bg-background/50 hover:bg-muted/50 cursor-pointer"
                  }`}
                >
                  {isRevealed ? (
                    <div className="p-3">
                      <p className="text-foreground flex-1 text-sm leading-relaxed">
                        <span className="text-accent-strong font-medium">Level {hint.level}:</span>{" "}
                        {hint.hint}
                      </p>
                      {hint.generationId && hint.id && (
                        <AIResponseRating
                          key={`${hint.generationId}:${hint.id}`}
                          generationId={hint.generationId}
                          responseId={hint.id}
                          label="Rate hint"
                        />
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="focus:ring-ring relative w-full p-3 text-left focus:ring-2 focus:outline-none"
                      onClick={() => {
                        if (hint.id) {
                          hintAgent.revealHint(hint.id)
                        }
                        setRevealedAIHintIndices((prev) => new Set([...prev, i]))
                      }}
                    >
                      <p className="text-muted-foreground/20 pointer-events-none text-sm leading-relaxed blur-sm select-none">
                        <span className="font-medium">Level {hint.level}:</span>{" "}
                        {hint.hint.substring(0, 60)}...
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-border/70 bg-background/90 text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm">
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
