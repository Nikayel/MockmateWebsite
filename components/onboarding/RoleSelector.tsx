"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Code2,
  Rocket,
  LucideIcon,
} from "lucide-react"

interface Role {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

const roles: Role[] = [
  {
    id: "student",
    label: "Student",
    icon: GraduationCap,
    description: "Learning fundamentals",
  },
  { id: "junior", label: "Junior", icon: Code2, description: "0-2 years experience" },
  { id: "mid", label: "Mid-level", icon: Briefcase, description: "2-5 years experience" },
  { id: "senior", label: "Senior+", icon: Rocket, description: "5+ years experience" },
]

interface RoleSelectorProps {
  selectedRole: string | null
  onRoleChange: (role: string) => void
  onBack: () => void
  onNext: () => void
  canProceed: boolean
}

export function RoleSelector({
  selectedRole,
  onRoleChange,
  onBack,
  onNext,
  canProceed,
}: RoleSelectorProps) {
  return (
    <motion.div
      key="role"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8"
    >
      <div className="mb-6">
        <p className="text-accent-strong mb-1 text-sm font-medium">Step 1 of 4</p>
        <h2 className="text-foreground text-xl font-bold">Calibrate the interview room</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          This sets the difficulty and follow-up pressure.
        </p>
      </div>

      <div
        className="mb-6 grid grid-cols-2 gap-3"
        role="radiogroup"
        aria-label="Experience level selection"
      >
        {roles.map((role) => {
          const Icon = role.icon
          const isSelected = selectedRole === role.id
          return (
            <button
              key={role.id}
              onClick={() => onRoleChange(role.id)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${role.label}: ${role.description}`}
              className={`focus-visible:ring-accent/50 rounded-lg border p-4 text-left transition-all focus-visible:ring-2 focus-visible:outline-none ${
                isSelected
                  ? "border-accent/50 bg-accent/5"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
              }`}
            >
              <Icon
                className={`mb-2 h-5 w-5 ${isSelected ? "text-accent-strong" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <div className="text-foreground font-medium">{role.label}</div>
              <div className="text-muted-foreground text-xs">{role.description}</div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-muted-foreground text-sm">Experience</span>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 justify-self-end disabled:opacity-50"
        >
          Continue <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
