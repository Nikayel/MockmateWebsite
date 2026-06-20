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
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-zinc-500" />
        <input
          type="text"
          placeholder="Search problems..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-full border border-white/5 bg-white/[0.04] py-2.5 pr-4 pl-10 text-sm text-white transition-all placeholder:text-zinc-500 focus:border-white/20 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/10 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 transform text-zinc-500 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span>{resultsCount} problems</span>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
})
