import type { Scenario } from "./types"

/** Candidate-facing foundations, never a diagnosis or a prescribed solution. */
export const PREREQUISITE_TOPICS = {
  "arrays-lists": {
    label: "Arrays and lists",
    description: "Loop through records, read indexes, and filter a collection.",
  },
  "maps-dictionaries": {
    label: "Maps and dictionaries",
    description: "Store and look up values by key, using a Map, object, or dictionary.",
  },
  sets: {
    label: "Sets",
    description: "Understand membership checks and collections of unique values.",
  },
  "async-await": {
    label: "Promises and async/await",
    description: "Follow asynchronous calls and understand that responses can arrive later.",
  },
  "api-handlers": {
    label: "API handlers",
    description: "Follow request parameters through a service and into a response.",
  },
  "exception-handling": {
    label: "Exception handling",
    description:
      "Follow failures through try/catch or try/except, and distinguish returning from propagating an error.",
  },
  "events-retries": {
    label: "Events and retries",
    description: "Understand event records, repeated deliveries, and arrival order.",
  },
  "time-windows": {
    label: "Timestamps and time windows",
    description: "Compare times, calculate elapsed time, and read interval boundaries.",
  },
  "dates-timezones": {
    label: "Dates and time zones",
    description: "Distinguish a stored timestamp from a local calendar day or month.",
  },
  caching: {
    label: "Caching basics",
    description: "Understand cache keys, stored values, and when a cached result becomes stale.",
  },
  "collection-references": {
    label: "Collections and references",
    description: "Understand the difference between changing a collection and copying it.",
  },
  "parsing-validation": {
    label: "Parsing and validation",
    description: "Read text records, convert values, and recognize missing or invalid input.",
  },
  "sorting-grouping": {
    label: "Sorting and grouping",
    description: "Order records by a field and organize related records into groups.",
  },
  aggregation: {
    label: "Counts and numeric summaries",
    description: "Calculate counts, totals, averages, and maximum values.",
  },
  stacks: {
    label: "Stacks",
    description: "Understand last-in, first-out storage and push, pop, and peek operations.",
  },
  graphs: {
    label: "Trees and graph relationships",
    description: "Understand nodes, links, and following relationships through a hierarchy.",
  },
  "classes-methods": {
    label: "Classes and methods",
    description: "Read an object's attributes and follow calls to its methods.",
  },
  pagination: {
    label: "Pagination basics",
    description: "Understand page sizes and cursors for loading a list in smaller parts.",
  },
} as const

export type PrerequisiteTopicId = keyof typeof PREREQUISITE_TOPICS

/**
 * Explicit review per question, including generated packs. Keep this outside pack output so
 * recompilation cannot erase it. Catalog coverage tests flag missing or retired question IDs.
 */
export const DEBUGGING_PREREQUISITES = {
  "bugfix-search-race": ["arrays-lists", "maps-dictionaries", "async-await", "api-handlers"],
  "bugfix-billing-webhook-idempotency": ["maps-dictionaries", "sets", "events-retries"],
  "bugfix-api-rate-limiter-workspace": ["arrays-lists", "maps-dictionaries", "time-windows"],
  "bugfix-rate-limiter-error-handling": ["exception-handling", "api-handlers", "time-windows"],
  "bugfix-rate-limiter-error-handling-python": [
    "exception-handling",
    "api-handlers",
    "time-windows",
  ],
  "bugfix-comment-thread-merge": ["arrays-lists", "maps-dictionaries", "collection-references"],
  "bugfix-event-aggregation-retries": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "events-retries",
  ],
  "bugfix-feature-pipeline-nan-workspace": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
  ],
  "bugfix-temperature-alert-regression": ["arrays-lists", "stacks", "time-windows"],
  "bugfix-onboarding": ["arrays-lists", "maps-dictionaries"],
  "bugfix-bookclub-reading-streak-workspace": [
    "arrays-lists",
    "maps-dictionaries",
    "api-handlers",
    "dates-timezones",
    "pagination",
    "caching",
  ],
  "bugfix-foundry-usage-rollup": ["arrays-lists", "maps-dictionaries", "sets", "events-retries"],
  "datadog-alert-dedup-order": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "events-retries",
  ],
  "datadog-endpoint-latency-peak": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "aggregation",
  ],
  "datadog-metric-window-rollup": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "time-windows",
    "aggregation",
  ],
  "datadog-monitor-empty-series": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "time-windows",
    "aggregation",
  ],
  "generic-cache-eviction-mutation": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "caching",
    "collection-references",
    "classes-methods",
  ],
  "generic-log-error-rollup": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "aggregation",
  ],
  "generic-session-window-count": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "time-windows",
    "sorting-grouping",
  ],
  "palantir-entity-resolution-merge": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "parsing-validation",
  ],
  "palantir-foundry-usage-rollup": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "parsing-validation",
    "events-retries",
  ],
  "palantir-ontology-link-rollup": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "aggregation",
  ],
  "palantir-pipeline-order-dependence": [
    "arrays-lists",
    "maps-dictionaries",
    "parsing-validation",
    "collection-references",
    "events-retries",
  ],
  "stripe-ledger-double-post": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "parsing-validation",
    "events-retries",
  ],
  "stripe-payout-batch-mutation": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "parsing-validation",
    "collection-references",
  ],
  "stripe-webhook-idempotency": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "parsing-validation",
    "events-retries",
  ],
  "add-feature-support-ticket-search": [
    "arrays-lists",
    "maps-dictionaries",
    "api-handlers",
    "sorting-grouping",
  ],
  "add-feature-digest-scheduler": [
    "arrays-lists",
    "maps-dictionaries",
    "sets",
    "time-windows",
    "events-retries",
  ],
  "palantir-911-dispatch-build": [
    "arrays-lists",
    "maps-dictionaries",
    "sorting-grouping",
    "time-windows",
  ],
  "palantir-ontology-org-build": ["arrays-lists", "classes-methods", "graphs"],
} as const satisfies Record<string, readonly PrerequisiteTopicId[]>

export function getScenarioPrerequisites(scenario: Pick<Scenario, "id" | "type">) {
  if (scenario.type !== "bugfix" && scenario.type !== "add-functionality") return []
  const topics: Readonly<Partial<Record<string, readonly PrerequisiteTopicId[]>>> =
    DEBUGGING_PREREQUISITES
  if (!Object.hasOwn(topics, scenario.id)) return []
  return (topics[scenario.id] ?? []).map((id) => ({ id, ...PREREQUISITE_TOPICS[id] }))
}
