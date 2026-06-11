import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useInterviewStore } from "@/lib/stores"
import {
  filterScenarios,
  scenarios,
  type ScenarioType,
  type DifficultyLevel,
  type Company,
} from "@/lib/scenarios"

const SCENARIO_TYPE_PRIORITY: Record<ScenarioType, number> = {
  bugfix: 0,
  "add-functionality": 1,
  "system-design": 2,
  optimization: 3,
  security: 4,
  dsa: 5,
}

export function useScenarioFilters() {
  const {
    filterType,
    setFilterType,
    filterDifficulty,
    setFilterDifficulty,
    filterCompanies,
    setFilterCompanies,
    searchQuery,
    setSearchQuery,
  } = useInterviewStore(
    useShallow((state) => ({
      filterType: state.filterType,
      setFilterType: state.setFilterType,
      filterDifficulty: state.filterDifficulty,
      setFilterDifficulty: state.setFilterDifficulty,
      filterCompanies: state.filterCompanies,
      setFilterCompanies: state.setFilterCompanies,
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
    }))
  )

  // Memoize filtered scenarios
  const filteredScenarios = useMemo(() => {
    return filterScenarios({
      type: filterType.length > 0 ? filterType : undefined,
      difficulty: filterDifficulty.length > 0 ? filterDifficulty : undefined,
      companies: filterCompanies.length > 0 ? filterCompanies : undefined,
      searchQuery: searchQuery || undefined,
    }).sort((a, b) => {
      const typeDelta = SCENARIO_TYPE_PRIORITY[a.type] - SCENARIO_TYPE_PRIORITY[b.type]
      if (typeDelta !== 0) return typeDelta
      return b.estimatedTime - a.estimatedTime
    })
  }, [filterType, filterDifficulty, filterCompanies, searchQuery])

  const hasActiveFilters = Boolean(
    filterType.length > 0 ||
    filterDifficulty.length > 0 ||
    filterCompanies.length > 0 ||
    searchQuery
  )

  const clearAllFilters = () => {
    setFilterType([])
    setFilterDifficulty([])
    setFilterCompanies([])
    setSearchQuery("")
  }

  const toggleTypeFilter = (type: ScenarioType) => {
    if (filterType.includes(type)) {
      setFilterType(filterType.filter((t) => t !== type))
    } else {
      setFilterType([...filterType, type])
    }
  }

  const toggleDifficultyFilter = (difficulty: DifficultyLevel) => {
    if (filterDifficulty.includes(difficulty)) {
      setFilterDifficulty(filterDifficulty.filter((d) => d !== difficulty))
    } else {
      setFilterDifficulty([...filterDifficulty, difficulty])
    }
  }

  const toggleCompanyFilter = (company: Company) => {
    if (filterCompanies.includes(company)) {
      setFilterCompanies(filterCompanies.filter((c) => c !== company))
    } else {
      setFilterCompanies([...filterCompanies, company])
    }
  }

  const removeTypeFilter = (type: ScenarioType) => {
    setFilterType(filterType.filter((t) => t !== type))
  }

  const removeDifficultyFilter = (difficulty: DifficultyLevel) => {
    setFilterDifficulty(filterDifficulty.filter((d) => d !== difficulty))
  }

  const removeCompanyFilter = (company: Company) => {
    setFilterCompanies(filterCompanies.filter((c) => c !== company))
  }

  return {
    // State
    filterType,
    filterDifficulty,
    filterCompanies,
    searchQuery,
    filteredScenarios,
    hasActiveFilters,
    totalScenarios: scenarios.length,

    // Actions
    setSearchQuery,
    clearAllFilters,
    toggleTypeFilter,
    toggleDifficultyFilter,
    toggleCompanyFilter,
    removeTypeFilter,
    removeDifficultyFilter,
    removeCompanyFilter,
    clearCompanyFilters: () => setFilterCompanies([]),
  }
}
