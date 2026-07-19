// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

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

export const sealed: SealedLegacyScenario = {
  id: "bugfix-search-race",
  bugDescription:
    "runReservationSearch applies every response it receives, even after a newer lookup has become the active ref, so a slow response for a superseded booking ref overwrites the reservations shown for the current one and clears its loading state.",
  groundTruth:
    "Root cause: the controller applies whatever the reservation API returns without re-checking that the active ref is still the one it searched. Two overlapping lookups plus the earlier one resolving last leaves the panel showing the superseded booking. Fix: capture the ref at request time and, after awaiting, return early if state.activeRef has moved on. Survival story: the controller is correct for a single lookup and for back-to-back lookups that resolve in order, which is nearly all real usage, so it read fine in review. Red herrings, all reachable and provably innocent: (1) normalizeBookingRef (trim + uppercase) looks like it could merge two distinct bookings, but refs are case-insensitive by contract and it is deterministic, so ' bk-2048 ' and 'BK-2048' are the same reservation; (2) the empty-ref early return looks like it might swallow a real lookup, but it only fires when the agent clears the box, which by contract shows nothing and issues no request; (3) sharing one mutable state object across lookups looks like the culprit but is the intended design and is exercised by the passing single-lookup path.",
  rootCauseRubric: [
    "Identifies that a response is applied without re-checking whether the active ref changed during the await.",
    "Connects the wrong-guest display to a superseded lookup resolving late, not to normalization or shared state.",
    "Rules out normalizeBookingRef and the empty-ref guard with evidence instead of rewriting them.",
    "Names a regression guard such as an overlapping-lookup ordering test.",
  ],
  referenceFiles: [
    {
      path: "src/search-controller.js",
      role: "editable",
      language: "javascript",
      content: reference,
    },
  ],
}
