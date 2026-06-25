"use client"

import { useState, useEffect, memo } from "react"
import { Search, Bug, Cpu, Target, LayoutGrid, List, Rows3 } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useInterviewStore, type UsageLimit } from "@/lib/stores"
import type { Scenario, ScenarioType } from "@/lib/scenarios"
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

type MainTab = "debugging" | "dsa"
type DsaView = "roadmap" | "patterns" | "all"

// Non-DSA "codebase" exercise types surfaced under the Debugging tab.
const DEBUGGING_TYPES: ScenarioType[] = [
  "bugfix",
  "add-functionality",
  "optimization",
  "security",
  "system-design",
]

// Density of a scenario list: rich cards for discovery, compact rows for scanning.
type Density = "cards" | "rows"
const DENSITY_STORAGE_KEY = "mockmate_scenario_density"

export const ScenarioBrowser = memo(function ScenarioBrowser({
  onStartInterview,
  usageLimit,
  completedProblems,
  hasGuestBanner = false,
}: ScenarioBrowserProps) {
  const [mainTab, setMainTab] = useState<MainTab>("debugging")
  const [dsaView, setDsaView] = useState<DsaView>("roadmap")
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

  // Switching the top-level context resets filters so they don't leak across tabs.
  const switchMainTab = (tab: MainTab) => {
    if (tab === mainTab) return
    clearAllFilters()
    setMainTab(tab)
  }

  // Dynamic padding: more when guest banner is shown (header 64px + banner ~40px)
  const topPadding = hasGuestBanner ? "pt-28" : "pt-20"

  const debuggingScenarios = filteredScenarios.filter((s) => s.type !== "dsa")
  const dsaScenarios = filteredScenarios.filter((s) => s.type === "dsa")

  const renderDensityToggle = () => (
    <div className="mb-4 flex justify-end">
      <div className="inline-flex rounded-lg border border-white/[0.06] bg-zinc-900/60 p-0.5">
        <button
          onClick={() => updateDensity("cards")}
          aria-pressed={density === "cards"}
          title="Card view"
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            density === "cards" ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
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
            density === "rows" ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Rows3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">List</span>
        </button>
      </div>
    </div>
  )

  // Renders a scenario list with the density toggle, empty state, and either
  // rich cards or compact rows. Shared by the Debugging tab and DSA "all" view.
  const renderList = (list: Scenario[]) =>
    list.length === 0 ? (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
          <Search className="h-6 w-6 text-zinc-600" />
        </div>
        <p className="mb-2 text-zinc-400">No problems match your filters</p>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-zinc-500 transition-colors hover:text-white"
          >
            Clear all filters
          </button>
        )}
      </div>
    ) : (
      <>
        {renderDensityToggle()}
        {density === "rows" ? (
          <div className="flex flex-col gap-1.5">
            {list.map((scenario) => (
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
            {list.map((scenario) => (
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
    )

  return (
    <section className={`${topPadding} relative overflow-hidden bg-zinc-950 pb-12`}>
      {/* Single subtle page-level accent — no per-section rainbow glows */}
      <div className="from-accent/5 pointer-events-none absolute top-0 left-1/2 z-0 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-b to-transparent opacity-40 blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Practice Arena
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Debug real codebases or drill algorithm patterns.
            </p>
          </div>

          {/* Primary split: Debugging vs DSA */}
          <div
            role="tablist"
            aria-label="Practice category"
            className="mb-6 inline-flex rounded-full border border-white/[0.07] bg-white/[0.02] p-1"
          >
            <button
              role="tab"
              aria-selected={mainTab === "debugging"}
              onClick={() => switchMainTab("debugging")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                mainTab === "debugging"
                  ? "bg-white text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Bug className="h-4 w-4" />
              Debugging
            </button>
            <button
              role="tab"
              aria-selected={mainTab === "dsa"}
              onClick={() => switchMainTab("dsa")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                mainTab === "dsa" ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Cpu className="h-4 w-4" />
              DSA
            </button>
          </div>

          {/* Debugging tab — first-class browse surface for real-codebase work */}
          {mainTab === "debugging" && (
            <>
              <ScenarioFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resultsCount={debuggingScenarios.length}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearAllFilters}
                availableTypes={DEBUGGING_TYPES}
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
              {renderList(debuggingScenarios)}
            </>
          )}

          {/* DSA tab — Roadmap / Patterns / All sub-views */}
          {mainTab === "dsa" && (
            <>
              <div className="mb-6 inline-flex rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
                {(
                  [
                    { id: "roadmap", label: "Roadmap", icon: Target },
                    { id: "patterns", label: "Patterns", icon: LayoutGrid },
                    { id: "all", label: "All problems", icon: List },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setDsaView(id)}
                    aria-pressed={dsaView === id}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      dsaView === id
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {dsaView === "roadmap" && (
                <DSARoadmap
                  onStartInterview={onStartInterview}
                  completedProblems={completedProblems}
                />
              )}
              {dsaView === "patterns" && (
                <PatternBrowser
                  onStartInterview={onStartInterview}
                  completedProblems={completedProblems}
                />
              )}
              {dsaView === "all" && (
                <>
                  <ScenarioFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    resultsCount={dsaScenarios.length}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearAllFilters}
                    availableTypes={[]}
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
                  {renderList(dsaScenarios)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
})
