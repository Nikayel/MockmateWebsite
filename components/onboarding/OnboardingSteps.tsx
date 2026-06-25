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
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10"
          aria-hidden="true"
        >
          <Terminal className="h-8 w-8 text-cyan-200" />
        </div>
        <h2 id="onboarding-title" className="mb-2 text-2xl font-bold text-white">
          {userName ? `Welcome, ${userName}!` : "Welcome to CodeSparring!"}
        </h2>
        <p id="onboarding-description" className="text-gray-400">
          Let&apos;s calibrate your practice room in 4 quick steps.
        </p>
      </div>

      <div className="mb-8 space-y-3">
        {[
          "Interview formats matched to your target",
          "Review timing based on completed reps",
          "Pattern evidence across code, tests, and explanations",
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-gray-300">
            <CheckCircle2 className="h-5 w-5 text-cyan-300" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="h-10 w-full bg-cyan-300 text-gray-950 hover:bg-cyan-200">
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
        <p className="mb-1 text-sm font-medium text-cyan-300">Step 3 of 4</p>
        <h2 className="text-xl font-bold text-white">Set the daily rep target</h2>
        <p className="mt-1 text-sm text-gray-400">
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
              className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none ${
                isSelected
                  ? "border-cyan-300 bg-cyan-300/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-5 w-5 ${isSelected ? "text-cyan-300" : "text-gray-400"}`}>
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
                  <div className={`font-medium ${isSelected ? "text-white" : "text-gray-200"}`}>
                    {goal.label}
                  </div>
                  <div className="text-xs text-gray-500">{goal.desc}</div>
                </div>
              </div>
              <div className="text-sm text-gray-400" aria-hidden="true">
                {goal.time}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
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
            className="mt-0.5 h-5 w-5 text-cyan-300"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <div>
            <p className="text-sm text-gray-300">
              Consistency beats intensity. A finished rep with review signal is better than a vague
              streak.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Button variant="ghost" onClick={onBack} className="text-gray-400">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-sm text-gray-500">Cadence</span>
        <Button
          onClick={onNext}
          className="justify-self-end bg-cyan-300 text-gray-950 hover:bg-cyan-200"
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
        <p className="mb-1 text-sm font-medium text-cyan-300">Step 4 of 4</p>
        <h2 className="text-xl font-bold text-white">How the practice loop works</h2>
        <p className="mt-1 text-sm text-gray-400">Here&apos;s what the system will keep visible.</p>
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
              className="flex items-start gap-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4"
            >
              <div className="rounded-lg bg-cyan-300/10 p-2">
                <Icon className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h4 className="font-medium text-white">{feature.title}</h4>
                <p className="mt-0.5 text-sm text-gray-400">{feature.description}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <div>
            <p className="text-sm text-gray-300">
              <span className="font-medium text-white">First useful step:</span> Start one real
              round, then let the review schedule tell you what to repeat.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-gray-400">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-sm text-gray-500">Finish</span>
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => onComplete(false)}
            disabled={isSubmitting}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {isSubmitting ? "Saving..." : "Start Practicing"}
          </Button>
          <Button
            onClick={() => onComplete(true)}
            disabled={isSubmitting}
            className="bg-cyan-300 text-gray-950 hover:bg-cyan-200"
          >
            <Route className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Quick Tour First"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
