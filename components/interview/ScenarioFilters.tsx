"use client"

import { memo, useState, useRef, useEffect } from "react"
import { Check, X, ChevronDown, Building2 } from "lucide-react"
import { scenarios, type ScenarioType, type DifficultyLevel, type Company } from "@/lib/scenarios"
import { EXERCISE_TYPES } from "./scenario-display"
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

const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "border-emerald-300/25 text-emerald-200" },
  { id: "medium", label: "Medium", color: "border-amber-300/25 text-amber-100" },
  { id: "hard", label: "Hard", color: "border-red-300/25 text-red-100" },
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
  const companyTriggerRef = useRef<HTMLButtonElement>(null)
  const companyMenuRef = useRef<HTMLDivElement>(null)
  const companySearchRef = useRef<HTMLInputElement>(null)

  // Focus the search box when the company menu opens (keyboard users); avoids the
  // autoFocus prop, which jsx-a11y disallows.
  useEffect(() => {
    if (showCompanyDropdown) companySearchRef.current?.focus()
  }, [showCompanyDropdown])

  const visibleTypes = availableTypes
    ? EXERCISE_TYPES.filter((t) => availableTypes.includes(t.id as ScenarioType))
    : EXERCISE_TYPES

  const visibleCompanies = companyQuery
    ? COMPANIES.filter((c) => c.toLowerCase().includes(companyQuery.toLowerCase()))
    : COMPANIES

  const closeCompanyDropdown = (returnFocus = true) => {
    setShowCompanyDropdown(false)
    if (returnFocus) companyTriggerRef.current?.focus()
  }

  // Arrow / Home / End / Escape navigation within the open company menu. Focus
  // starts in the search box (autoFocus); arrows move down into the list.
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
    <div className="mb-6 space-y-4 rounded-2xl border border-border/[0.05] bg-card/[0.02] p-4 shadow-2xl backdrop-blur-2xl">
      {/* Search & Actions Row */}
      <div className="flex flex-col gap-4 border-b border-border/[0.04] pb-4 lg:flex-row lg:items-center lg:justify-between">
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
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                        ? `${diff.id === "easy" ? "border-transparent bg-emerald-500/20 text-emerald-300" : diff.id === "medium" ? "border-transparent bg-amber-500/20 text-amber-200" : "border-transparent bg-red-500/20 text-red-300"} font-semibold`
                        : "border-transparent bg-card/[0.025] text-muted-foreground hover:bg-card/[0.06] hover:text-foreground"
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
                  ? "border-transparent bg-foreground/10 text-foreground"
                  : "border-transparent bg-card/[0.03] text-muted-foreground hover:bg-card/[0.06] hover:text-foreground"
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
                  className="absolute top-full right-0 z-20 mt-2 flex w-[min(15rem,calc(100vw-2rem))] flex-col rounded-2xl border border-border/[0.06] bg-background/90 shadow-2xl backdrop-blur-xl"
                >
                  <div className="border-b border-border/[0.06] p-2">
                    <input
                      ref={companySearchRef}
                      value={companyQuery}
                      onChange={(e) => setCompanyQuery(e.target.value)}
                      placeholder="Search companies"
                      aria-label="Search companies"
                      className="w-full rounded-lg border border-border/[0.06] bg-card/[0.03] px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-none"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {visibleCompanies.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
                    )}
                    {visibleCompanies.map((company) => {
                      const isActive = filterCompanies.includes(company as Company)
                      return (
                        <button
                          key={company}
                          role="menuitemcheckbox"
                          aria-checked={isActive}
                          onClick={() => onToggleCompany(company as Company)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-card/[0.06] focus-visible:bg-card/[0.08] focus-visible:outline-none"
                        >
                          <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                            {company}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {COMPANY_COUNTS[company] ?? 0}
                            </span>
                            {isActive && (
                              <Check className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {filterCompanies.length > 0 && (
                    <>
                      <div className="my-1 border-t border-border" role="separator" />
                      <button
                        role="menuitem"
                        onClick={onClearCompanies}
                        className="w-full px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-card/[0.06] hover:text-foreground focus-visible:bg-card/[0.08] focus-visible:outline-none"
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
                    ? "border-transparent bg-card text-foreground shadow-sm"
                    : "border-transparent bg-card/[0.03] text-muted-foreground hover:bg-card/[0.06] hover:text-foreground"
                } `}
                aria-pressed={isActive}
                title={type.description}
              >
                <Icon className="h-3.5 w-3.5" />
                {type.label}
                <span className={`text-xs ${isActive ? "text-muted-foreground" : "text-muted-foreground"}`}>
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
        <div className="flex flex-wrap items-center gap-2 border-t border-border/[0.06] pt-3">
          <span className="text-xs text-muted-foreground">Active:</span>
          {filterType.map((t) => {
            const type = EXERCISE_TYPES.find((et) => et.id === t)
            if (!type) return null
            const Icon = type.icon
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border-transparent bg-card/[0.05] px-2.5 py-1 text-xs text-muted-foreground"
              >
                <Icon className="h-3 w-3" />
                {type.label}
                <button
                  onClick={() => onRemoveType(t)}
                  aria-label={`Remove ${type.label} filter`}
                  className="rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
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
                    : "bg-red-500/10 text-red-300"
              }`}
            >
              {d}
              <button
                onClick={() => onRemoveDifficulty(d)}
                aria-label={`Remove ${d} difficulty filter`}
                className="rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {filterCompanies.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border-transparent bg-card/[0.05] px-2.5 py-1 text-xs text-muted-foreground"
            >
              {c}
              <button
                onClick={() => onRemoveCompany(c)}
                aria-label={`Remove ${c} filter`}
                className="rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-transparent bg-card/[0.05] px-2.5 py-1 text-xs text-muted-foreground">
              "{searchQuery}"
              <button
                onClick={() => onSearchChange("")}
                aria-label="Clear search filter"
                className="rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
})
