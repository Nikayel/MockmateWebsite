/**
 * Add Functionality Scenarios
 *
 * These scenarios simulate real Meta/Google AI-assisted interviews
 * where candidates must add new features to an existing codebase.
 */

import type { AddFunctionalityScenario } from "../types"
import { autocompleteTrieScenario } from "./add-feature-autocomplete-trie"
import { stateHistoryScenario } from "./add-feature-state-history"
import { eventAggregatorScenario } from "./add-feature-event-aggregator"
import { cacheSystemScenario } from "./add-feature-cache-system"
import { rateLimiterScenario } from "./add-feature-rate-limiter"
import { textSearchScenario } from "./add-feature-text-search"

export type { AddFunctionalityScenario } from "../types"

export const addFunctionalityScenarios: AddFunctionalityScenario[] = [
  autocompleteTrieScenario,
  stateHistoryScenario,
  eventAggregatorScenario,
  cacheSystemScenario,
  rateLimiterScenario,
  textSearchScenario,
]

export default addFunctionalityScenarios
