import { rateLimiterErrorHandlingAssessment } from "./rate-limiter-error-handling-assessment.server"
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `const { StoreUnavailableError } = require("./window-store")

function allowRequest(store, clientId, now, limit, windowMs) {
  const key = "rl:" + clientId
  try {
    store.removeBefore(key, now - windowMs)
    if (store.count(key) >= limit) return false
    store.add(key, now)
    return true
  } catch (error) {
    if (error instanceof StoreUnavailableError) return false
    throw error
  }
}

function simulateBurst(store, clientId, count, now, limit, windowMs) {
  let allowed = 0
  for (let i = 0; i < count; i++) {
    if (allowRequest(store, clientId, now, limit, windowMs)) allowed += 1
  }
  return allowed
}

module.exports = { allowRequest, simulateBurst }
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-rate-limiter-error-handling",
  ...rateLimiterErrorHandlingAssessment,
  referenceFiles: [
    { path: "src/rate-limiter.js", role: "editable", language: "javascript", content: reference },
  ],
}
