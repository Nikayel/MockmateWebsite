"use client"

import { memo, useState } from "react"
import {
  Cpu,
  Bug,
  Wrench,
  Zap,
  Shield,
  Check,
  X,
  ChevronDown,
  Building2,
  Layers,
} from "lucide-react"
import { scenarios, type ScenarioType, type DifficultyLevel, type Company } from "@/lib/scenarios"
import { ScenarioSearchBar } from "./ScenarioSearchBar"

interface ScenarioFiltersProps {
  // Search
  searchQuery: string
  onSearchChange: (value: string) => void
  resultsCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void

  // Type filters
  filterType: ScenarioType[]
  onToggleType: (type: ScenarioType) => void
  onRemoveType: (type: ScenarioType) => void

  // Difficulty filters
  filterDifficulty: DifficultyLevel[]
  onToggleDifficulty: (difficulty: DifficultyLevel) => void
  onRemoveDifficulty: (difficulty: DifficultyLevel) => void

  // Company filters
  filterCompanies: Company[]
  onToggleCompany: (company: Company) => void
  onRemoveCompany: (company: Company) => void
  onClearCompanies: () => void
}

// Exercise type quick filters with descriptions
const EXERCISE_TYPES = [
  {
    id: "dsa",
    label: "DSA",
    description: "Algorithms & data structures",
    icon: Cpu,
    color: "bg-sky-500",
    textColor: "text-white",
    borderColor: "border-sky-500",
    lightBg: "bg-sky-500/10",
    lightText: "text-sky-400",
  },
  {
    id: "bugfix",
    label: "Bug Fix",
    description: "Debug existing code",
    icon: Bug,
    color: "bg-emerald-500",
    textColor: "text-white",
    borderColor: "border-emerald-500",
    lightBg: "bg-emerald-500/10",
    lightText: "text-emerald-400",
  },
  {
    id: "add-functionality",
    label: "Add Feature",
    description: "Extend codebases",
    icon: Wrench,
    color: "bg-amber-500",
    textColor: "text-black",
    borderColor: "border-amber-500",
    lightBg: "bg-amber-500/10",
    lightText: "text-amber-400",
  },
  {
    id: "optimization",
    label: "Optimize",
    description: "Improve performance",
    icon: Zap,
    color: "bg-violet-500",
    textColor: "text-white",
    borderColor: "border-violet-500",
    lightBg: "bg-violet-500/10",
    lightText: "text-violet-400",
  },
  {
    id: "security",
    label: "Security",
    description: "Fix vulnerabilities",
    icon: Shield,
    color: "bg-red-500",
    textColor: "text-white",
    borderColor: "border-red-500",
    lightBg: "bg-red-500/10",
    lightText: "text-red-400",
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Architecture & scalability",
    icon: Layers,
    color: "bg-indigo-500",
    textColor: "text-white",
    borderColor: "border-indigo-500",
    lightBg: "bg-indigo-500/10",
    lightText: "text-indigo-400",
  },
] as const

const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { id: "medium", label: "Medium", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { id: "hard", label: "Hard", color: "bg-red-500/10 text-red-400 border-red-500/30" },
] as const

// Dynamically get all unique companies from scenarios
const ALL_COMPANIES = Array.from(new Set(scenarios.flatMap((s) => s.companies))).sort() as Company[]

// Priority companies to show first in the dropdown
const PRIORITY_COMPANIES = [
  "Google",
  "Meta",
  "Amazon",
  "Microsoft",
  "Apple",
  "Netflix",
  // Popular intern/new-grad companies
  "Roblox",
  "TikTok",
  "Snap",
  "Pinterest",
  "Reddit",
  "Spotify",
  "NVIDIA",
  "Atlassian",
  "Oracle",
  "Twitch",
  // Other top companies
  "Airbnb",
  "Shopify",
  "Uber",
  "Lyft",
  "DoorDash",
]

// Sort companies with priority ones first
const COMPANIES = [
  ...PRIORITY_COMPANIES.filter((c) => ALL_COMPANIES.includes(c as Company)),
  ...ALL_COMPANIES.filter((c) => !PRIORITY_COMPANIES.includes(c)),
] as Company[]

export const ScenarioFilters = memo(function ScenarioFilters({
  searchQuery,
  onSearchChange,
  resultsCount,
  hasActiveFilters,
  onClearFilters,
  filterType,
  onToggleType,
  onRemoveType,
  filterDifficulty,
  onToggleDifficulty,
  onRemoveDifficulty,
  filterCompanies,
  onToggleCompany,
  onRemoveCompany,
  onClearCompanies,
}: ScenarioFiltersProps) {
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)

  return (
    <div className="mb-6 space-y-4">
      {/* Search + Quick Stats */}
      <ScenarioSearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        resultsCount={resultsCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />

      {/* Type Filter - Horizontal Pills */}
      <div className="flex flex-wrap gap-2">
        {EXERCISE_TYPES.map((type) => {
          const Icon = type.icon
          const isActive = filterType.includes(type.id as ScenarioType)
          const count = scenarios.filter((s) => s.type === type.id).length
          return (
            <button
              key={type.id}
              onClick={() => onToggleType(type.id as ScenarioType)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? `${type.color} ${type.textColor}`
                  : `${type.lightBg} ${type.lightText} hover:opacity-80`
              } `}
            >
              <Icon className="h-3.5 w-3.5" />
              {type.label}
              <span className={`text-xs ${isActive ? "opacity-70" : "opacity-60"}`}>{count}</span>
              {isActive && <Check className="h-3 w-3" />}
            </button>
          )
        })}
      </div>

      {/* Difficulty + Company Row */}
      <div className="flex flex-wrap gap-3">
        {/* Difficulty Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-zinc-500 uppercase">Difficulty</span>
          <div className="flex gap-1">
            {DIFFICULTIES.map((diff) => {
              const isActive = filterDifficulty.includes(diff.id as DifficultyLevel)
              return (
                <button
                  key={diff.id}
                  onClick={() => onToggleDifficulty(diff.id as DifficultyLevel)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? diff.color + " border-current"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  } `}
                >
                  {diff.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Company Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all ${
              filterCompanies.length > 0
                ? "border-zinc-700 bg-zinc-800 text-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            } `}
          >
            <Building2 className="h-3.5 w-3.5" />
            {filterCompanies.length > 0 ? `${filterCompanies.length} companies` : "Companies"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showCompanyDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCompanyDropdown(false)} />
              <div className="absolute top-full left-0 z-20 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 py-2 shadow-xl">
                {COMPANIES.map((company) => {
                  const isActive = filterCompanies.includes(company as Company)
                  return (
                    <button
                      key={company}
                      onClick={() => onToggleCompany(company as Company)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-800"
                    >
                      <span className={isActive ? "text-white" : "text-zinc-400"}>{company}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                    </button>
                  )
                })}
                {filterCompanies.length > 0 && (
                  <>
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                      onClick={onClearCompanies}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      Clear selection
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/50 pt-2">
          <span className="text-xs text-zinc-600">Active:</span>
          {filterType.map((t) => {
            const type = EXERCISE_TYPES.find((et) => et.id === t)
            if (!type) return null
            const Icon = type.icon
            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs ${type.lightBg} ${type.lightText}`}
              >
                <Icon className="h-3 w-3" />
                {type.label}
                <button onClick={() => onRemoveType(t)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
          {filterDifficulty.map((d) => (
            <span
              key={d}
              className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
                d === "easy"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : d === "medium"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
              }`}
            >
              {d}
              <button onClick={() => onRemoveDifficulty(d)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filterCompanies.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
            >
              {c}
              <button onClick={() => onRemoveCompany(c)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              "{searchQuery}"
              <button onClick={() => onSearchChange("")} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
})
