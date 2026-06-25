"use client"

import { useState, useEffect, memo } from "react"
import { Search, LayoutGrid, List, Target, Rows3 } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useInterviewStore, type UsageLimit } from "@/lib/stores"
import type { Scenario } from "@/lib/scenarios"
import { useScenarioFilters } from "@/lib/hooks"
import { PatternBrowser } from "./PatternBrowser"
import { DSARoadmap } from "./DSARoadmap"
import { ScenarioCard } from "./ScenarioCard"
import { ScenarioListRow } from "./ScenarioListRow"
import { ScenarioFilters } from "./ScenarioFilters"

interface ScenarioBrowserProps {
  onStartInterview: (scenario: Scenario) => void
  usageLimit: UsageLimit | null
  completedProblems: string[]
  hasGuestBanner?: boolean
}

type ViewMode = "roadmap" | "patterns" | "list"
// Density of the Codebases catalog: rich cards for discovery, compact rows for scanning.
type Density = "cards" | "rows"
const DENSITY_STORAGE_KEY = "mockmate_scenario_density"

export const ScenarioBrowser = memo(function ScenarioBrowser({
  onStartInterview,
  usageLimit,
  completedProblems,
  hasGuestBanner = false,
}: ScenarioBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [density, setDensity] = useState<Density>("cards")

  // Restore the user's preferred density once on mount (client-only).
  useEffect(() => {
    const saved = localStorage.getItem(DENSITY_STORAGE_KEY)
    if (saved === "cards" || saved === "rows") setDensity(saved)
  }, [])

  const updateDensity = (next: Density) => {
    setDensity(next)
    localStorage.setItem(DENSITY_STORAGE_KEY, next)
  }

  const { selectedScenario, setSelectedScenario } = useInterviewStore(
    useShallow((state) => ({
      selectedScenario: state.selectedScenario,
      setSelectedScenario: state.setSelectedScenario,
    }))
  )

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
    <section className={`${topPadding} relative overflow-hidden bg-zinc-950 pb-12`}>
      {/* Ambient background glows for premium visual design */}
      <div className="from-accent/10 pointer-events-none absolute top-0 left-1/4 z-0 h-[500px] w-[500px] rounded-full bg-gradient-to-r to-purple-500/10 opacity-40 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-10 z-0 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-blue-500/10 to-emerald-500/10 opacity-30 blur-[100px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Sleek Minimal Header */}
          <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
                Practice Arena
              </h1>
            </div>

            {/* View Mode Toggle - Apple Pill Style */}
            <div className="inline-flex self-start rounded-full border border-white/[0.06] bg-zinc-900/60 p-1 shadow-inner shadow-black/25 backdrop-blur-md sm:self-auto">
              <button
                onClick={() => setViewMode("roadmap")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  viewMode === "roadmap"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Target className="h-4 w-4" />
                DSA Roadmap
              </button>
              <button
                onClick={() => setViewMode("patterns")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  viewMode === "patterns"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                DSA Patterns
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <List className="h-4 w-4" />
                Codebases
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

              {/* Density toggle: rich cards for discovery, compact rows for scanning */}
              {filteredScenarios.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <div className="inline-flex rounded-lg border border-white/[0.06] bg-zinc-900/60 p-0.5">
                    <button
                      onClick={() => updateDensity("cards")}
                      aria-pressed={density === "cards"}
                      title="Card view"
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        density === "cards"
                          ? "bg-white text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                      onClick={() => updateDensity("rows")}
                      aria-pressed={density === "rows"}
                      title="List view"
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        density === "rows"
                          ? "bg-white text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Rows3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>
                </div>
              )}

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
              ) : density === "rows" ? (
                <div className="flex flex-col gap-1.5">
                  {filteredScenarios.map((scenario) => (
                    <ScenarioListRow
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
