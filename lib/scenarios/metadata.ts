/**
 * Scenario Metadata Registry
 *
 * Lightweight metadata for all scenarios - used for listing/filtering
 * without loading the full scenario content.
 *
 * This file is auto-generated from the full scenarios data.
 */

import type { ScenarioMeta } from './types'
import { DSAPattern } from '../types/dsa-patterns'

// This will be populated by extracting metadata from the legacy scenarios.ts
// For now, we provide a function to extract from the legacy format
export const scenarioMetadata: ScenarioMeta[] = []

/**
 * Extract metadata from a full scenario object
 */
export function extractMetadata(scenario: any): ScenarioMeta {
  return {
    id: scenario.id,
    title: scenario.title,
    type: scenario.type,
    difficulty: scenario.difficulty,
    companies: scenario.companies,
    description: scenario.description,
    tags: scenario.tags,
    estimatedTime: scenario.estimatedTime,
    pattern: scenario.pattern,
  }
}

/**
 * Build metadata from legacy scenarios array
 */
export function buildMetadataFromLegacy(scenarios: any[]): ScenarioMeta[] {
  return scenarios.map(extractMetadata)
}
