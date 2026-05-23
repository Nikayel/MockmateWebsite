"use client"

import { memo } from "react"
import Link from "next/link"
import { Play, Check, Clock, Cpu, Bug, Wrench, Zap, Shield, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Scenario, ScenarioType, DifficultyLevel } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"

interface ScenarioCardProps {
  scenario: Scenario
  isSelected: boolean
  isCompleted: boolean
  usageLimit: UsageLimit | null
  onSelect: (scenario: Scenario) => void
  onStart: (scenario: Scenario) => void
}

// Exercise type quick filters with descriptions
const EXERCISE_TYPES = [
  {
    id: "dsa",
    label: "DSA",
    icon: Cpu,
  },
  {
    id: "bugfix",
    label: "Bug Fix",
    icon: Bug,
  },
  {
    id: "add-functionality",
    label: "Add Feature",
    icon: Wrench,
  },
  {
    id: "optimization",
    label: "Optimize",
    icon: Zap,
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
  },
  {
    id: "system-design",
    label: "System Design",
    icon: Layers,
  },
] as const

const getDifficultyStyle = (difficulty: DifficultyLevel) => {
  switch (difficulty) {
    case "easy":
      return "border-emerald-400/25 text-emerald-300"
    case "medium":
      return "border-amber-300/25 text-amber-200"
    case "hard":
      return "border-rose-300/25 text-rose-200"
    default:
      return "border-white/10 text-zinc-300"
  }
}

const getTypeConfig = (type: ScenarioType) => {
  const config = EXERCISE_TYPES.find((t) => t.id === type)
  return config || EXERCISE_TYPES[0]
}

export const ScenarioCard = memo(function ScenarioCard({
  scenario,
  isSelected,
  isCompleted,
  usageLimit,
  onSelect,
  onStart,
}: ScenarioCardProps) {
  const typeConfig = getTypeConfig(scenario.type)

  return (
    <div
      onClick={() => onSelect(scenario)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-200 ${
        isSelected
          ? "border-white/30 bg-white/[0.07] ring-1 ring-white/20"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
      } `}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70" />

      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10">
            <Check className="h-3 w-3 text-emerald-300" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-xs font-medium text-zinc-200">
          <typeConfig.icon className="h-3 w-3" />
          {typeConfig.label}
        </span>
        <span
          className={`rounded-full border bg-white/[0.035] px-2.5 py-1 text-xs font-medium capitalize ${getDifficultyStyle(scenario.difficulty)}`}
        >
          {scenario.difficulty}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="mb-2 line-clamp-1 font-medium tracking-normal text-white">{scenario.title}</h3>
      <p className="mb-4 line-clamp-2 text-sm leading-6 text-zinc-400">{scenario.description}</p>

      {/* Meta */}
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {scenario.estimatedTime} min
        </div>
        <div className="flex max-w-[120px] items-center gap-1 truncate">
          {scenario.companies.slice(0, 2).join(", ")}
          {scenario.companies.length > 2 && ` +${scenario.companies.length - 2}`}
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {scenario.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[10px] text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {usageLimit && !usageLimit.allowed && scenario.type !== "dsa" && (
          <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.055] p-3">
            <p className="mb-1 text-xs font-medium text-zinc-100">Limit reached</p>
            <p className="mb-2 text-xs text-zinc-400">Upgrade to Pro for unlimited access</p>
            <Link href="/limit-reached">
              <Button
                size="sm"
                className="h-7 w-full bg-white text-xs text-zinc-950 hover:bg-zinc-200"
              >
                Upgrade
              </Button>
            </Link>
          </div>
        )}

        {isSelected ? (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onStart(scenario)
            }}
            disabled={!!(usageLimit && usageLimit.allowed === false && scenario.type !== "dsa")}
            className="w-full rounded-xl bg-white font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Practice
          </Button>
        ) : (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(scenario)
            }}
            variant="outline"
            className="w-full rounded-xl border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
          >
            Select
          </Button>
        )}

        {usageLimit && usageLimit.allowed && scenario.type !== "dsa" && (
          <p className="text-center text-[10px] text-zinc-500">
            {usageLimit.limit - usageLimit.used} session
            {usageLimit.limit - usageLimit.used !== 1 ? "s" : ""} remaining
          </p>
        )}
        {scenario.type === "dsa" && <p className="text-center text-[10px] text-zinc-500">Free</p>}
      </div>
    </div>
  )
})
