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
        <p className="mb-1 text-sm font-medium text-cyan-300">Step 1 of 4</p>
        <h2 className="text-xl font-bold text-foreground">Calibrate the interview room</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
              className={`rounded-lg border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none ${
                isSelected
                  ? "border-cyan-300 bg-cyan-300/10"
                  : "border-border bg-muted/50 hover:border-border"
              }`}
            >
              <Icon
                className={`mb-2 h-5 w-5 ${isSelected ? "text-cyan-300" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <div className={`font-medium ${isSelected ? "text-foreground" : "text-foreground"}`}>
                {role.label}
              </div>
              <div className="text-xs text-muted-foreground">{role.description}</div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-sm text-muted-foreground">Experience</span>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="justify-self-end bg-cyan-300 text-foreground hover:bg-cyan-200 disabled:opacity-50"
        >
          Continue <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
