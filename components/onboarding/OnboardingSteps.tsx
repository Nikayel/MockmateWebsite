"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Brain,
  Calendar,
  TrendingUp,
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
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 bg-gradient-to-br from-[#00d9ff] to-[#00ff88] rounded-2xl flex items-center justify-center mx-auto mb-4"
          aria-hidden="true"
        >
          <Sparkles className="h-8 w-8 text-black" />
        </div>
        <h2 id="onboarding-title" className="text-2xl font-bold text-white mb-2">
          {userName ? `Welcome, ${userName}!` : "Welcome to CodeSparring!"}
        </h2>
        <p id="onboarding-description" className="text-gray-400">
          Let's set up your personalized practice experience in 4 quick steps.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {[
          "Personalized problem recommendations",
          "Spaced repetition for long-term retention",
          "Progress tracking across patterns",
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-gray-300">
            <CheckCircle2 className="h-5 w-5 text-[#00d9ff]" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black py-6"
      >
        Let's Get Started
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
        <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 3 of 4</p>
        <h2 className="text-xl font-bold text-white">How much do you want to practice?</h2>
        <p className="text-sm text-gray-400 mt-1">Set a daily goal. You can adjust this anytime.</p>
      </div>

      <div
        className="space-y-3 mb-6"
        role="radiogroup"
        aria-label="Daily practice goal selection"
      >
        {dailyGoals.map((goal) => {
          const isSelected = dailyGoal === goal.value
          return (
            <button
              key={goal.value}
              onClick={() => onDailyGoalChange(goal.value)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${goal.label}, ${goal.desc}, approximately ${goal.time}`}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                isSelected
                  ? "border-[#00d9ff] bg-[#00d9ff]/10"
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-5 w-5 ${isSelected ? "text-[#00d9ff]" : "text-gray-400"}`}>
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

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 mb-6">
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
            className="h-5 w-5 text-[#00d9ff] mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <div>
            <p className="text-sm text-gray-300">
              Consistency beats intensity. Even 1 problem a day compounds over time.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-gray-400">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext} className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black">
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
    title: "Smart Recommendations",
    description:
      "We analyze your performance and suggest problems targeting your weak areas.",
  },
  {
    icon: Calendar,
    title: "Spaced Repetition",
    description:
      "Problems you've solved are scheduled for review at optimal intervals to build long-term retention.",
  },
  {
    icon: TrendingUp,
    title: "Pattern Mastery",
    description:
      "Track your progress across 15 DSA patterns and see which ones need more attention.",
  },
]

export function SystemOverviewStep({
  isSubmitting,
  onBack,
  onComplete,
}: SystemOverviewStepProps) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8"
    >
      <div className="mb-6">
        <p className="text-sm text-[#00d9ff] font-medium mb-1">Step 4 of 4</p>
        <h2 className="text-xl font-bold text-white">How CodeSparring works for you</h2>
        <p className="text-sm text-gray-400 mt-1">Here's what to expect from your practice.</p>
      </div>

      <div className="space-y-4 mb-6">
        {systemFeatures.map((feature, i) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
            >
              <div className="p-2 bg-[#00d9ff]/10 rounded-lg">
                <Icon className="h-5 w-5 text-[#00d9ff]" />
              </div>
              <div>
                <h4 className="font-medium text-white">{feature.title}</h4>
                <p className="text-sm text-gray-400 mt-0.5">{feature.description}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="p-4 bg-gradient-to-r from-[#00d9ff]/10 to-[#00ff88]/10 rounded-xl border border-[#00d9ff]/20 mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[#00d9ff]" />
          <div>
            <p className="text-sm text-gray-300">
              <span className="text-white font-medium">Pro tip:</span> Check the Practice page
              for your personalized review schedule.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-gray-400">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-3">
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
            className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Quick Tour First"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
