"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Clock,
  Code,
  MessageSquare,
  Brain,
  CheckCircle,
  Trophy,
  Target,
  Lightbulb,
  TrendingUp,
  Shield,
  Zap,
  Star,
  Award,
} from "lucide-react"

export interface FeedbackLoadingStateProps {
  onGoToDashboard: () => void
  /** Interview statistics to display during loading */
  interviewStats?: {
    testsPassed?: number
    totalTests?: number
    timeSpentMinutes?: number
    messagesExchanged?: number
    codeLines?: number
  }
}

// Progressive stages with more detail
const ANALYSIS_STAGES = [
  {
    icon: Code,
    label: "Analyzing code structure",
    detail: "Examining patterns, style, and organization",
    duration: 3000,
  },
  {
    icon: Brain,
    label: "Evaluating problem-solving",
    detail: "Assessing algorithm efficiency and trade-offs",
    duration: 4000,
  },
  {
    icon: MessageSquare,
    label: "Reviewing communication",
    detail: "Analyzing your explanation and discussion",
    duration: 5000,
  },
  {
    icon: Sparkles,
    label: "Crafting personalized feedback",
    detail: "Creating actionable insights just for you",
    duration: 8000,
  },
]

// Motivational messages that rotate - acknowledgment-focused
const MOTIVATIONAL_MESSAGES = [
  { text: "Great job completing the interview!", icon: Trophy },
  { text: "Your solution is being carefully analyzed", icon: Target },
  { text: "Building your personalized improvement plan", icon: TrendingUp },
  { text: "Every interview is a step forward", icon: Star },
  { text: "Preparing insights to help you grow", icon: Lightbulb },
  { text: "Your effort today matters", icon: Award },
]

// Interview tips to show during loading
const INTERVIEW_TIPS = [
  "Top candidates always clarify requirements before coding",
  "Discussing trade-offs shows engineering maturity",
  "Walking through test cases helps catch edge cases early",
  "Explaining your thought process is as important as the code",
  "Time complexity discussions impress interviewers",
  "Asking about constraints shows attention to detail",
  "Breaking problems into smaller parts demonstrates systematic thinking",
  "Mentioning alternative approaches shows breadth of knowledge",
]

export function FeedbackLoadingState({
  onGoToDashboard,
  interviewStats,
}: FeedbackLoadingStateProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [motivationalIndex, setMotivationalIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [showTip, setShowTip] = useState(false)

  // Randomize initial tip
  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * INTERVIEW_TIPS.length))
    // Show tip after 2 seconds
    const tipTimer = setTimeout(() => setShowTip(true), 2000)
    return () => clearTimeout(tipTimer)
  }, [])

  // Progress through stages
  useEffect(() => {
    const stageTimers: NodeJS.Timeout[] = []
    let totalDelay = 0

    ANALYSIS_STAGES.forEach((stage, index) => {
      if (index > 0) {
        const timer = setTimeout(() => {
          setCurrentStage(index)
        }, totalDelay)
        stageTimers.push(timer)
      }
      totalDelay += stage.duration
    })

    return () => stageTimers.forEach((timer) => clearTimeout(timer))
  }, [])

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Rotate motivational messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMotivationalIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % INTERVIEW_TIPS.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  // Calculate overall progress percentage
  const progressPercentage = useMemo(() => {
    const totalDuration = ANALYSIS_STAGES.reduce((acc, s) => acc + s.duration, 0)
    const completedDuration = ANALYSIS_STAGES.slice(0, currentStage).reduce(
      (acc, s) => acc + s.duration,
      0
    )
    const currentProgress =
      currentStage < ANALYSIS_STAGES.length
        ? Math.min(elapsedTime * 1000 - completedDuration, ANALYSIS_STAGES[currentStage].duration)
        : 0
    return Math.min(((completedDuration + currentProgress) / totalDuration) * 100, 95)
  }, [currentStage, elapsedTime])

  const CurrentMotivation = MOTIVATIONAL_MESSAGES[motivationalIndex]

  return (
    <div className="relative flex min-h-[600px] flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Ambient background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-accent/5 absolute -top-24 -left-24 h-96 w-96 animate-pulse rounded-full blur-3xl" />
        <div
          className="absolute -right-24 -bottom-24 h-96 w-96 animate-pulse rounded-full bg-blue-500/5 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-purple-500/5 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Motivational Header with Animation */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-gray-700/50 bg-gray-800/50 px-4 py-2 backdrop-blur-sm transition-all duration-500">
            <CurrentMotivation.icon className="text-accent h-5 w-5" />
            <span
              key={motivationalIndex}
              className="animate-fade-in text-sm font-medium text-gray-200"
            >
              {CurrentMotivation.text}
            </span>
          </div>

          <h2 className="font-heading mb-2 text-2xl font-bold text-white">
            Crafting Your Feedback
          </h2>
          <p className="text-gray-400">We&apos;re analyzing every aspect of your performance</p>
        </div>

        {/* Main Progress Visualization */}
        <div className="mb-8">
          {/* Circular Progress Indicator */}
          <div className="relative mx-auto mb-6 h-32 w-32">
            {/* Background circle */}
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-gray-800"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${progressPercentage * 2.83} 283`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d9ff" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Sparkles className="text-accent mb-1 h-8 w-8 animate-pulse" />
              <span className="text-lg font-bold text-white">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>

          {/* Progress Bar (alternative linear view) */}
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00d9ff] to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Analyzing</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        {/* Interview Stats Summary */}
        {interviewStats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {interviewStats.testsPassed !== undefined &&
              interviewStats.totalTests !== undefined && (
                <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 text-center backdrop-blur-sm">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="text-lg font-bold text-white">
                    {interviewStats.testsPassed}/{interviewStats.totalTests}
                  </div>
                  <div className="text-xs text-gray-400">Tests Passed</div>
                </div>
              )}
            {interviewStats.timeSpentMinutes !== undefined && (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 text-center backdrop-blur-sm">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-lg font-bold text-white">
                  {interviewStats.timeSpentMinutes}m
                </div>
                <div className="text-xs text-gray-400">Time Spent</div>
              </div>
            )}
            {interviewStats.messagesExchanged !== undefined && (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 text-center backdrop-blur-sm">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-lg font-bold text-white">
                  {interviewStats.messagesExchanged}
                </div>
                <div className="text-xs text-gray-400">Messages</div>
              </div>
            )}
            {interviewStats.codeLines !== undefined && (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 text-center backdrop-blur-sm">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <Code className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white">{interviewStats.codeLines}</div>
                <div className="text-xs text-gray-400">Lines of Code</div>
              </div>
            )}
          </div>
        )}

        {/* Analysis Stages - Compact Card Style */}
        <div className="mb-6 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
            <Zap className="h-3 w-3" />
            Analysis Progress
          </div>
          <div className="space-y-2">
            {ANALYSIS_STAGES.map((stage, index) => {
              const StageIcon = stage.icon
              const isComplete = index < currentStage
              const isCurrent = index === currentStage

              return (
                <div
                  key={stage.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500 ${
                    isComplete
                      ? "bg-green-500/10"
                      : isCurrent
                        ? "bg-accent/10 ring-accent/30 ring-1"
                        : "opacity-40"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                      isComplete
                        ? "bg-green-500/20 text-green-400"
                        : isCurrent
                          ? "bg-accent/20 text-accent"
                          : "bg-gray-700/50 text-gray-500"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <StageIcon className={`h-4 w-4 ${isCurrent ? "animate-pulse" : ""}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm font-medium ${
                        isComplete ? "text-green-400" : isCurrent ? "text-accent" : "text-gray-500"
                      }`}
                    >
                      {stage.label}
                    </div>
                    {isCurrent && (
                      <div className="animate-fade-in text-xs text-gray-400">{stage.detail}</div>
                    )}
                  </div>
                  {isCurrent && (
                    <div className="flex gap-1">
                      <span
                        className="bg-accent h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="bg-accent h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="bg-accent h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Interview Tip Card */}
        <div
          className={`mb-6 overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm transition-all duration-700 ${
            showTip ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-xs font-medium tracking-wider text-amber-400 uppercase">
              Interview Tip
            </span>
          </div>
          <p key={tipIndex} className="animate-fade-in text-sm leading-relaxed text-gray-300">
            {INTERVIEW_TIPS[tipIndex]}
          </p>
        </div>

        {/* Security Badge */}
        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Shield className="h-3.5 w-3.5" />
          <span>Your data is secure and private</span>
        </div>

        {/* Dashboard option - subtle */}
        <div className="flex flex-col items-center gap-3 border-t border-gray-800 pt-4">
          <p className="text-center text-xs text-gray-500">
            Don&apos;t want to wait? Your results will be saved automatically.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToDashboard}
            className="text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
