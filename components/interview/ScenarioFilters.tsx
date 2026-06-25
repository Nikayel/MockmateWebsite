"use client"

import { memo, useState, useRef, useEffect } from "react"
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
  const companyTriggerRef = useRef<HTMLButtonElement>(null)
  const companyMenuRef = useRef<HTMLDivElement>(null)

  const closeCompanyDropdown = (returnFocus = true) => {
    setShowCompanyDropdown(false)
    if (returnFocus) companyTriggerRef.current?.focus()
  }

  // Focus the first option when the company menu opens (keyboard users).
  useEffect(() => {
    if (!showCompanyDropdown) return
    const first = companyMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitemcheckbox"]'
    )
    first?.focus()
  }, [showCompanyDropdown])

  // Arrow / Home / End / Escape navigation within the open company menu.
  const handleCompanyMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeCompanyDropdown()
      return
    }
    const items = Array.from(
      companyMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]') ?? []
    )
    if (items.length === 0) return
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex = currentIndex
    switch (event.key) {
      case "ArrowDown":
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
        break
      case "ArrowUp":
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
        break
      case "Home":
        nextIndex = 0
        break
      case "End":
        nextIndex = items.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    items[nextIndex]?.focus()
  }

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
              ref={companyTriggerRef}
              onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              className={`focus-visible:ring-accent flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                filterCompanies.length > 0
                  ? "border-transparent bg-white/10 text-white"
                  : "border-transparent bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              } `}
              aria-haspopup="menu"
              aria-expanded={showCompanyDropdown}
              aria-label={
                filterCompanies.length > 0
                  ? `Filter by company, ${filterCompanies.length} selected`
                  : "Filter by company"
              }
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {filterCompanies.length > 0 ? `${filterCompanies.length} companies` : "Companies"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {showCompanyDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => closeCompanyDropdown(false)}
                  aria-hidden="true"
                />
                <div
                  ref={companyMenuRef}
                  role="menu"
                  tabIndex={-1}
                  aria-label="Filter by company"
                  onKeyDown={handleCompanyMenuKeyDown}
                  className="absolute top-full right-0 z-20 mt-2 max-h-80 w-[min(14rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/[0.06] bg-zinc-950/90 py-2 shadow-2xl backdrop-blur-xl"
                >
                  {COMPANIES.map((company) => {
                    const isActive = filterCompanies.includes(company as Company)
                    return (
                      <button
                        key={company}
                        role="menuitemcheckbox"
                        aria-checked={isActive}
                        onClick={() => onToggleCompany(company as Company)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none"
                      >
                        <span className={isActive ? "text-white" : "text-zinc-400"}>{company}</span>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-zinc-200" aria-hidden="true" />
                        )}
                      </button>
                    )
                  })}
                  {filterCompanies.length > 0 && (
                    <>
                      <div className="my-1 border-t border-white/10" role="separator" />
                      <button
                        role="menuitem"
                        onClick={onClearCompanies}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.08] focus-visible:outline-none"
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
      <div className="flex flex-wrap gap-2 pt-1">
        {EXERCISE_TYPES.map((type) => {
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
