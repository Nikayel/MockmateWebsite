/**
 * Scenarios Module - Lazy Loading Architecture
 *
 * This module provides lazy loading of interview scenarios to improve
 * initial page load performance. Instead of loading all 17K+ lines at startup,
 * scenarios are loaded on-demand by type or pattern.
 *
 * BACKWARD COMPATIBILITY:
 * For existing code that uses the legacy scenarios.ts:
 *   import { scenarios, getScenarioById, filterScenarios } from '@/lib/scenarios'
 *
 * For new code with lazy loading (recommended):
 *   import { getScenarioByIdAsync, getScenariosByPattern } from '@/lib/scenarios/index'
 *
 * Migration Path:
 * 1. Keep using legacy imports for now - they continue to work
 * 2. Gradually migrate to async APIs for better performance
 * 3. Scenarios will be split into pattern-based modules incrementally
 */

import type {
  Scenario,
  DSAScenario,
  BugFixScenario,
  SystemDesignScenario,
  ScenarioMeta,
  ScenarioType,
  DifficultyLevel,
  Company,
} from "./types"
import { DSAPattern } from "../types/dsa-patterns"

// Re-export types for convenience
export type { Scenario, DSAScenario, BugFixScenario, SystemDesignScenario, ScenarioMeta }
export type { ScenarioType, DifficultyLevel, Company }

// Re-export from legacy for backward compatibility
// This allows: import { scenarios } from '@/lib/scenarios/index'
export { scenarios, getScenarioById as getScenarioByIdSync, filterScenarios } from "../scenarios"

// Scenario metadata registry (lightweight, loaded immediately)
// This allows UI to display scenario lists without loading full content
const scenarioRegistry: Map<string, ScenarioMeta> = new Map()

// Cache for loaded scenario modules
const loadedModules: Map<string, Scenario[]> = new Map()

/**
 * Register scenario metadata for quick lookups
 */
export function registerScenarioMeta(meta: ScenarioMeta): void {
  scenarioRegistry.set(meta.id, meta)
}

/**
 * Get all scenario metadata (for listing pages)
 */
export function getAllScenarioMeta(): ScenarioMeta[] {
  return Array.from(scenarioRegistry.values())
}

/**
 * Get scenario metadata by ID
 */
export function getScenarioMeta(id: string): ScenarioMeta | undefined {
  return scenarioRegistry.get(id)
}

/**
 * Get scenario metadata filtered by type
 */
export function getScenarioMetaByType(type: ScenarioType): ScenarioMeta[] {
  return Array.from(scenarioRegistry.values()).filter((meta) => meta.type === type)
}

/**
 * Get scenario metadata filtered by difficulty
 */
export function getScenarioMetaByDifficulty(difficulty: DifficultyLevel): ScenarioMeta[] {
  return Array.from(scenarioRegistry.values()).filter((meta) => meta.difficulty === difficulty)
}

/**
 * Get scenario metadata filtered by pattern (DSA only)
 */
export function getScenarioMetaByPattern(pattern: DSAPattern): ScenarioMeta[] {
  return Array.from(scenarioRegistry.values()).filter(
    (meta) => meta.type === "dsa" && meta.pattern === pattern
  )
}

/**
 * Lazy load DSA scenarios by pattern
 */
async function loadDSAByPattern(pattern: DSAPattern): Promise<DSAScenario[]> {
  const cacheKey = `dsa:${pattern}`
  if (loadedModules.has(cacheKey)) {
    return loadedModules.get(cacheKey) as DSAScenario[]
  }

  let scenarios: DSAScenario[] = []

  switch (pattern) {
    case "arrays-hashing":
      const arraysModule = await import("./dsa/arrays-hashing")
      scenarios = arraysModule.arraysHashingScenarios
      break
    case "stack":
      const stackModule = await import("./dsa/stack")
      scenarios = stackModule.stackScenarios
      break
    case "two-pointers":
      const twoPointersModule = await import("./dsa/two-pointers")
      scenarios = twoPointersModule.twoPointersScenarios
      break
    case "sliding-window":
      const slidingModule = await import("./dsa/sliding-window")
      scenarios = slidingModule.slidingWindowScenarios
      break
    case "linked-list":
      const linkedListModule = await import("./dsa/linked-list")
      scenarios = linkedListModule.linkedListScenarios
      break
    case "trees":
      const treesModule = await import("./dsa/trees")
      scenarios = treesModule.treesScenarios
      break
    case "graphs":
      const graphsModule = await import("./dsa/graphs")
      scenarios = graphsModule.graphsScenarios
      break
    case "dp-1d":
    case "dp-2d":
    case "dp-knapsack":
    case "dp-lcs":
    case "dp-tree":
      const dpModule = await import("./dsa/dynamic-programming")
      scenarios = dpModule.dpScenarios.filter((s) => s.pattern === pattern)
      break
    case "heap":
    case "heap-priority-queue":
    case "priority-queue":
      const heapModule = await import("./dsa/heap")
      scenarios = heapModule.heapScenarios
      break
    case "intervals":
      const intervalsModule = await import("./dsa/intervals")
      scenarios = intervalsModule.intervalsScenarios
      break
    case "binary-search":
      const bsModule = await import("./dsa/binary-search")
      scenarios = bsModule.binarySearchScenarios
      break
    case "backtracking":
      const btModule = await import("./dsa/backtracking")
      scenarios = btModule.backtrackingScenarios
      break
    case "greedy":
      const greedyModule = await import("./dsa/greedy")
      scenarios = greedyModule.greedyScenarios
      break
    case "bit-manipulation":
      const bitModule = await import("./dsa/bit-manipulation")
      scenarios = bitModule.bitManipulationScenarios
      break
    case "math-geometry":
      const mathModule = await import("./dsa/math-geometry")
      scenarios = mathModule.mathGeometryScenarios
      break
    case "trie":
      const triesModule = await import("./dsa/tries")
      scenarios = triesModule.triesScenarios
      break
    case "binary-search-tree":
      const bstModule = await import("./dsa/binary-search-tree")
      scenarios = bstModule.binarySearchTreeScenarios
      break
    default:
      // For any other patterns, try to load from misc
      const miscModule = await import("./dsa/misc")
      scenarios = miscModule.miscScenarios.filter((s) => s.pattern === pattern)
  }

  loadedModules.set(cacheKey, scenarios)
  return scenarios
}

/**
 * Lazy load BugFix scenarios
 */
async function loadBugFixScenarios(): Promise<BugFixScenario[]> {
  if (loadedModules.has("bugfix")) {
    return loadedModules.get("bugfix") as BugFixScenario[]
  }

  const bugfixModule = await import("./bugfix")
  const scenarios = bugfixModule.bugFixScenarios
  loadedModules.set("bugfix", scenarios)
  return scenarios
}

/**
 * Lazy load SystemDesign scenarios
 */
async function loadSystemDesignScenarios(): Promise<SystemDesignScenario[]> {
  if (loadedModules.has("system-design")) {
    return loadedModules.get("system-design") as SystemDesignScenario[]
  }

  const systemDesignModule = await import("./system-design")
  const scenarios = systemDesignModule.systemDesignScenarios
  loadedModules.set("system-design", scenarios)
  return scenarios
}

/**
 * Get a scenario by ID (lazy loads appropriate module)
 */
export async function getScenarioById(id: string): Promise<Scenario | undefined> {
  const meta = scenarioRegistry.get(id)
  if (!meta) return undefined

  let scenarios: Scenario[] = []

  switch (meta.type) {
    case "dsa":
      if (meta.pattern) {
        scenarios = await loadDSAByPattern(meta.pattern)
      }
      break
    case "bugfix":
      scenarios = await loadBugFixScenarios()
      break
    case "system-design":
      scenarios = await loadSystemDesignScenarios()
      break
    default:
      // Try loading from legacy module for add-functionality
      const legacy = await import("../scenarios-add-functionality")
      scenarios = legacy.addFunctionalityScenarios as unknown as Scenario[]
  }

  return scenarios.find((s) => s.id === id)
}

/**
 * Get all scenarios of a type (lazy loads all relevant modules)
 */
export async function getScenariosByType(type: ScenarioType): Promise<Scenario[]> {
  switch (type) {
    case "dsa":
      // Load all DSA patterns
      const patterns: DSAPattern[] = [
        "arrays-hashing",
        "stack",
        "two-pointers",
        "sliding-window",
        "linked-list",
        "trees",
        "graphs",
        "dp-1d",
        "dp-2d",
        "dp-knapsack",
        "dp-lcs",
        "heap",
        "intervals",
        "binary-search",
        "backtracking",
        "greedy",
        "trie",
        "bit-manipulation",
        "math-geometry",
        "binary-search-tree",
      ]
      const dsaResults = await Promise.all(patterns.map(loadDSAByPattern))
      return dsaResults.flat()

    case "bugfix":
      return loadBugFixScenarios()

    case "system-design":
      return loadSystemDesignScenarios()

    case "add-functionality":
      const legacy = await import("../scenarios-add-functionality")
      return legacy.addFunctionalityScenarios as unknown as Scenario[]

    default:
      return []
  }
}

/**
 * Get scenarios by pattern (DSA only, lazy loads that pattern's module)
 */
export async function getScenariosByPattern(pattern: DSAPattern): Promise<DSAScenario[]> {
  return loadDSAByPattern(pattern)
}

/**
 * Get random scenario by criteria
 */
export async function getRandomScenario(criteria?: {
  type?: ScenarioType
  difficulty?: DifficultyLevel
  pattern?: DSAPattern
  companies?: Company[]
}): Promise<Scenario | undefined> {
  let candidates = getAllScenarioMeta()

  if (criteria?.type) {
    candidates = candidates.filter((m) => m.type === criteria.type)
  }
  if (criteria?.difficulty) {
    candidates = candidates.filter((m) => m.difficulty === criteria.difficulty)
  }
  if (criteria?.pattern) {
    candidates = candidates.filter((m) => m.pattern === criteria.pattern)
  }
  if (criteria?.companies?.length) {
    candidates = candidates.filter((m) => m.companies.some((c) => criteria.companies!.includes(c)))
  }

  if (candidates.length === 0) return undefined

  const randomMeta = candidates[Math.floor(Math.random() * candidates.length)]
  return getScenarioById(randomMeta.id)
}

/**
 * Initialize scenario registry from metadata
 * Call this once at app startup
 */
export async function initializeScenarioRegistry(): Promise<void> {
  // Load metadata from the metadata file (lightweight)
  const { scenarioMetadata } = await import("./metadata")
  scenarioMetadata.forEach((meta) => registerScenarioMeta(meta))
}

/**
 * Legacy compatibility: Get all scenarios synchronously
 * WARNING: This loads ALL scenarios into memory. Use lazy loading APIs instead.
 * @deprecated Use getScenarioById or getScenariosByType for better performance
 */
export async function getAllScenarios(): Promise<Scenario[]> {
  const [dsa, bugfix, systemDesign, addFunc] = await Promise.all([
    getScenariosByType("dsa"),
    getScenariosByType("bugfix"),
    getScenariosByType("system-design"),
    getScenariosByType("add-functionality"),
  ])

  return [...dsa, ...bugfix, ...systemDesign, ...addFunc]
}
