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

type ViewMode = "roadmap" | "patterns" | "list"

export const ScenarioBrowser = memo(function ScenarioBrowser({
  onStartInterview,
  usageLimit,
  completedProblems,
  hasGuestBanner = false,
}: ScenarioBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("patterns")
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
  const topPadding = hasGuestBanner ? "pt-28" : "pt-20"

  return (
    <section className={`${topPadding} bg-zinc-950 pb-12`}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Compact Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* <h1 className="text-2xl font-semibold text-white md:text-3xl">Practice Problems</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Choose your challenge. Track your progress.
              </p> */}
            </div>

            {/* View Mode Toggle - Pill Style */}
            <div className="inline-flex self-start rounded-full border border-zinc-800 bg-zinc-900 p-1 sm:self-auto">
              <button
                onClick={() => setViewMode("roadmap")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === "roadmap"
                    ? "bg-white text-zinc-900"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Target className="h-4 w-4" />
                Roadmap
              </button>
              <button
                onClick={() => setViewMode("patterns")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === "patterns"
                    ? "bg-white text-zinc-900"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Patterns
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === "list" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
                }`}
              >
                <List className="h-4 w-4" />
                All
              </button>
            </div>
          </div>

          {/* Roadmap View */}
          {viewMode === "roadmap" && (
            <DSARoadmap onStartInterview={onStartInterview} completedProblems={completedProblems} />
          )}

          {/* Pattern View */}
          {viewMode === "patterns" && (
            <PatternBrowser
              onStartInterview={onStartInterview}
              completedProblems={completedProblems}
            />
          )}

          {/* List View */}
          {viewMode === "list" && (
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
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                    <Search className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p className="mb-2 text-zinc-400">No problems match your filters</p>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-zinc-500 transition-colors hover:text-white"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
