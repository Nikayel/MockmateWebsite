"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GuidedLabConfig, GuidedLabProgress } from "@/lib/bugfix/guided-lab/types"
import { isMilestoneReady } from "@/lib/bugfix/guided-lab/gating"
import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"
import { loadGuidedLabProgress, saveGuidedLabProgress } from "@/lib/bugfix/guided-lab/persistence"
import { GuidedCheckpoint, GuidedInstruction, GuidedQuiz, KnowledgeCard } from "./GuidedLabBlocks"
import { GuidedLabSteps } from "./GuidedLabSteps"

interface GuidedLabRailProps {
  config: GuidedLabConfig
  scenarioId: string
  savedProgress?: GuidedLabProgress | null
}

export function GuidedLabRail({ config, scenarioId, savedProgress }: GuidedLabRailProps) {
  const storeScenarioId = useGuidedLabStore((state) => state.scenarioId)
  const storeConfig = useGuidedLabStore((state) => state.config)
  const progress = useGuidedLabStore((state) => state.progress)
  const init = useGuidedLabStore((state) => state.initGuidedLab)
  const ack = useGuidedLabStore((state) => state.ackMilestone)
  const answer = useGuidedLabStore((state) => state.answerQuiz)
  const checkpoint = useGuidedLabStore((state) => state.ackCheckpoint)
  const [review, setReview] = useState<{ id: string; phase: string } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const previousPhase = useRef<string | undefined>(undefined)
  const currentId = progress?.currentMilestoneId

  useEffect(() => {
    if (storeScenarioId !== scenarioId || storeConfig !== config) {
      init(scenarioId, config, savedProgress ?? loadGuidedLabProgress(scenarioId))
    }
  }, [storeScenarioId, storeConfig, scenarioId, config, savedProgress, init])
  useEffect(() => {
    if (progress && storeScenarioId === scenarioId && progress.version === config.version) {
      saveGuidedLabProgress(scenarioId, progress)
    }
  }, [progress, storeScenarioId, scenarioId, config.version])
  useEffect(() => {
    if (previousPhase.current && previousPhase.current !== currentId) heading.current?.focus()
    previousPhase.current = currentId
  }, [currentId])

  if (!progress || storeScenarioId !== scenarioId || progress.version !== config.version)
    return null
  const done = config.milestones.filter((m) => progress.milestoneStatus[m.id] === "done").length
  const complete = done === config.milestones.length
  const active = config.milestones.find((m) => progress.milestoneStatus[m.id] === "active")
  const viewed =
    review && review.phase === currentId
      ? (config.milestones.find((m) => m.id === review.id) ?? active)
      : active
  const reviewing = viewed && progress.milestoneStatus[viewed.id] === "done"
  const index = config.milestones.findIndex((m) => m.id === active?.id)
  return (
    <section aria-label="Guided debugging lab" className="space-y-3" data-guided-lab="rail">
      <p className="text-muted-foreground text-xs">
        Follow the phases in order. Passing the current checks opens the next repair.
      </p>
      <p className="text-foreground text-sm font-medium" role="status" aria-live="polite">
        {complete
          ? "All phases verified"
          : `Phase ${index + 1} of ${config.milestones.length} · ${active?.title}`}
      </p>
      <div
        role="progressbar"
        aria-label="Completed phases"
        aria-valuemin={0}
        aria-valuemax={config.milestones.length}
        aria-valuenow={done}
        className="bg-muted h-1.5 overflow-hidden rounded-full"
      >
        <div
          className="bg-accent h-full"
          style={{ width: `${(done / config.milestones.length) * 100}%` }}
        />
      </div>
      <GuidedLabSteps
        config={config}
        progress={progress}
        viewedId={viewed?.id ?? ""}
        onReview={(id) => setReview({ id, phase: currentId ?? "" })}
      />
      {viewed && (
        <div className="border-border space-y-3 border-t pt-3">
          <h3
            ref={heading}
            tabIndex={-1}
            className="text-foreground focus-visible:ring-ring text-sm font-semibold focus-visible:ring-2"
          >
            {viewed.title}
            {reviewing ? " · Completed" : ""}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">{viewed.purpose}</p>
          {viewed.blocks.map((block) => {
            switch (block.kind) {
              case "instruction":
                return (
                  <GuidedInstruction
                    key={block.id}
                    body={block.body}
                    aiRestraint={block.aiRestraint}
                  />
                )
              case "knowledge-card":
                return <KnowledgeCard key={block.id} title={block.title} body={block.body} />
              case "quiz":
                return (
                  <GuidedQuiz
                    key={block.id}
                    block={block}
                    selectedIndex={
                      progress.quizAnswers.find((a) => a.quizId === block.id)?.selectedIndex
                    }
                    onAnswer={(n) => answer(block.id, n)}
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
                          .map((_, n) => n)
                          .filter((n) => progress.checkpointAcks.includes(`${block.id}#${n}`))
                      )
                    }
                    onAck={(n) => checkpoint(`${block.id}#${n}`)}
                  />
                )
            }
          })}
          {reviewing ? (
            !complete && (
              <Button variant="outline" className="min-h-11 w-full" onClick={() => setReview(null)}>
                Return to current phase
              </Button>
            )
          ) : viewed.gate.kind === "manual-ack" ? (
            <div className="space-y-2">
              <Button
                className="min-h-11 w-full"
                disabled={!isMilestoneReady(viewed, progress)}
                onClick={() => ack(viewed.id)}
              >
                Continue to {config.milestones[index + 1]?.title ?? "completion"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              {!isMilestoneReady(viewed, progress) && (
                <p className="text-muted-foreground text-xs">
                  Complete the checkpoints and questions above to continue.
                </p>
              )}
            </div>
          ) : (
            <p className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-xs leading-relaxed">
              {viewed.id === config.verificationMilestoneId
                ? "Run Tests now. All phases must pass together before Submit opens."
                : `Run Tests after your repair. All checks for ${viewed.title} must pass to open ${config.milestones[index + 1]?.title ?? "completion"}.`}
            </p>
          )}
        </div>
      )}
      {complete && (
        <p className="border-accent/40 bg-accent/10 text-foreground flex items-center gap-2 rounded-lg border p-3 text-sm">
          <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
          All phases passed the release check. You can submit now.
        </p>
      )}
    </section>
  )
}
