"use client"

import type { RefObject } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  TOUR_STEPS,
  type BugfixTourStep as BugfixTourStepData,
} from "@/app/interview/_utils/bugfix-tour-state"

interface CoachMarkPosition {
  left?: number
  top?: number
  bottom?: number
  width: number | string
}

interface BugfixTourStepProps {
  coachMarkPosition: CoachMarkPosition
  stepIndex: number
  step: BugfixTourStepData
  isFirstStep: boolean
  isLastStep: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}

export function BugfixTourStep({
  coachMarkPosition,
  stepIndex,
  step,
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
  onSkip,
  closeButtonRef,
}: BugfixTourStepProps) {
  return (
    <motion.div
      aria-describedby="bugfix-tour-step-description"
      aria-labelledby="bugfix-tour-step-title"
      aria-live="polite"
      className="bg-background text-foreground pointer-events-auto fixed rounded-lg border border-cyan-300/30 p-4 shadow-2xl shadow-black/50"
      role="dialog"
      style={coachMarkPosition}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-accent-strong mb-1 text-xs font-medium">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </p>
          <h2 id="bugfix-tour-step-title" className="text-foreground text-base font-semibold">
            {step.title}
          </h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onSkip}
          className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground rounded p-1 transition focus:ring-2 focus:ring-cyan-300 focus:outline-none"
          aria-label="Skip bugfix tour"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p
        id="bugfix-tour-step-description"
        className="text-muted-foreground mb-3 text-sm leading-relaxed"
      >
        {step.body}
      </p>
      <div className="border-border bg-card/70 text-muted-foreground mb-4 rounded-md border px-3 py-2 text-xs">
        {step.action}
      </div>
      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {TOUR_STEPS.map((tourStep, index) => (
          <span
            key={tourStep.id}
            className={`h-1.5 flex-1 rounded-full ${
              index <= stepIndex ? "bg-cyan-300" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isFirstStep}
          onClick={onBack}
          className={`justify-self-start ${isFirstStep ? "invisible" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Button>
        <span className="text-muted-foreground text-xs">
          {stepIndex + 1} / {TOUR_STEPS.length}
        </span>
        <Button
          type="button"
          onClick={onNext}
          className="text-foreground justify-self-end bg-cyan-300 hover:bg-cyan-200"
        >
          {isLastStep ? "Finish" : "Next"}
          {!isLastStep && <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />}
        </Button>
      </div>
    </motion.div>
  )
}
