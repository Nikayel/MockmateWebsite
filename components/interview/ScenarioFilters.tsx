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

  /** Restrict which type pills are shown (per tab). Empty array hides the row. */
  availableTypes?: ScenarioType[]
}

// Exercise type quick filters with descriptions
const EXERCISE_TYPES = [
  {
    id: "bugfix",
    label: "Bug Fix",
    description: "Repair failing codebases",
    icon: Bug,
  },
  {
    id: "add-functionality",
    label: "Add Feature",
    description: "Extend codebases",
    icon: Wrench,
  },
  {
    id: "optimization",
    label: "Optimize",
    description: "Improve performance",
    icon: Zap,
  },
  {
    id: "security",
    label: "Security",
    description: "Fix vulnerabilities",
    icon: Shield,
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Architecture & scalability",
    icon: Layers,
  },
  {
    id: "dsa",
    label: "DSA Drill",
    description: "Algorithms & data structures",
    icon: Cpu,
  },
] as const

const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "border-emerald-300/25 text-emerald-200" },
  { id: "medium", label: "Medium", color: "border-amber-300/25 text-amber-100" },
  { id: "hard", label: "Hard", color: "border-rose-300/25 text-rose-100" },
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

// Number of scenarios per company, for the company dropdown counts.
const COMPANY_COUNTS = scenarios.reduce<Record<string, number>>((acc, s) => {
  for (const company of s.companies) acc[company] = (acc[company] ?? 0) + 1
  return acc
}, {})

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
  availableTypes,
}: ScenarioFiltersProps) {
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [companyQuery, setCompanyQuery] = useState("")

  const visibleTypes = availableTypes
    ? EXERCISE_TYPES.filter((t) => availableTypes.includes(t.id as ScenarioType))
    : EXERCISE_TYPES

  const visibleCompanies = companyQuery
    ? COMPANIES.filter((c) => c.toLowerCase().includes(companyQuery.toLowerCase()))
    : COMPANIES

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 shadow-2xl backdrop-blur-2xl">
      {/* Search & Actions Row */}
      <div className="flex flex-col gap-4 border-b border-white/[0.04] pb-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left side: Search input + Stats */}
        <div className="max-w-xl flex-1">
          <ScenarioSearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            resultsCount={resultsCount}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={onClearFilters}
          />
        </div>

        {/* Right side: Difficulty + Company Selectors */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Difficulty Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Difficulty
            </span>
            <div className="flex gap-1.5">
              {DIFFICULTIES.map((diff) => {
                const isActive = filterDifficulty.includes(diff.id as DifficultyLevel)
                return (
                  <button
                    key={diff.id}
                    onClick={() => onToggleDifficulty(diff.id as DifficultyLevel)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? `${diff.id === "easy" ? "border-transparent bg-emerald-500/20 text-emerald-300" : diff.id === "medium" ? "border-transparent bg-amber-500/20 text-amber-200" : "border-transparent bg-rose-500/20 text-rose-300"} font-semibold`
                        : "border-transparent bg-white/[0.025] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                    } `}
                    aria-pressed={isActive}
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
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-200 ${
                filterCompanies.length > 0
                  ? "border-transparent bg-white/10 text-white"
                  : "border-transparent bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
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
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                <div className="fixed inset-0 z-10" onClick={() => setShowCompanyDropdown(false)} />
                <div className="absolute top-full right-0 z-20 mt-2 flex max-h-80 w-60 flex-col rounded-2xl border border-white/[0.06] bg-zinc-950/90 shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/[0.06] p-2">
                    <input
                      autoFocus
                      value={companyQuery}
                      onChange={(e) => setCompanyQuery(e.target.value)}
                      placeholder="Search companies"
                      aria-label="Search companies"
                      className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/15 focus:outline-none"
                    />
                  </div>
                  <div className="overflow-y-auto py-1">
                    {visibleCompanies.length === 0 && (
                      <p className="px-3 py-2 text-sm text-zinc-600">No matches</p>
                    )}
                    {visibleCompanies.map((company) => {
                      const isActive = filterCompanies.includes(company as Company)
                      return (
                        <button
                          key={company}
                          onClick={() => onToggleCompany(company as Company)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
                        >
                          <span className={isActive ? "text-white" : "text-zinc-400"}>
                            {company}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600">
                              {COMPANY_COUNTS[company] ?? 0}
                            </span>
                            {isActive && <Check className="h-3.5 w-3.5 text-zinc-200" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {filterCompanies.length > 0 && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={onClearCompanies}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
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
      </div>

      {/* Type Filter - Horizontal Pills (Second Row) */}
      {visibleTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {visibleTypes.map((type) => {
            const Icon = type.icon
            const isActive = filterType.includes(type.id as ScenarioType)
            const count = scenarios.filter((s) => s.type === type.id).length
            return (
              <button
                key={type.id}
                onClick={() => onToggleType(type.id as ScenarioType)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border-transparent bg-white text-zinc-950 shadow-sm"
                    : "border-transparent bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                } `}
                aria-pressed={isActive}
                title={type.description}
              >
                <Icon className="h-3.5 w-3.5" />
                {type.label}
                <span className={`text-xs ${isActive ? "text-zinc-500" : "text-zinc-500"}`}>
                  {count}
                </span>
                {isActive && <Check className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          <span className="text-xs text-zinc-600">Active:</span>
          {filterType.map((t) => {
            const type = EXERCISE_TYPES.find((et) => et.id === t)
            if (!type) return null
            const Icon = type.icon
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border-transparent bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300"
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
              className={`inline-flex items-center gap-1.5 rounded-full border-transparent px-2.5 py-1 text-xs ${
                d === "easy"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : d === "medium"
                    ? "bg-amber-500/10 text-amber-200"
                    : "bg-rose-500/10 text-rose-300"
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
              className="inline-flex items-center gap-1.5 rounded-full border-transparent bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300"
            >
              {c}
              <button onClick={() => onRemoveCompany(c)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-transparent bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300">
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
