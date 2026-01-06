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
  onClearFilters
}: ScenarioSearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search problems..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
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
            className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
})
