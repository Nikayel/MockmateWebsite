/**
 * Interview scenarios for CodeSparring
 * Shared between website and extension
 *
 * This file serves as the main entry point for all scenarios.
 * Scenarios are organized into modular files for better organization
 * and performance (code splitting).
 */

// External scenario imports (real-world scenarios from separate files)
import { realWorldSystemDesignScenarios } from "./scenarios-realworld"
// The complete public bugfix bank (locked legacy-10 bank + stdout-oracle packs) as one shared
// composition, so the scenario browser and the lazy loader never disagree on what it contains.
import { bugfixScenarios } from "./scenarios/real-world/bugfix/all"
import { addFunctionalityScenarios } from "./scenarios/add-functionality"
import { DSAPattern, DSA_PATTERNS } from "./types/dsa-patterns"

// Import modular DSA scenarios
import { arraysHashingScenarios } from "./scenarios/dsa/arrays-hashing"
import { twoPointersScenarios } from "./scenarios/dsa/two-pointers"
import { stackScenarios } from "./scenarios/dsa/stack"
import { slidingWindowScenarios } from "./scenarios/dsa/sliding-window"
import { linkedListScenarios } from "./scenarios/dsa/linked-list"
import { treesScenarios } from "./scenarios/dsa/trees"
import { graphsScenarios } from "./scenarios/dsa/graphs"
import { dpScenarios } from "./scenarios/dsa/dynamic-programming"
import { heapScenarios } from "./scenarios/dsa/heap"
import { binarySearchScenarios } from "./scenarios/dsa/binary-search"
import { backtrackingScenarios } from "./scenarios/dsa/backtracking"
import { intervalsScenarios } from "./scenarios/dsa/intervals"
import { mathGeometryScenarios } from "./scenarios/dsa/math-geometry"
import { binarySearchTreeScenarios } from "./scenarios/dsa/binary-search-tree"
import { triesScenarios } from "./scenarios/dsa/tries"
import { bitManipulationScenarios } from "./scenarios/dsa/bit-manipulation"
import { greedyScenarios } from "./scenarios/dsa/greedy"

// Import modular system-design scenarios
import { systemDesignScenarios } from "./scenarios/system-design"

// ============================================================================
// Type Definitions - Re-exported from canonical source
// ============================================================================

// Re-export all types from the canonical types file to avoid duplication
export type {
  ScenarioType,
  DifficultyLevel,
  Company,
  RoleTag,
  BaseScenario,
  DSAScenario,
  BugFixScenario,
  SystemDesignScenario,
  AddFunctionalityScenario,
  Scenario,
} from "./scenarios/types"

// Import types for use in this file
import type { Scenario, ScenarioType, DifficultyLevel, Company } from "./scenarios/types"

// ============================================================================
// Combined Scenarios Array
// ============================================================================

export const scenarios: Scenario[] = [
  // DSA Scenarios - organized by pattern
  ...arraysHashingScenarios,
  ...twoPointersScenarios,
  ...stackScenarios,
  ...slidingWindowScenarios,
  ...linkedListScenarios,
  ...treesScenarios,
  ...graphsScenarios,
  ...dpScenarios,
  ...heapScenarios,
  ...binarySearchScenarios,
  ...backtrackingScenarios,
  ...intervalsScenarios,
  ...mathGeometryScenarios,
  ...binarySearchTreeScenarios,
  ...triesScenarios,
  ...bitManipulationScenarios,
  ...greedyScenarios,

  // System Design Scenarios
  ...systemDesignScenarios,

  // Real-world scenarios from separate files
  ...bugfixScenarios,
  ...realWorldSystemDesignScenarios,

  // Add functionality scenarios - real-world feature implementation
  ...addFunctionalityScenarios,
]

// ============================================================================
// Utility Functions
// ============================================================================

export function filterScenarios(filters: {
  type?: ScenarioType[]
  difficulty?: DifficultyLevel[]
  companies?: Company[]
  searchQuery?: string
}): Scenario[] {
  return scenarios.filter((scenario) => {
    if (filters.type && filters.type.length > 0 && !filters.type.includes(scenario.type)) {
      return false
    }
    if (
      filters.difficulty &&
      filters.difficulty.length > 0 &&
      !filters.difficulty.includes(scenario.difficulty)
    ) {
      return false
    }
    if (filters.companies && filters.companies.length > 0) {
      const hasMatchingCompany = filters.companies.some((company) =>
        scenario.companies.includes(company)
      )
      if (!hasMatchingCompany) return false
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const matchesTitle = scenario.title.toLowerCase().includes(query)
      const matchesDescription = scenario.description.toLowerCase().includes(query)
      const matchesTags = scenario.tags.some((tag) => tag.toLowerCase().includes(query))
      if (!matchesTitle && !matchesDescription && !matchesTags) return false
    }
    return true
  })
}

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id)
}

// Re-export DSA patterns for convenience
export type { DSAPattern }
export { DSA_PATTERNS }
