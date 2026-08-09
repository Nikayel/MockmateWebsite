"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Brain,
  Calendar,
  TrendingUp,
  Route,
  Terminal,
} from "lucide-react"

interface WelcomeStepProps {
  userName?: string
  onNext: () => void
}

export function WelcomeStep({ userName, onNext }: WelcomeStepProps) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8"
    >
      <div className="mb-8 text-center">
        <div
          className="border-accent/25 bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border"
          aria-hidden="true"
        >
          <Terminal className="text-accent-strong h-8 w-8" />
        </div>
        <h2 id="onboarding-title" className="text-foreground mb-2 text-2xl font-bold">
          {userName ? `Welcome, ${userName}!` : "Welcome to CodeSparring!"}
        </h2>
        <p id="onboarding-description" className="text-muted-foreground">
          Let&apos;s calibrate your practice room in 4 quick steps.
        </p>
      </div>

      <div className="mb-8 space-y-3">
        {[
          "Interview formats matched to your target",
          "Review timing based on completed reps",
          "Pattern evidence across code, tests, and explanations",
        ].map((feature, i) => (
          <div key={i} className="text-muted-foreground flex items-center gap-3">
            <CheckCircle2 className="text-accent-strong h-5 w-5" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 h-10 w-full"
      >
        Start setup
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </motion.div>
  )
}

interface DailyGoalStepProps {
  dailyGoal: number
  onDailyGoalChange: (value: number) => void
  onBack: () => void
  onNext: () => void
}

const dailyGoals = [
  { value: 1, label: "1 problem/day", desc: "Light practice", time: "~20 min" },
  { value: 3, label: "3 problems/day", desc: "Steady progress", time: "~1 hour" },
  { value: 5, label: "5 problems/day", desc: "Intensive prep", time: "~2 hours" },
]

export function DailyGoalStep({
  dailyGoal,
  onDailyGoalChange,
  onBack,
  onNext,
}: DailyGoalStepProps) {
  return (
    <motion.div
      key="daily"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8"
    >
      <div className="mb-6">
        <p className="text-accent-strong mb-1 text-sm font-medium">Step 3 of 4</p>
        <h2 className="text-foreground text-xl font-bold">Set the daily rep target</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick a pace you can finish under interview pressure.
        </p>
      </div>

      <div className="mb-6 space-y-3" role="radiogroup" aria-label="Daily practice goal selection">
        {dailyGoals.map((goal) => {
          const isSelected = dailyGoal === goal.value
          return (
            <button
              key={goal.value}
              onClick={() => onDailyGoalChange(goal.value)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${goal.label}, ${goal.desc}, approximately ${goal.time}`}
              className={`focus-visible:ring-accent/50 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all focus-visible:ring-2 focus-visible:outline-none ${
                isSelected
                  ? "border-accent/50 bg-accent/5"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-5 w-5 ${isSelected ? "text-accent-strong" : "text-muted-foreground"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <div className="text-foreground font-medium">{goal.label}</div>
                  <div className="text-muted-foreground text-xs">{goal.desc}</div>
                </div>
              </div>
              <div className="text-muted-foreground text-sm" aria-hidden="true">
                {goal.time}
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-border bg-muted/50 mb-6 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent-strong mt-0.5 h-5 w-5"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <div>
            <p className="text-muted-foreground text-sm">
              Consistency beats intensity. A finished rep with review signal is better than a vague
              streak.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-muted-foreground text-sm">Cadence</span>
        <Button
          onClick={onNext}
          className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 justify-self-end"
        >
          Continue <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}

interface SystemOverviewStepProps {
  isSubmitting: boolean
  onBack: () => void
  onComplete: (takeTour: boolean) => void
}

const systemFeatures = [
  {
    icon: Brain,
    title: "Recommendation signal",
    description: "Your next reps are shaped by weak patterns, session results, and target format.",
  },
  {
    icon: Calendar,
    title: "Review schedule",
    description:
      "Solved problems come back when the skill is likely to fade, not just when the streak asks.",
  },
  {
    icon: TrendingUp,
    title: "Readiness trend",
    description: "Track whether you can explain, test, and finish under realistic constraints.",
  },
]

export function SystemOverviewStep({ isSubmitting, onBack, onComplete }: SystemOverviewStepProps) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8"
    >
      <div className="mb-6">
        <p className="text-accent-strong mb-1 text-sm font-medium">Step 4 of 4</p>
        <h2 className="text-foreground text-xl font-bold">How the practice loop works</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s what the system will keep visible.
        </p>
      </div>

      <div className="mb-6 space-y-4">
        {systemFeatures.map((feature, i) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border-border bg-muted/50 flex items-start gap-4 rounded-lg border p-4"
            >
              <div className="bg-accent/10 rounded-lg p-2">
                <Icon className="text-accent-strong h-5 w-5" />
              </div>
              <div>
                <h4 className="text-foreground font-medium">{feature.title}</h4>
                <p className="text-muted-foreground mt-0.5 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="border-neural/25 bg-neural/10 mb-6 rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-neural h-5 w-5" />
          <div>
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">First useful step:</span> Start one real
              round, then let the review schedule tell you what to repeat.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-muted-foreground text-sm">Finish</span>
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => onComplete(false)}
            disabled={isSubmitting}
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {isSubmitting ? "Saving..." : "Start Practicing"}
          </Button>
          <Button
            onClick={() => onComplete(true)}
            disabled={isSubmitting}
            className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50"
          >
            <Route className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Quick Tour First"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
