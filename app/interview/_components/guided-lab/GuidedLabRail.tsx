"use client"

import { useEffect } from "react"
import { ArrowRight, CheckCircle2, CircleDot, Lock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  GuidedLabBlock,
  GuidedLabConfig,
  GuidedLabProgress,
} from "@/lib/bugfix/guided-lab/types"
import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"
import { loadGuidedLabProgress, saveGuidedLabProgress } from "@/lib/bugfix/guided-lab/persistence"
import { GuidedCheckpoint, GuidedInstruction, GuidedQuiz, KnowledgeCard } from "./GuidedLabBlocks"

interface GuidedLabRailProps {
  config: GuidedLabConfig
  scenarioId: string
  savedProgress?: GuidedLabProgress | null
}

export function GuidedLabRail({ config, scenarioId, savedProgress }: GuidedLabRailProps) {
  const storeScenarioId = useGuidedLabStore((state) => state.scenarioId)
  const progress = useGuidedLabStore((state) => state.progress)
  const initGuidedLab = useGuidedLabStore((state) => state.initGuidedLab)
  const ackMilestone = useGuidedLabStore((state) => state.ackMilestone)
  const answerQuiz = useGuidedLabStore((state) => state.answerQuiz)
  const ackCheckpoint = useGuidedLabStore((state) => state.ackCheckpoint)

  useEffect(() => {
    if (storeScenarioId !== scenarioId) {
      // Resume from the explicit prop, else from local persistence, else fresh.
      initGuidedLab(scenarioId, config, savedProgress ?? loadGuidedLabProgress(scenarioId))
    }
  }, [storeScenarioId, scenarioId, config, savedProgress, initGuidedLab])

  // Persist progress so a reload doesn't reset a long lab to milestone 1.
  useEffect(() => {
    if (progress && storeScenarioId === scenarioId) {
      saveGuidedLabProgress(scenarioId, progress)
    }
  }, [progress, storeScenarioId, scenarioId])

  if (!progress || storeScenarioId !== scenarioId) return null

  const total = config.milestones.length
  const doneCount = config.milestones.filter(
    (m) => progress.milestoneStatus[m.id] === "done"
  ).length
  const activeMilestone = config.milestones.find((m) => progress.milestoneStatus[m.id] === "active")
  const isComplete = doneCount === total

  // A manual-ack milestone only advances once its formative work is engaged:
  // every quiz answered and every checkpoint item ticked.
  const quizBlocks = activeMilestone?.blocks.filter((block) => block.kind === "quiz") ?? []
  const checkpointBlocks =
    activeMilestone?.blocks.filter(
      (block): block is Extract<GuidedLabBlock, { kind: "checkpoint" }> =>
        block.kind === "checkpoint"
    ) ?? []
  const allQuizzesAnswered = quizBlocks.every((quiz) =>
    progress.quizAnswers.some((answer) => answer.quizId === quiz.id)
  )
  const allCheckpointsAcked = checkpointBlocks.every((checkpoint) =>
    checkpoint.items.every((_, index) =>
      progress.checkpointAcks.includes(`${checkpoint.id}#${index}`)
    )
  )
  const canContinue = allQuizzesAnswered && allCheckpointsAcked

  return (
    <div className="space-y-3" data-guided-lab="rail">
      <div>
        <div className="text-muted-foreground mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide uppercase">
          <span>Guided lab</span>
          <span>
            {Math.min(doneCount + (isComplete ? 0 : 1), total)} of {total}
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-accent h-full rounded-full transition-all"
            style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* Milestone stepper */}
      <ol className="space-y-1">
        {config.milestones.map((milestone, index) => {
          const status = progress.milestoneStatus[milestone.id]
          return (
            <li
              key={milestone.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-xs",
                status === "active" && "bg-accent/10 text-foreground font-medium",
                status === "done" && "text-muted-foreground",
                status === "locked" && "text-muted-foreground/50"
              )}
            >
              {status === "done" ? (
                <CheckCircle2 className="text-accent h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : status === "active" ? (
                <CircleDot className="text-accent h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">
                {index + 1}. {status === "locked" ? "Locked" : milestone.title}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Active milestone content */}
      {activeMilestone && (
        <div className="border-border space-y-2 border-t pt-3">
          <div>
            <h3 className="text-foreground text-sm font-semibold">{activeMilestone.title}</h3>
            <p className="text-muted-foreground text-xs">{activeMilestone.purpose}</p>
          </div>

          {activeMilestone.blocks.map((block) => {
            switch (block.kind) {
              case "knowledge-card":
                return <KnowledgeCard key={block.id} title={block.title} body={block.body} />
              case "instruction":
                return (
                  <GuidedInstruction
                    key={block.id}
                    body={block.body}
                    aiRestraint={block.aiRestraint}
                  />
                )
              case "checkpoint":
                return (
                  <GuidedCheckpoint
                    key={block.id}
                    block={block}
                    ackedIndices={
                      new Set(
                        block.items
                          .map((_, index) => index)
                          .filter((index) =>
                            progress.checkpointAcks.includes(`${block.id}#${index}`)
                          )
                      )
                    }
                    onAck={(index) => ackCheckpoint(`${block.id}#${index}`)}
                  />
                )
              case "quiz":
                return (
                  <GuidedQuiz
                    key={block.id}
                    block={block}
                    selectedIndex={
                      progress.quizAnswers.find((answer) => answer.quizId === block.id)
                        ?.selectedIndex
                    }
                    onAnswer={(index) => answerQuiz(block.id, index)}
                  />
                )
              default:
                return null
            }
          })}

          {activeMilestone.gate.kind === "manual-ack" ? (
            <div className="space-y-1.5">
              <Button
                type="button"
                onClick={() => ackMilestone(activeMilestone.id)}
                disabled={!canContinue}
                className="bg-accent hover:bg-accent/80 text-accent-foreground h-8 w-full text-xs disabled:opacity-50"
              >
                Continue
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              {!canContinue && (
                <p className="text-muted-foreground text-center text-[11px]">
                  {allQuizzesAnswered
                    ? "Tick each checkpoint item to continue."
                    : "Answer the question to continue."}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground border-border rounded-md border border-dashed px-2.5 py-2 text-[11px]">
              Make your fix, then <span className="text-foreground font-medium">Run Tests</span>.
              This step completes automatically once the tests for it pass.
            </p>
          )}
        </div>
      )}

      {isComplete && (
        <div className="border-t border-emerald-400/30 pt-3">
          <div className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
            <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Both bugs fixed and verified. You can submit now.</span>
          </div>
        </div>
      )}
    </div>
  )
}
