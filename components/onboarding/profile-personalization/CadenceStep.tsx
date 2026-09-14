import { CalendarDays } from "lucide-react"

import { WEEKLY_GOAL_OPTIONS } from "@/lib/onboarding/profile-personalization"
import { ChoiceCard } from "./ChoiceCard"

interface CadenceStepProps {
  value: number | null
  onChange: (value: number) => void
}

export function CadenceStep({ value, onChange }: CadenceStepProps) {
  return (
    <div>
      <h3
        className="text-foreground text-xl font-semibold tracking-tight focus:outline-none"
        data-personalization-step-heading
        tabIndex={-1}
      >
        What pace can you actually sustain?
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        We’ll use this to keep recommendations realistic. You can change it later.
      </p>
      <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Weekly practice cadence">
        {WEEKLY_GOAL_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.value}
            {...option}
            label={`${option.label} / week`}
            icon={CalendarDays}
            selected={value === option.value}
            onSelect={onChange}
          />
        ))}
      </div>
      <div className="border-neural/25 bg-neural/10 mt-6 rounded-xl border p-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          <span className="text-foreground font-medium">Built from evidence.</span> Your first
          session still sets the skill baseline; these answers only tell us where you want to go.
        </p>
      </div>
    </div>
  )
}
