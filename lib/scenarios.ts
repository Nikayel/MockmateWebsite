/**
 * Interview scenarios for MockMate
 * Shared between website and extension
 *
 * This file serves as the main entry point for all scenarios.
 * Scenarios are organized into modular files for better organization
 * and performance (code splitting).
 */

// External scenario imports (real-world scenarios from separate files)
import { realWorldBugFixScenarios, realWorldSystemDesignScenarios } from "./scenarios-realworld"
import { addFunctionalityScenarios, AddFunctionalityScenario } from "./scenarios-add-functionality"
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

// Import modular bugfix and system-design scenarios
import { bugFixScenarios } from "./scenarios/bugfix"
import { systemDesignScenarios } from "./scenarios/system-design"

// ============================================================================
// Type Definitions
// ============================================================================

export type ScenarioType =
  | "dsa"
  | "bugfix"
  | "optimization"
  | "security"
  | "system-design"
  | "add-functionality"
export type DifficultyLevel = "easy" | "medium" | "hard"
export type Company =
  | "Google"
  | "Meta"
  | "Amazon"
  | "Netflix"
  | "Apple"
  | "Microsoft"
  | "Startup"
  | "Generic"
  | "Airbnb"
  | "Shopify"
  | "Walmart"
  | "Stripe"
  | "Slack"
  | "Notion"
  | "Figma"
  | "Discord"
  | "LinkedIn"
  | "Bloomberg"
  | "Cloudflare"
  | "Algolia"
  | "Elasticsearch"
  | "Twitter"
  | "Uber"
  | "Lyft"
  | "DoorDash"
  | "Instacart"
  | "eBay"
  | "Alibaba"
  | "Dropbox"
  | "Box"

export interface BaseScenario {
  id: string
  title: string
  type: ScenarioType
  difficulty: DifficultyLevel
  companies: Company[]
  description: string
  tags: string[]
  estimatedTime: number // in minutes
}

export interface DSAScenario extends BaseScenario {
  type: "dsa"
  // Pattern category (like LeetCode/NeetCode)
  pattern: DSAPattern
  problemStatement: string
  examples: {
    input: string
    output: string
    explanation?: string
  }[]
  constraints: string[]
  hints: string[]
  starterCode: {
    [language: string]: string
  }
  optimalComplexity: {
    time: string
    space: string
  }
  testCases: {
    input: any
    expected: any
    description: string
  }[]
}

export interface BugFixScenario extends BaseScenario {
  type: "bugfix"
  problemStatement: string
  buggyCode: {
    [language: string]: string
  }
  // Multi-file codebase for realistic scenarios
  codebaseFiles: {
    [language: string]: {
      fileName: string
      content: string
      description: string
    }[]
  }
  expectedBehavior: string
  bugDescription: string
  hints: string[]
  testCases: {
    input: any
    expected: any
    description: string
  }[]
}

export interface SystemDesignScenario extends BaseScenario {
  type: "system-design"
  problemStatement: string
  functionalRequirements: string[]
  nonFunctionalRequirements: string[]
  constraints: string[]
  keyComponents: string[]
  hints: string[]
  evaluationCriteria: {
    category: string
    description: string
    weight: number // percentage
  }[]
  exampleSolution: {
    overview: string
    architecture: string[]
    dataModel: string[]
    apiDesign: string[]
    scalability: string[]
    tradeoffs: string[]
  }
  discussionPoints: string[]
}

export type Scenario =
  | DSAScenario
  | BugFixScenario
  | SystemDesignScenario
  | AddFunctionalityScenario

// Re-export AddFunctionalityScenario for convenience
export type { AddFunctionalityScenario } from "./scenarios-add-functionality"

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

  // Bug Fix Scenarios
  ...bugFixScenarios,

  // System Design Scenarios
  ...systemDesignScenarios,

  // Real-world scenarios from separate files
  ...realWorldBugFixScenarios,
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
