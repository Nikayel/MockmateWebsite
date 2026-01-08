"use client"

/**
 * Score Info Tooltip
 *
 * Provides helpful "?" icons that explain what each score/metric means.
 * Helps users understand the different scoring systems and mastery levels.
 */

import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type ScoreInfoType =
  | "overall"
  | "technical"
  | "mastery"
  | "mastered"
  | "reviewing"
  | "learning"
  | "new"
  | "testPassRate"
  | "understanding"
  | "problemSolving"
  | "codeQuality"
  | "communication"

interface ScoreExplanation {
  title: string
  description: string
}

const SCORE_EXPLANATIONS: Record<ScoreInfoType, ScoreExplanation> = {
  overall: {
    title: "Overall Score",
    description:
      "Your complete interview performance including code quality, problem-solving, understanding, and how well you communicated your approach.",
  },
  technical: {
    title: "Technical Score",
    description:
      "Code-focused performance only. Measures your understanding, problem-solving, and code quality - excludes communication.",
  },
  mastery: {
    title: "Mastery Score",
    description:
      "How well your code works - based purely on test pass rate. Used to schedule your review sessions.",
  },
  mastered: {
    title: "Mastered",
    description:
      "You've consistently solved this problem correctly over 21+ days. It's in your long-term memory! We'll check in occasionally to keep it fresh.",
  },
  reviewing: {
    title: "Reviewing",
    description:
      "You know this pattern but need occasional practice. We'll remind you before you forget - typically every 7-20 days.",
  },
  learning: {
    title: "Learning",
    description:
      "You're still building this skill. Practice regularly (every few days) to move it to long-term memory.",
  },
  new: {
    title: "New",
    description: "You haven't practiced this problem yet. Start here to begin building mastery!",
  },
  testPassRate: {
    title: "Test Pass Rate",
    description:
      "Percentage of test cases your solution passed. This is the primary measure of code correctness and drives your mastery level.",
  },
  understanding: {
    title: "Understanding",
    description:
      "How well you understood the problem before coding. Includes asking clarifying questions and identifying edge cases.",
  },
  problemSolving: {
    title: "Problem-Solving",
    description:
      "Your approach to solving the problem. Considers algorithm selection, optimization thinking, and handling constraints.",
  },
  codeQuality: {
    title: "Code Quality",
    description:
      "How clean, efficient, and maintainable your code is. Includes naming, structure, and following best practices.",
  },
  communication: {
    title: "Communication",
    description:
      "How well you explained your thinking. In real interviews, this is crucial - interviewers want to understand your thought process.",
  },
}

interface ScoreInfoTooltipProps {
  type: ScoreInfoType
  className?: string
  iconClassName?: string
}

export function ScoreInfoTooltip({
  type,
  className = "",
  iconClassName = "",
}: ScoreInfoTooltipProps) {
  const info = SCORE_EXPLANATIONS[type]

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`ml-1 rounded text-zinc-500 transition-colors hover:text-zinc-400 focus:ring-1 focus:ring-zinc-500 focus:outline-none ${className}`}
            aria-label={`Learn more about ${info.title}`}
          >
            <HelpCircle className={`h-3.5 w-3.5 ${iconClassName}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs border-zinc-800 bg-zinc-900" side="top" sideOffset={5}>
          <p className="text-sm font-medium text-white">{info.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{info.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Inline score label with tooltip
 * Combines a label with the info tooltip for consistent styling
 */
interface ScoreLabelProps {
  type: ScoreInfoType
  label?: string // Override default label
  className?: string
}

export function ScoreLabel({ type, label, className = "" }: ScoreLabelProps) {
  const info = SCORE_EXPLANATIONS[type]
  const displayLabel = label ?? info.title

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span>{displayLabel}</span>
      <ScoreInfoTooltip type={type} />
    </span>
  )
}
