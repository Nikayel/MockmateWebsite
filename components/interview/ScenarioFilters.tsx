"use client"

import { memo, useState, useRef, useEffect } from "react"
import { Check, X, ChevronDown, Building2 } from "lucide-react"
import { scenarios, type ScenarioType, type DifficultyLevel, type Company } from "@/lib/scenarios"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
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
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
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
    <div className="border-border bg-card mb-6 space-y-4 rounded-2xl border p-4 shadow-xs">
      {/* Search & Actions Row */}
      <div className="border-border flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
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
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Difficulty
            </span>
            <div className="flex gap-1.5">
              {DIFFICULTIES.map((diff) => {
                const isActive = filterDifficulty.includes(diff.id as DifficultyLevel)
                return (
                  <button
                    key={diff.id}
                    onClick={() => onToggleDifficulty(diff.id as DifficultyLevel)}
                    className={`focus-visible:ring-accent/50 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                      isActive
                        ? `border-transparent font-semibold ${difficultyColorClass(diff.id, "badgeOnLight")}`
                        : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
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
              className={`focus-visible:ring-accent/50 flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                filterCompanies.length > 0
                  ? "border-accent/50 bg-accent/10 text-accent-strong"
                  : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
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
                  className="border-border bg-popover text-popover-foreground absolute top-full right-0 z-20 mt-2 flex w-[min(15rem,calc(100vw-2rem))] flex-col rounded-2xl border shadow-lg"
                >
                  <div className="border-border border-b p-2">
                    <input
                      ref={companySearchRef}
                      value={companyQuery}
                      onChange={(e) => setCompanyQuery(e.target.value)}
                      placeholder="Search companies"
                      aria-label="Search companies"
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-accent/50 w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {visibleCompanies.length === 0 && (
                      <p className="text-muted-foreground px-3 py-2 text-sm">No matches</p>
                    )}
                    {visibleCompanies.map((company) => {
                      const isActive = filterCompanies.includes(company as Company)
                      return (
                        <button
                          key={company}
                          role="menuitemcheckbox"
                          aria-checked={isActive}
                          onClick={() => onToggleCompany(company as Company)}
                          className="hover:bg-muted focus-visible:bg-muted flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none"
                        >
                          <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                            {company}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {COMPANY_COUNTS[company] ?? 0}
                            </span>
                            {isActive && (
                              <Check className="text-foreground h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {filterCompanies.length > 0 && (
                    <>
                      <div className="border-border my-1 border-t" role="separator" />
                      <button
                        role="menuitem"
                        onClick={onClearCompanies}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none"
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
                className={`focus-visible:ring-accent/50 flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                  isActive
                    ? "border-accent/50 bg-accent/10 text-accent-strong"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                } `}
                aria-pressed={isActive}
                title={type.description}
              >
                <Icon className="h-3.5 w-3.5" />
                {type.label}
                <span className="text-xs opacity-70">{count}</span>
                {isActive && <Check className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="border-border flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-muted-foreground text-xs">Active:</span>
          {filterType.map((t) => {
            const type = EXERCISE_TYPES.find((et) => et.id === t)
            if (!type) return null
            const Icon = type.icon
            return (
              <span
                key={t}
                className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
              >
                <Icon className="h-3 w-3" />
                {type.label}
                <button
                  onClick={() => onRemoveType(t)}
                  aria-label={`Remove ${type.label} filter`}
                  className="focus-visible:ring-ring rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:outline-none"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )
          })}
          {filterDifficulty.map((d) => (
            <span
              key={d}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs capitalize ${difficultyColorClass(d, "badgeOnLight")}`}
            >
              {d}
              <button
                onClick={() => onRemoveDifficulty(d)}
                aria-label={`Remove ${d} difficulty filter`}
                className="focus-visible:ring-ring rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:outline-none"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {filterCompanies.map((c) => (
            <span
              key={c}
              className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            >
              {c}
              <button
                onClick={() => onRemoveCompany(c)}
                aria-label={`Remove ${c} filter`}
                className="focus-visible:ring-ring rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:outline-none"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {searchQuery && (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
              "{searchQuery}"
              <button
                onClick={() => onSearchChange("")}
                aria-label="Clear search filter"
                className="focus-visible:ring-ring rounded-full hover:opacity-70 focus-visible:ring-1 focus-visible:outline-none"
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
