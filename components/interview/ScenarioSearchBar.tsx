"use client"

import { memo } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScenarioSearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  resultsCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export const ScenarioSearchBar = memo(function ScenarioSearchBar({
  searchQuery,
  onSearchChange,
  resultsCount,
  hasActiveFilters,
  onClearFilters,
}: ScenarioSearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="relative min-w-48 flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search problems"
          placeholder="Search problems..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full appearance-none rounded-lg border pl-10 text-base transition-colors focus-visible:ring-2 focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none",
            searchQuery ? "pr-11" : "pr-3"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-0 right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-x-2 text-sm">
        <span role="status" className="tabular-nums">
          {resultsCount} {resultsCount === 1 ? "problem" : "problems"}
        </span>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
})
