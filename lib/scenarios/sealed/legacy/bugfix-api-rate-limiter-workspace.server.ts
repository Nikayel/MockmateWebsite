// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `function allowRequest(store, clientId, now, limit, windowMs) {
  const key = "rl:" + clientId
  store.removeBefore(key, now - windowMs)
  if (store.count(key) >= limit) {
    return false
  }
  store.add(key, now)
  return true
}

function simulateBurst(store, clientId, count, now, limit, windowMs) {
  let allowed = 0
  for (let i = 0; i < count; i++) {
    if (allowRequest(store, clientId, now, limit, windowMs)) {
      allowed += 1
    }
  }
  return allowed
}

module.exports = { allowRequest, simulateBurst }
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-api-rate-limiter-workspace",
  bugDescription:
    "simulateBurst decides every request in the burst against the stored usage count and only commits the reservations afterward, so the count it reads never reflects the reservations it is about to grant, and the whole burst is admitted regardless of the limit.",
  groundTruth:
    "Root cause: simulateBurst reads store.count(key) once per request while deciding, but defers all store.add writes to a commit pass afterward, so every decision sees the same pre-burst count and the burst is admitted in full. allowRequest is correct because it reserves as it decides. Fix: reserve capacity as each request is granted (e.g. route the burst through allowRequest, or add inside the decision loop). Survival story: the deferred-commit shape reads like a deliberate batch optimization to avoid one store write per request, so a reviewer approves it without noticing the count never advances during the decision loop. Red herrings, all reachable and provably innocent: (1) removeBefore uses `timestamp >= minTimestamp`, which invites off-by-one suspicion, but the window is defined inclusive of its start, so a timestamp exactly at now - windowMs correctly still counts; (2) expired timestamps sit in the store until removeBefore purges them, which it does at the top of both paths; (3) the store keeps multiple entries at the same timestamp on purpose, since two requests in the same millisecond are two requests.",
  rootCauseRubric: [
    "Identifies that the burst path reads usage while deciding but defers the reservations, so the count never advances.",
    "Connects the over-admission to reservations that are granted but not yet reflected in the count.",
    "Rules out the >= window boundary, expiry, and same-timestamp entries as innocent with evidence.",
    "Names a regression guard such as a burst test seeded with existing in-window usage.",
  ],
  referenceFiles: [
    {
      path: "src/rate-limiter.js",
      role: "editable",
      language: "javascript",
      content: reference,
    },
  ],
}
