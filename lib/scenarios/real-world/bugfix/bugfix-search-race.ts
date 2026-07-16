import type { BugFixScenario } from "../../types"

const starter = `const { createSearchState } = require("./state")
const { normalizeBookingRef } = require("./normalize")

async function runReservationSearch(rawRef, reservationApi, state = createSearchState()) {
  const ref = normalizeBookingRef(rawRef)
  state.activeRef = ref

  if (ref === "") {
    state.loading = false
    state.shownRef = ""
    state.reservations = []
    return state
  }

  state.loading = true
  const reservations = await reservationApi(ref)

  state.loading = false
  state.shownRef = ref
  state.reservations = reservations
  return state
}

module.exports = { runReservationSearch }
`

const reference = `const { createSearchState } = require("./state")
const { normalizeBookingRef } = require("./normalize")

async function runReservationSearch(rawRef, reservationApi, state = createSearchState()) {
  const ref = normalizeBookingRef(rawRef)
  state.activeRef = ref

  if (ref === "") {
    state.loading = false
    state.shownRef = ""
    state.reservations = []
    return state
  }

  state.loading = true
  const requestRef = ref
  const reservations = await reservationApi(ref)

  if (state.activeRef !== requestRef) {
    return state
  }

  state.loading = false
  state.shownRef = ref
  state.reservations = reservations
  return state
}

module.exports = { runReservationSearch }
`

const stateFactory = `function createSearchState() {
  return {
    activeRef: "",
    shownRef: "",
    reservations: [],
    loading: false,
  }
}

module.exports = { createSearchState }
`

const normalizeHelper = `function normalizeBookingRef(rawRef) {
  if (typeof rawRef !== "string") {
    return ""
  }
  return rawRef.trim().toUpperCase()
}

module.exports = { normalizeBookingRef }
`

const visibleTests = `const assert = require("node:assert/strict")
const { runReservationSearch } = require("../src/search-controller")
const { createSearchState } = require("../src/state")

async function runTests(record) {
  await record("a single lookup shows the reservation for that booking ref", async () => {
    const state = createSearchState()
    await runReservationSearch("bk-1024", async (ref) => [{ ref, guest: "Alvarez" }], state)
    assert.equal(state.shownRef, "BK-1024")
    assert.deepEqual(state.reservations, [{ ref: "BK-1024", guest: "Alvarez" }])
    assert.equal(state.loading, false)
  })

  await record("a slow response for an earlier booking ref cannot replace the current one", async () => {
    const state = createSearchState()
    const pending = {}
    const api = (ref) => new Promise((resolve) => {
      pending[ref] = resolve
    })

    const first = runReservationSearch("BK-1024", api, state)
    const second = runReservationSearch("BK-2048", api, state)

    pending["BK-2048"]([{ ref: "BK-2048", guest: "Okafor" }])
    await second
    pending["BK-1024"]([{ ref: "BK-1024", guest: "Alvarez" }])
    await first

    assert.equal(state.activeRef, "BK-2048")
    assert.equal(state.shownRef, "BK-2048")
    assert.deepEqual(state.reservations, [{ ref: "BK-2048", guest: "Okafor" }])
  })
}

module.exports = { runTests }
`

const hiddenTests = `const assert = require("node:assert/strict")
const { runReservationSearch } = require("../src/search-controller")
const { createSearchState } = require("../src/state")

async function runTests(record) {
  await record("a stale response does not clear the spinner for the in-flight lookup", async () => {
    const state = createSearchState()
    const pending = {}
    const api = (ref) => new Promise((resolve) => {
      pending[ref] = resolve
    })

    const first = runReservationSearch("BK-7", api, state)
    runReservationSearch("BK-42", api, state)
    pending["BK-7"]([{ ref: "BK-7", guest: "stale" }])
    await first

    assert.equal(state.activeRef, "BK-42")
    assert.equal(state.shownRef, "")
    assert.deepEqual(state.reservations, [])
    assert.equal(state.loading, true)
  })

  await record("clearing the search box resets the panel without a lookup", async () => {
    const state = createSearchState()
    let calls = 0
    const api = async (ref) => {
      calls += 1
      return [{ ref, guest: "Alvarez" }]
    }

    await runReservationSearch("BK-1024", api, state)
    await runReservationSearch("   ", api, state)

    assert.equal(state.activeRef, "")
    assert.equal(state.shownRef, "")
    assert.deepEqual(state.reservations, [])
    assert.equal(state.loading, false)
    assert.equal(calls, 1)
  })

  await record("the same booking typed with different casing runs against one normalized ref", async () => {
    const state = createSearchState()
    const seen = []
    const api = async (ref) => {
      seen.push(ref)
      return [{ ref, guest: "Okafor" }]
    }

    await runReservationSearch(" bk-2048 ", api, state)
    await runReservationSearch("BK-2048", api, state)

    assert.deepEqual(seen, ["BK-2048", "BK-2048"])
    assert.equal(state.activeRef, "BK-2048")
    assert.equal(state.shownRef, "BK-2048")
    assert.deepEqual(state.reservations, [{ ref: "BK-2048", guest: "Okafor" }])
    assert.equal(state.loading, false)
  })
}

module.exports = { runTests }
`

const runner = `const suites = [
  ["visible reservation search", require("./search-controller.test")],
  ["hidden reservation search", require("./search-controller.hidden.test")],
]

const results = []

async function record(suite, name, fn) {
  try {
    await fn()
    results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes("hidden") })
  } catch (error) {
    results.push({ suite, name, passed: false, error: error && error.message ? error.message : String(error), isHidden: suite.toLowerCase().includes("hidden") })
  }
}

;(async () => {
  for (const [suite, mod] of suites) {
    await mod.runTests((name, fn) => record(suite, name, fn))
  }
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})().catch((error) => {
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message, isHidden: true })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})
`

export const bugfixSearchRaceScenario: BugFixScenario = {
  id: "bugfix-search-race",
  title: "Support Console: Reservation Lookup Shows the Wrong Guest",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Generic"],
  description:
    "A reservation support console sometimes shows the previous caller's booking after an agent searches a new ref, and an agent acted on the wrong reservation before catching it.",
  task: "Ensure the panel ends up showing the reservations for the booking ref the agent searched most recently, even when an earlier lookup's response arrives after it.",
  // Grounded in the scenario's own second visible test: BK-1024 and BK-2048
  // overlap and BK-1024 resolves last. The starter applies each response the
  // moment it lands, so shownRef ends on BK-1024 where the test asserts BK-2048.
  symptom: {
    subject: "shownRef",
    tag: "BK-2048 searched while BK-1024 is in flight",
    expected: "BK-2048",
    actual: "BK-1024",
    caveat:
      "Single lookups, and overlapping lookups that come back in order, show the right guest.",
  },
  userReport:
    "Support agent here. I searched a booking ref while on a call and the console showed me a reservation for a different guest, one I had looked up a moment earlier. I started a refund on it before I noticed the name was wrong. It only seems to happen when I search a second ref before the first result comes back.",
  tags: ["async", "frontend", "state-management", "reservations", "support-tools", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `A reservation support console lets agents pull up a guest's booking by ref while on a call. The panel reuses one state object, and agents often refine or replace a ref while an earlier lookup is still in flight.

**Incident Report**
An agent searched ref BK-2048, but the panel briefly showed BK-1024, a booking they had looked up seconds earlier. They opened a refund on the wrong reservation before noticing the guest name did not match. Most lookups show the right guest; this only surfaces when a second lookup starts before the first response returns.

Read the codebase files, run the tests, and make the smallest production-safe fix in the search controller. Preserve the public API because other console components call it directly.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/state.js",
        content: stateFactory,
        description: "Mutable panel state reused across reservation lookups",
      },
      {
        fileName: "src/normalize.js",
        content: normalizeHelper,
        description: "Booking-ref normalizer (trim + uppercase) shared by the controller",
      },
    ],
  },
  expectedBehavior:
    "The panel must end up showing the reservations for the booking ref the agent most recently searched. A response for a ref that has since been superseded must not change the shown reservations or the loading state.",
  bugDescription:
    "runReservationSearch applies every response it receives, even after a newer lookup has become the active ref, so a slow response for a superseded booking ref overwrites the reservations shown for the current one and clears its loading state.",
  groundTruth:
    "Root cause: the controller applies whatever the reservation API returns without re-checking that the active ref is still the one it searched. Two overlapping lookups plus the earlier one resolving last leaves the panel showing the superseded booking. Fix: capture the ref at request time and, after awaiting, return early if state.activeRef has moved on. Survival story: the controller is correct for a single lookup and for back-to-back lookups that resolve in order, which is nearly all real usage, so it read fine in review. Red herrings, all reachable and provably innocent: (1) normalizeBookingRef (trim + uppercase) looks like it could merge two distinct bookings, but refs are case-insensitive by contract and it is deterministic, so ' bk-2048 ' and 'BK-2048' are the same reservation; (2) the empty-ref early return looks like it might swallow a real lookup, but it only fires when the agent clears the box, which by contract shows nothing and issues no request; (3) sharing one mutable state object across lookups looks like the culprit but is the intended design and is exercised by the passing single-lookup path.",
  hints: [
    "In the failing test two lookups overlap. Line up what the agent searched last against what the panel ends up showing.",
    "Every response is applied the moment it returns. When a slow response finally lands, what does the state still know about the ref the agent actually wants?",
  ],
  testCases: [
    {
      input: { activeRef: "BK-2048", supersededRef: "BK-1024" },
      expected: "current ref wins",
      description:
        "Workspace tests cover overlapping reservation lookups that resolve out of order",
    },
  ],
  expectedTouchedFiles: ["src/search-controller.js"],
  observedSymptoms: [
    "After searching BK-2048, the panel shows the reservation for BK-1024, a ref the agent looked up moments earlier.",
    "It only reproduces when a second lookup starts before the first response returns; single and in-order lookups are fine.",
  ],
  reproductionSteps: [
    "Read README.md for the panel state shape and the lookup contract.",
    "Inspect tests/search-controller.test.js to see the overlapping-lookup case that fails.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "Only the response for the agent's most recently searched ref updates the shown reservations and loading state.",
    "A superseded ref's late response leaves the panel untouched.",
    "Clearing the box shows nothing and issues no lookup, and single or in-order lookups behave exactly as before.",
    "Only src/search-controller.js changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "async ordering",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Identifies that a response is applied without re-checking whether the active ref changed during the await.",
    "Connects the wrong-guest display to a superseded lookup resolving late, not to normalization or shared state.",
    "Rules out normalizeBookingRef and the empty-ref guard with evidence instead of rewriting them.",
    "Names a regression guard such as an overlapping-lookup ordering test.",
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
        content: `# Reservation Support Console

Support agents look up a guest's reservation by booking ref while on a call. The console reuses one state object for the search panel, and agents often refine a ref or clear it and try another while an earlier lookup is still in flight.

## Panel state shape

- activeRef: the ref the agent most recently searched
- shownRef: the ref whose reservations are currently on screen
- reservations: the rows on screen
- loading: whether a lookup is in progress

## Contract

- Booking refs are case-insensitive and may be typed with surrounding spaces. The console trims and uppercases them before searching, so " bk-2048 " and "BK-2048" are the same reservation.
- Clearing the box (an empty or whitespace-only ref) shows no reservations and issues no lookup.
- The panel must always end up showing the reservations for the ref the agent most recently searched.`,
        description: "Product and architecture notes",
      },
      {
        path: "src/state.js",
        role: "readonly",
        language: "javascript",
        content: stateFactory,
        description: "Mutable panel state factory",
      },
      {
        path: "src/normalize.js",
        role: "readonly",
        language: "javascript",
        content: normalizeHelper,
        description: "Booking-ref normalizer shared by the controller",
      },
      {
        path: "src/search-controller.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Controller that owns async reservation-lookup state transitions",
      },
      {
        path: "tests/search-controller.test.js",
        role: "test",
        language: "javascript",
        content: visibleTests,
        description: "Visible tests for the user-facing failure mode",
      },
      {
        path: "tests/search-controller.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: hiddenTests,
        description: "Hidden loading-state and terrain regression tests",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: runner,
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
