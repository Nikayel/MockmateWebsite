"use client"

import { BookOpen, Check, CheckCircle2, Circle, Lightbulb, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import type { GuidedLabBlock } from "@/lib/bugfix/guided-lab/types"

type QuizBlock = Extract<GuidedLabBlock, { kind: "quiz" }>
type CheckpointBlock = Extract<GuidedLabBlock, { kind: "checkpoint" }>

export function KnowledgeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border bg-muted/30 rounded-lg border p-3">
      <div className="text-foreground mb-1 flex items-center gap-1.5 text-xs font-semibold">
        <BookOpen className="text-accent h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </div>
      <MarkdownRenderer content={body} className="text-muted-foreground text-xs leading-relaxed" />
    </div>
  )
}

export function GuidedInstruction({ body, aiRestraint }: { body: string; aiRestraint?: boolean }) {
  return (
    <div className="border-accent/30 bg-accent/5 rounded-lg border p-3">
      <MarkdownRenderer content={body} className="text-foreground text-xs leading-relaxed" />
      {aiRestraint && (
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[11px] italic">
          <Lightbulb className="h-3 w-3 shrink-0" aria-hidden="true" />
          Deliberate slow-down: try to find this yourself before asking the debugging partner.
        </p>
      )}
    </div>
  )
}

export function GuidedCheckpoint({
  block,
  ackedIndices,
  onAck,
}: {
  block: CheckpointBlock
  ackedIndices: Set<number>
  onAck: (index: number) => void
}) {
  return (
    <div className="border-border bg-card/60 rounded-lg border p-3">
      <div className="text-foreground mb-2 text-xs font-semibold">{block.title}</div>
      <ul className="space-y-1.5">
        {block.items.map((item, index) => {
          const isChecked = ackedIndices.has(index)
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => onAck(index)}
                className="text-muted-foreground hover:text-foreground flex w-full items-start gap-2 text-left text-xs"
                aria-pressed={isChecked}
              >
                {isChecked ? (
                  <CheckCircle2
                    className="text-accent mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
                )}
                <span className={cn(isChecked && "text-foreground line-through opacity-70")}>
                  {item}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function GuidedQuiz({
  block,
  selectedIndex,
  onAnswer,
}: {
  block: QuizBlock
  selectedIndex?: number
  onAnswer: (index: number) => void
}) {
  const answered = selectedIndex !== undefined
  const isCorrect = answered && selectedIndex === block.correctIndex

  return (
    <div className="border-border bg-card/60 rounded-lg border p-3">
      <div className="text-foreground mb-2 flex items-start gap-1.5 text-xs font-semibold">
        <Lightbulb className="text-accent mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{block.question}</span>
      </div>
      <div className="space-y-1.5">
        {block.options.map((option, index) => {
          const isSelected = selectedIndex === index
          const isAnswer = block.correctIndex === index
          const showCorrect = answered && isAnswer
          const showWrong = answered && isSelected && !isAnswer
          return (
            <button
              key={option.text}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(index)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                !answered && "border-border hover:bg-muted/60",
                showCorrect && "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
                showWrong && "border-red-400/40 bg-red-400/10 text-red-100",
                answered && !showCorrect && !showWrong && "border-border opacity-60"
              )}
            >
              <span className="mt-0.5 shrink-0">
                {showCorrect ? (
                  <Check className="text-neural h-3.5 w-3.5" aria-hidden="true" />
                ) : showWrong ? (
                  <XCircle className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />
                ) : (
                  <Circle className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                )}
              </span>
              <span>{option.text}</span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="mt-2 space-y-1">
          <p
            className={cn(
              "text-xs font-medium",
              isCorrect ? "text-neural" : "text-amber-700 dark:text-amber-300"
            )}
          >
            {isCorrect ? "Correct." : "Not quite."} {block.options[selectedIndex].rationale}
          </p>
          {!isCorrect && (
            <p className="text-muted-foreground text-xs leading-relaxed">{block.explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}
