"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Building2, Zap, Target, Rocket, LucideIcon } from "lucide-react"

interface Goal {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

const goals: Goal[] = [
  { id: "faang", label: "Big Tech", icon: Building2, description: "FAANG/MAANG companies" },
  { id: "startup", label: "Startup", icon: Zap, description: "Fast-paced startups" },
  { id: "general", label: "General Prep", icon: Target, description: "Overall improvement" },
  { id: "promotion", label: "Level Up", icon: Rocket, description: "Internal promotion" },
]

const targetCompanies = [
  "Google",
  "Meta",
  "Amazon",
  "Apple",
  "Microsoft",
  "Netflix",
  "Stripe",
  "Airbnb",
  "Uber",
  "Other",
]

interface InterviewDateSelectorProps {
  selectedGoal: string | null
  targetCompany: string | null
  onGoalChange: (goal: string) => void
  onTargetCompanyChange: (company: string | null) => void
  onBack: () => void
  onNext: () => void
  canProceed: boolean
}

export function InterviewDateSelector({
  selectedGoal,
  targetCompany,
  onGoalChange,
  onTargetCompanyChange,
  onBack,
  onNext,
  canProceed,
}: InterviewDateSelectorProps) {
  const handleGoalChange = (goalId: string) => {
    onGoalChange(goalId)
    if (goalId !== "faang") {
      onTargetCompanyChange(null)
    }
  }

  const handleCompanyClick = (company: string) => {
    onTargetCompanyChange(targetCompany === company ? null : company)
  }

  return (
    <motion.div
      key="goal"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8"
    >
      <div className="mb-6">
        <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 2 of 4</p>
        <h2 className="text-xl font-bold text-white">What's your goal?</h2>
        <p className="text-sm text-gray-400 mt-1">
          We'll tailor recommendations based on your target.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4" role="radiogroup" aria-label="Goal selection">
        {goals.map((goal) => {
          const Icon = goal.icon
          const isSelected = selectedGoal === goal.id
          return (
            <button
              key={goal.id}
              onClick={() => handleGoalChange(goal.id)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${goal.label}: ${goal.description}`}
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
                {goal.label}
              </div>
              <div className="text-xs text-gray-500">{goal.description}</div>
            </button>
          )
        })}
      </div>

      {selectedGoal === "faang" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4"
        >
          <p className="text-sm text-gray-400 mb-2">Target company (optional)</p>
          <div className="flex flex-wrap gap-2">
            {targetCompanies.map((company) => (
              <button
                key={company}
                onClick={() => handleCompanyClick(company)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  targetCompany === company
                    ? "bg-[#00d9ff] text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {company}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex justify-between mt-6">
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
