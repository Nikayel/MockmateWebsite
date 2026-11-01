import type { SealedLegacyScenario } from "../legacy-registry.server"
import { rateLimiterErrorHandlingAssessment } from "./rate-limiter-error-handling-assessment.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `from window_store import StoreUnavailableError


def allow_request(store, client_id, now, limit, window_ms):
    key = "rl:" + client_id
    try:
        store.remove_before(key, now - window_ms)
        if store.count(key) >= limit:
            return False
        store.add(key, now)
        return True
    except StoreUnavailableError:
        return False


def simulate_burst(store, client_id, count, now, limit, window_ms):
    allowed = 0
    for _ in range(count):
        if allow_request(store, client_id, now, limit, window_ms):
            allowed += 1
    return allowed
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-rate-limiter-error-handling-python",
  ...rateLimiterErrorHandlingAssessment,
  referenceFiles: [
    { path: "src/rate_limiter.py", role: "editable", language: "python", content: reference },
  ],
}
