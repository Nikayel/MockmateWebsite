import type { BugFixScenario } from "../../types"

const starter = `const { createSearchState } = require("./state")

async function handleSearch(query, searchApi, state = createSearchState()) {
  state.latestQuery = query
  state.loading = true

  const results = await searchApi(query)

  state.loading = false
  state.visibleQuery = query
  state.results = results
  return state
}

module.exports = { handleSearch }
`

const reference = `const { createSearchState } = require("./state")

async function handleSearch(query, searchApi, state = createSearchState()) {
  state.latestQuery = query
  state.loading = true
  const requestQuery = query

  const results = await searchApi(query)

  if (state.latestQuery !== requestQuery) {
    return state
  }

  state.loading = false
  state.visibleQuery = query
  state.results = results
  return state
}

module.exports = { handleSearch }
`

export const bugfixSearchRaceScenario: BugFixScenario = {
  id: "bugfix-search-race",
  title: "Search Results Race Condition",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Airbnb", "Meta", "LinkedIn", "Startup"],
  description: "Fix stale async search responses overwriting newer UI results",
  tags: ["async", "frontend", "race-condition", "state-management", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `A customer-support dashboard shows stale search results when users type quickly. The app sends one request per query. If an older request resolves after a newer one, the old results can overwrite the UI.

Read the codebase files, run the tests, and fix the smallest production-safe bug in the search controller. Preserve the public API because other dashboard components call it directly.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/state.js",
        content: `function createSearchState() {
  return {
    latestQuery: "",
    visibleQuery: "",
    results: [],
    loading: false,
  }
}

module.exports = { createSearchState }
`,
        description: "Mutable UI state used by the dashboard search widget",
      },
      {
        fileName: "tests/search-controller.test.js",
        content: `Visible behavior:
- A single search updates visibleQuery and results.
- When "a" resolves after "ab", the UI must keep the "ab" results.`,
        description: "Visible regression tests for rapid typing behavior",
      },
    ],
  },
  expectedBehavior:
    "Only the latest in-flight search response may update visible results and loading state.",
  bugDescription:
    "handleSearch always applies the response it receives, even if a newer query has already become the active request.",
  hints: [
    "The state object already records the latest query.",
    "Capture the request identity before awaiting the API.",
    "A stale response should not clear loading or overwrite visible results.",
  ],
  testCases: [
    {
      input: { query: "ab" },
      expected: "latest result wins",
      description: "Workspace tests cover stale response ordering",
    },
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/search-controller.js",
    editableFilePaths: ["src/search-controller.js"],
    visibleTestPaths: ["tests/search-controller.test.js"],
    hiddenTestPaths: ["tests/search-controller.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Search Dashboard

The search widget reuses one state object while users type. Controllers must prevent stale network responses from overwriting newer search results.`,
        description: "Product and architecture notes",
      },
      {
        path: "src/state.js",
        role: "readonly",
        language: "javascript",
        content: `function createSearchState() {
  return {
    latestQuery: "",
    visibleQuery: "",
    results: [],
    loading: false,
  }
}

module.exports = { createSearchState }
`,
        description: "Mutable UI state factory",
      },
      {
        path: "src/search-controller.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Controller that owns async search state transitions",
      },
      {
        path: "tests/search-controller.test.js",
        role: "test",
        language: "javascript",
        content: `const assert = require("node:assert/strict")
const { handleSearch } = require("../src/search-controller")
const { createSearchState } = require("../src/state")

async function runTests(record) {
  await record("single search updates the state", async () => {
    const state = createSearchState()
    await handleSearch("refund", async () => ["refund policy"], state)
    assert.equal(state.visibleQuery, "refund")
    assert.deepEqual(state.results, ["refund policy"])
    assert.equal(state.loading, false)
  })

  await record("older response cannot overwrite newer query", async () => {
    const state = createSearchState()
    const pending = {}
    const api = (query) => new Promise((resolve) => {
      pending[query] = resolve
    })

    const first = handleSearch("r", api, state)
    const second = handleSearch("re", api, state)

    pending.re(["new"])
    await second
    pending.r(["old"])
    await first

    assert.equal(state.latestQuery, "re")
    assert.equal(state.visibleQuery, "re")
    assert.deepEqual(state.results, ["new"])
  })
}

module.exports = { runTests }
`,
        description: "Visible tests for the user-facing failure mode",
      },
      {
        path: "tests/search-controller.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const assert = require("node:assert/strict")
const { handleSearch } = require("../src/search-controller")
const { createSearchState } = require("../src/state")

async function runTests(record) {
  await record("stale response does not clear loading for active request", async () => {
    const state = createSearchState()
    const pending = {}
    const api = (query) => new Promise((resolve) => {
      pending[query] = resolve
    })

    const first = handleSearch("a", api, state)
    handleSearch("abc", api, state)
    pending.a(["stale"])
    await first

    assert.equal(state.latestQuery, "abc")
    assert.equal(state.visibleQuery, "")
    assert.deepEqual(state.results, [])
    assert.equal(state.loading, true)
  })
}

module.exports = { runTests }
`,
        description: "Hidden loading-state regression test",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const suites = [
  ["visible search controller", require("./search-controller.test")],
  ["hidden search controller", require("./search-controller.hidden.test")],
]

const results = []

async function record(suite, name, fn) {
  try {
    await fn()
    results.push({ suite, name, passed: true, error: null })
  } catch (error) {
    results.push({ suite, name, passed: false, error: error && error.message ? error.message : String(error) })
  }
}

;(async () => {
  for (const [suite, mod] of suites) {
    await mod.runTests((name, fn) => record(suite, name, fn))
  }
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})().catch((error) => {
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})
`,
        description: "Hidden workspace test runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/search-controller.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}
