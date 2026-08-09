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
        <p className="text-accent-strong mb-1 text-sm font-medium">Step 2 of 4</p>
        <h2 className="text-foreground text-xl font-bold">Choose the target signal</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          We&apos;ll shape recommendations around the interview you are preparing for.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Goal selection">
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
              <div className="text-foreground font-medium">{goal.label}</div>
              <div className="text-muted-foreground text-xs">{goal.description}</div>
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
          <p className="text-muted-foreground mb-2 text-sm">Target company (optional)</p>
          <div className="flex flex-wrap gap-2">
            {targetCompanies.map((company) => (
              <button
                key={company}
                onClick={() => handleCompanyClick(company)}
                className={`focus-visible:ring-accent/50 rounded-full border px-3 py-1.5 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none ${
                  targetCompany === company
                    ? "border-accent/50 bg-accent/10 text-accent-strong font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                {company}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-muted-foreground text-sm">Goal</span>
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
