"use client"

import { memo } from "react"
import { Search, X } from "lucide-react"

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
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
      <div className="relative max-w-md flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
        <input
          type="text"
          placeholder="Search problems..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-accent/50 focus:ring-accent/30 w-full rounded-full border py-2.5 pr-4 pl-10 text-sm transition-all focus:ring-1 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transform cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span>{resultsCount} problems</span>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
})
