import { Building2, Rocket, Sparkles, Target } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  INTERVIEW_GOAL_OPTIONS,
  INTERVIEW_TIMELINE_OPTIONS,
  type InterviewGoal,
  type InterviewTimeline,
} from "@/lib/onboarding/profile-personalization"
import { cn } from "@/lib/utils"
import { ChoiceCard } from "./ChoiceCard"

const GOAL_ICONS = [Building2, Rocket, Sparkles, Target] as const

interface GoalTimelineStepProps {
  goal: InterviewGoal | null
  timeline: InterviewTimeline | null
  targetCompany: string
  onGoalChange: (value: InterviewGoal) => void
  onTimelineChange: (value: InterviewTimeline) => void
  onTargetCompanyChange: (value: string) => void
}

export function GoalTimelineStep({
  goal,
  timeline,
  targetCompany,
  onGoalChange,
  onTimelineChange,
  onTargetCompanyChange,
}: GoalTimelineStepProps) {
  return (
    <div>
      <h3
        className="text-foreground text-xl font-semibold tracking-tight focus:outline-none"
        data-personalization-step-heading
        tabIndex={-1}
      >
        What are you aiming for?
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        Your goal and timing shape the practice mix we put in front of you.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Interview goal">
        {INTERVIEW_GOAL_OPTIONS.map((option, index) => (
          <ChoiceCard
            key={option.value}
            {...option}
            icon={GOAL_ICONS[index]}
            selected={goal === option.value}
            onSelect={onGoalChange}
          />
        ))}
      </div>

      <fieldset className="mt-6">
        <legend className="text-foreground text-sm font-medium">
          When do you need to be ready?
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERVIEW_TIMELINE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onTimelineChange(option.value)}
              aria-pressed={timeline === option.value}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm transition-colors",
                "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                timeline === option.value
                  ? "border-accent/60 bg-accent/10 text-accent-strong font-medium"
                  : "border-border/70 bg-background/45 text-muted-foreground hover:border-accent/35 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor="profile-target-company" className="text-foreground text-sm font-medium">
          Target company <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="profile-target-company"
          value={targetCompany}
          onChange={(event) => onTargetCompanyChange(event.target.value)}
          maxLength={100}
          placeholder="e.g. Stripe, Google, an early-stage startup"
          className="bg-background/60 mt-2 h-11"
        />
      </div>
    </div>
  )
}
