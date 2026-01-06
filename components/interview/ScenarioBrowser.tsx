"use client"

import { useState, memo } from "react"
import { Search, LayoutGrid, List, Target } from "lucide-react"
import { useInterviewStore, type UsageLimit } from "@/lib/stores"
import type { Scenario } from "@/lib/scenarios"
import { useScenarioFilters } from "@/lib/hooks"
import { PatternBrowser } from "./PatternBrowser"
import { DSARoadmap } from "./DSARoadmap"
import { ScenarioCard } from "./ScenarioCard"
import { ScenarioFilters } from "./ScenarioFilters"

interface ScenarioBrowserProps {
  onStartInterview: (scenario: Scenario) => void
  usageLimit: UsageLimit | null
  completedProblems: string[]
  hasGuestBanner?: boolean
}

type ViewMode = 'roadmap' | 'patterns' | 'list'

export const ScenarioBrowser = memo(function ScenarioBrowser({ onStartInterview, usageLimit, completedProblems, hasGuestBanner = false }: ScenarioBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('roadmap')
  const { selectedScenario, setSelectedScenario } = useInterviewStore()

  const {
    filterType,
    filterDifficulty,
    filterCompanies,
    searchQuery,
    filteredScenarios,
    hasActiveFilters,
    setSearchQuery,
    clearAllFilters,
    toggleTypeFilter,
    toggleDifficultyFilter,
    toggleCompanyFilter,
    removeTypeFilter,
    removeDifficultyFilter,
    removeCompanyFilter,
    clearCompanyFilters,
  } = useScenarioFilters()

  // Dynamic padding: more when guest banner is shown (header 64px + banner ~40px)
  const topPadding = hasGuestBanner ? 'pt-28' : 'pt-20'

  return (
    <section className={`${topPadding} pb-12 bg-zinc-950`}>
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Compact Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                Practice Problems
              </h1>
              <p className="text-zinc-400 text-sm mt-1">Choose your challenge. Track your progress.</p>
            </div>

            {/* View Mode Toggle - Pill Style */}
            <div className="inline-flex bg-zinc-900 rounded-full p-1 border border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setViewMode('roadmap')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'roadmap'
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Target className="h-4 w-4" />
                Roadmap
              </button>
              <button
                onClick={() => setViewMode('patterns')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'patterns'
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Patterns
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
                All
              </button>
            </div>
          </div>

          {/* Roadmap View */}
          {viewMode === 'roadmap' && (
            <DSARoadmap
              onStartInterview={onStartInterview}
              completedProblems={completedProblems}
            />
          )}

          {/* Pattern View */}
          {viewMode === 'patterns' && (
            <PatternBrowser
              onStartInterview={onStartInterview}
              completedProblems={completedProblems}
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              {/* Unified Filter Bar */}
              <ScenarioFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resultsCount={filteredScenarios.length}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearAllFilters}
                filterType={filterType}
                onToggleType={toggleTypeFilter}
                onRemoveType={removeTypeFilter}
                filterDifficulty={filterDifficulty}
                onToggleDifficulty={toggleDifficultyFilter}
                onRemoveDifficulty={removeDifficultyFilter}
                filterCompanies={filterCompanies}
                onToggleCompany={toggleCompanyFilter}
                onRemoveCompany={removeCompanyFilter}
                onClearCompanies={clearCompanyFilters}
              />

              {/* Scenarios Grid */}
              {filteredScenarios.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 mb-2">No problems match your filters</p>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredScenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      isSelected={selectedScenario?.id === scenario.id}
                      isCompleted={completedProblems.includes(scenario.id)}
                      usageLimit={usageLimit}
                      onSelect={setSelectedScenario}
                      onStart={onStartInterview}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
})
