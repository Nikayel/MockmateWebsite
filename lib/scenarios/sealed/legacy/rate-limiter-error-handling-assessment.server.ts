import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

export const rateLimiterErrorHandlingAssessment: Omit<
  SealedLegacyScenario,
  "id" | "referenceFiles"
> = {
  bugDescription:
    "The request decision catches every ordinary failure and returns success, turning both quota-store outages and unexpected defects into successful admission without a confirmed reservation.",
  groundTruth:
    "The exception handler is a fail-open fallback: it reports success regardless of which store operation failed. Handle the exported StoreUnavailableError by returning false, and let every unexpected failure propagate unchanged. Leave the healthy quota path and serialized burst loop intact. Do not retry: add may commit before its acknowledgment is lost, and the store has no idempotency mechanism. Do not roll back an uncertain write. Recovery is naturally per request; no sticky outage state is needed. The burst loop, inclusive window boundary, and same-timestamp entries are not the cause. The original fallback can survive review as an availability optimization, but it contradicts this gateway's explicit quota-enforcement policy.",
  rootCauseRubric: [
    "Uses a failing storage case to connect the catch-all success return to admission without a confirmed reservation.",
    "Distinguishes a known dependency outage from an unexpected defect and preserves the original thrown value for caller-owned reporting.",
    "Explains why an uncertain write cannot be retried or rolled back safely under the supplied store contract.",
    "Verifies outage denial, unexpected-error propagation, post-commit acknowledgment loss, and recovery while preserving healthy quotas.",
  ],
  fixTradeoffs:
    "Pinpoint the submitted exception boundary and its actual behavior. A narrow exception boundary is sufficient; returning false for every error hides defects, while returning true sacrifices the required quota guarantee. Fail-closed is this exercise's explicit policy, not a universal rule: it trades availability for quota enforcement. Retries can amplify an outage and double-reserve an uncertain write unless a different, idempotent store contract is designed. Do not reward retries, wrappers, custom error hierarchies, or circuit breakers merely for existing. Exception classification adds constant work and no persistent state; the existing window scan is still O(k) for k retained timestamps, so do not call the entire request O(1). Ground feedback in the candidate's code and words; if they did not explain a trade-off, say it was unverified rather than inventing their reasoning.",
}
