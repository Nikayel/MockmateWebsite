/**
 * Lazy Scenario Loader
 *
 * Provides lazy-loading for interview scenarios by category.
 * This reduces the initial bundle size by only loading scenarios
 * when they are needed.
 */

import type { Scenario, ScenarioType, DifficultyLevel, Company, DSAScenario } from "./scenarios"
import type { DSAPattern } from "./types/dsa-patterns"

// Cache for loaded scenarios
const scenarioCache: Map<string, Scenario[]> = new Map()
let allScenariosLoaded = false
let allScenarios: Scenario[] = []

// Scenario category loaders - all return Scenario[] for type consistency
const scenarioLoaders: Record<string, () => Promise<Scenario[]>> = {
  // DSA Pattern loaders
  "arrays-hashing": () =>
    import("./scenarios/dsa/arrays-hashing").then((m) => m.arraysHashingScenarios as Scenario[]),
  "two-pointers": () =>
    import("./scenarios/dsa/two-pointers").then((m) => m.twoPointersScenarios as Scenario[]),
  stack: () => import("./scenarios/dsa/stack").then((m) => m.stackScenarios as Scenario[]),
  "sliding-window": () =>
    import("./scenarios/dsa/sliding-window").then((m) => m.slidingWindowScenarios as Scenario[]),
  "linked-list": () =>
    import("./scenarios/dsa/linked-list").then((m) => m.linkedListScenarios as Scenario[]),
  trees: () => import("./scenarios/dsa/trees").then((m) => m.treesScenarios as Scenario[]),
  graphs: () => import("./scenarios/dsa/graphs").then((m) => m.graphsScenarios as Scenario[]),
  "dynamic-programming": () =>
    import("./scenarios/dsa/dynamic-programming").then((m) => m.dpScenarios as Scenario[]),
  heap: () => import("./scenarios/dsa/heap").then((m) => m.heapScenarios as Scenario[]),
  "binary-search": () =>
    import("./scenarios/dsa/binary-search").then((m) => m.binarySearchScenarios as Scenario[]),
  backtracking: () =>
    import("./scenarios/dsa/backtracking").then((m) => m.backtrackingScenarios as Scenario[]),
  intervals: () =>
    import("./scenarios/dsa/intervals").then((m) => m.intervalsScenarios as Scenario[]),
  "math-geometry": () =>
    import("./scenarios/dsa/math-geometry").then((m) => m.mathGeometryScenarios as Scenario[]),
  "binary-search-tree": () =>
    import("./scenarios/dsa/binary-search-tree").then(
      (m) => m.binarySearchTreeScenarios as Scenario[]
    ),

  // Bug fix scenarios
  bugfix: () => import("./scenarios/bugfix").then((m) => m.bugFixScenarios as Scenario[]),

  // System design scenarios
  "system-design": () =>
    import("./scenarios/system-design").then((m) => m.systemDesignScenarios as Scenario[]),

  // Real-world scenarios
  "realworld-bugfix": () =>
    import("./scenarios-realworld").then((m) => m.realWorldBugFixScenarios as Scenario[]),
  "realworld-system-design": () =>
    import("./scenarios-realworld").then((m) => m.realWorldSystemDesignScenarios as Scenario[]),

  // Add functionality scenarios
  "add-functionality": () =>
    import("./scenarios-add-functionality").then((m) => m.addFunctionalityScenarios as Scenario[]),
}

type ScenarioCategory =
  | "arrays-hashing"
  | "two-pointers"
  | "stack"
  | "sliding-window"
  | "linked-list"
  | "trees"
  | "graphs"
  | "dynamic-programming"
  | "heap"
  | "binary-search"
  | "backtracking"
  | "intervals"
  | "math-geometry"
  | "binary-search-tree"
  | "bugfix"
  | "system-design"
  | "realworld-bugfix"
  | "realworld-system-design"
  | "add-functionality"

/**
 * Load scenarios for a specific category
 */
export async function loadScenarioCategory(category: ScenarioCategory): Promise<Scenario[]> {
  // Check cache first
  if (scenarioCache.has(category)) {
    return scenarioCache.get(category)!
  }

  // Load the category
  const loader = scenarioLoaders[category]
  if (!loader) {
    console.warn(`Unknown scenario category: ${category}`)
    return []
  }

  const scenarios = await loader()
  scenarioCache.set(category, scenarios)
  return scenarios
}

/**
 * Load all scenarios (for search/filter functionality)
 * This is still useful when user needs to search across all scenarios
 */
export async function loadAllScenarios(): Promise<Scenario[]> {
  if (allScenariosLoaded) {
    return allScenarios
  }

  // Load all categories in parallel
  const categoryPromises = Object.keys(scenarioLoaders).map(async (category) => {
    return loadScenarioCategory(category as ScenarioCategory)
  })

  const results = await Promise.all(categoryPromises)
  allScenarios = results.flat()
  allScenariosLoaded = true

  return allScenarios
}

/**
 * Load scenarios by type (dsa, bugfix, system-design, add-functionality)
 */
export async function loadScenariosByType(type: ScenarioType): Promise<Scenario[]> {
  const categoryMap: Record<ScenarioType, ScenarioCategory[]> = {
    dsa: [
      "arrays-hashing",
      "two-pointers",
      "stack",
      "sliding-window",
      "linked-list",
      "trees",
      "graphs",
      "dynamic-programming",
      "heap",
      "binary-search",
      "backtracking",
      "intervals",
      "math-geometry",
      "binary-search-tree",
    ],
    bugfix: ["bugfix", "realworld-bugfix"],
    "system-design": ["system-design", "realworld-system-design"],
    "add-functionality": ["add-functionality"],
    optimization: [], // Add categories if needed
    security: [], // Add categories if needed
  }

  const categories = categoryMap[type] || []
  const promises = categories.map((cat) => loadScenarioCategory(cat))
  const results = await Promise.all(promises)
  return results.flat()
}

/**
 * Get a single scenario by ID
 * First checks cache, then loads all if needed
 */
export async function getScenarioByIdLazy(id: string): Promise<Scenario | undefined> {
  // Check cache first
  for (const scenarios of scenarioCache.values()) {
    const found = scenarios.find((s) => s.id === id)
    if (found) return found
  }

  // If not in cache, load all scenarios
  const all = await loadAllScenarios()
  return all.find((s) => s.id === id)
}

/**
 * Filter scenarios with lazy loading
 */
export async function filterScenariosLazy(filters: {
  type?: ScenarioType[]
  difficulty?: DifficultyLevel[]
  companies?: Company[]
  searchQuery?: string
  pattern?: DSAPattern
}): Promise<Scenario[]> {
  // If filtering by type, only load those types
  let scenarios: Scenario[]

  if (filters.type && filters.type.length > 0 && filters.type.length < 3) {
    // Load only the needed types
    const typePromises = filters.type.map((t) => loadScenariosByType(t))
    const results = await Promise.all(typePromises)
    scenarios = results.flat()
  } else {
    // Load all scenarios
    scenarios = await loadAllScenarios()
  }

  // Apply filters
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
    if (filters.pattern && scenario.type === "dsa") {
      if ((scenario as DSAScenario).pattern !== filters.pattern) {
        return false
      }
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

/**
 * Preload common scenario categories for faster access
 * Call this after initial page load
 */
export function preloadCommonScenarios(): void {
  // Preload DSA scenarios in the background (most commonly used)
  setTimeout(() => {
    loadScenarioCategory("arrays-hashing")
    loadScenarioCategory("two-pointers")
    loadScenarioCategory("trees")
  }, 1000)
}

/**
 * Get scenario count by type without loading all data
 * Uses cached data if available
 */
export function getCachedScenarioCount(): number {
  if (allScenariosLoaded) {
    return allScenarios.length
  }

  let count = 0
  for (const scenarios of scenarioCache.values()) {
    count += scenarios.length
  }
  return count
}
