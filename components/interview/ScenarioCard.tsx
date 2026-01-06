"use client"

import { memo } from "react"
import Link from "next/link"
import { Play, Check, Clock, Cpu, Bug, Wrench, Zap, Shield } from "lucide-react"
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
    id: 'dsa',
    label: 'DSA',
    icon: Cpu,
    lightBg: 'bg-sky-500/10',
    lightText: 'text-sky-400'
  },
  {
    id: 'bugfix',
    label: 'Bug Fix',
    icon: Bug,
    lightBg: 'bg-emerald-500/10',
    lightText: 'text-emerald-400'
  },
  {
    id: 'add-functionality',
    label: 'Add Feature',
    icon: Wrench,
    lightBg: 'bg-amber-500/10',
    lightText: 'text-amber-400'
  },
  {
    id: 'optimization',
    label: 'Optimize',
    icon: Zap,
    lightBg: 'bg-violet-500/10',
    lightText: 'text-violet-400'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    lightBg: 'bg-red-500/10',
    lightText: 'text-red-400'
  },
] as const

const getDifficultyStyle = (difficulty: DifficultyLevel) => {
  switch (difficulty) {
    case "easy": return "bg-emerald-500/10 text-emerald-400"
    case "medium": return "bg-amber-500/10 text-amber-400"
    case "hard": return "bg-red-500/10 text-red-400"
    default: return "bg-zinc-500/10 text-zinc-400"
  }
}

const getTypeConfig = (type: ScenarioType) => {
  const config = EXERCISE_TYPES.find(t => t.id === type)
  return config || EXERCISE_TYPES[0]
}

export const ScenarioCard = memo(function ScenarioCard({
  scenario,
  isSelected,
  isCompleted,
  usageLimit,
  onSelect,
  onStart
}: ScenarioCardProps) {
  const typeConfig = getTypeConfig(scenario.type)

  return (
    <div
      onClick={() => onSelect(scenario)}
      className={`
        relative bg-zinc-900/50 border rounded-xl p-5 cursor-pointer transition-all
        ${isSelected
          ? 'border-white/30 ring-1 ring-white/20'
          : 'border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeConfig.lightBg} ${typeConfig.lightText}`}>
          <typeConfig.icon className="h-3 w-3" />
          {typeConfig.label}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyStyle(scenario.difficulty)}`}>
          {scenario.difficulty}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="text-white font-medium mb-2 line-clamp-1">{scenario.title}</h3>
      <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{scenario.description}</p>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {scenario.estimatedTime} min
        </div>
        <div className="flex items-center gap-1 truncate max-w-[120px]">
          {scenario.companies.slice(0, 2).join(', ')}
          {scenario.companies.length > 2 && ` +${scenario.companies.length - 2}`}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {scenario.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400">
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {usageLimit && !usageLimit.allowed && scenario.type !== "dsa" && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-2">
            <p className="text-amber-400 text-xs font-medium mb-1">Limit reached</p>
            <p className="text-zinc-400 text-xs mb-2">Upgrade to Pro for unlimited access</p>
            <Link href="/limit-reached">
              <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs h-7">
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
            className="w-full bg-white hover:bg-zinc-200 text-zinc-900 font-medium disabled:opacity-50"
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
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Select
          </Button>
        )}

        {usageLimit && usageLimit.allowed && scenario.type !== "dsa" && (
          <p className="text-[10px] text-zinc-500 text-center">
            {usageLimit.limit - usageLimit.used} session{usageLimit.limit - usageLimit.used !== 1 ? 's' : ''} remaining
          </p>
        )}
        {scenario.type === "dsa" && (
          <p className="text-[10px] text-emerald-500 text-center">Free</p>
        )}
      </div>
    </div>
  )
})
