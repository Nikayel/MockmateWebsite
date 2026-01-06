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
        <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 1 of 4</p>
        <h2 className="text-xl font-bold text-white">What's your experience level?</h2>
        <p className="text-sm text-gray-400 mt-1">This helps us calibrate problem difficulty.</p>
      </div>

      <div
        className="grid grid-cols-2 gap-3 mb-6"
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
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-[#00d9ff] bg-[#00d9ff]/10"
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
              }`}
            >
              <Icon
                className={`h-5 w-5 mb-2 ${isSelected ? "text-[#00d9ff]" : "text-gray-400"}`}
                aria-hidden="true"
              />
              <div className={`font-medium ${isSelected ? "text-white" : "text-gray-200"}`}>
                {role.label}
              </div>
              <div className="text-xs text-gray-500">{role.description}</div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-gray-400">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black disabled:opacity-50"
        >
          Continue <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
