import { BriefcaseBusiness, GraduationCap, Layers3, UsersRound } from "lucide-react"

import { TARGET_ROLE_OPTIONS, type TargetRole } from "@/lib/onboarding/profile-personalization"
import { ChoiceCard } from "./ChoiceCard"

const ROLE_ICONS = [GraduationCap, UsersRound, BriefcaseBusiness, Layers3] as const

interface TargetRoleStepProps {
  value: TargetRole | null
  onChange: (value: TargetRole) => void
}

export function TargetRoleStep({ value, onChange }: TargetRoleStepProps) {
  return (
    <div>
      <h3
        className="text-foreground text-xl font-semibold tracking-tight focus:outline-none"
        data-personalization-step-heading
        tabIndex={-1}
      >
        What level are you targeting?
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        We’ll tune follow-up depth and interviewer expectations—not judge your current ability.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Target role">
        {TARGET_ROLE_OPTIONS.map((option, index) => (
          <ChoiceCard
            key={option.value}
            {...option}
            icon={ROLE_ICONS[index]}
            selected={value === option.value}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  )
}
