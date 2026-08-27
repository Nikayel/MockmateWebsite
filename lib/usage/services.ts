/**
 * Usage service registry — WHICH product surface spent the money.
 *
 * `usage_events` rows always carried who (userId) and what kind of call
 * (eventType, provider), but not which product surface made it: the five LLM
 * calls behind one feedback request were indistinguishable from each other,
 * and RAG embeddings were indistinguishable from vector-store indexing. This
 * registry is the single vocabulary for that dimension. Every funnel entry
 * point (trackUsageEvent, generateAIResponse, the Edge reporter/ingest, the
 * embedding trackers) REQUIRES a `UsageServiceId`, so a call site that does
 * not declare its service does not compile — `pnpm typecheck` is the
 * enforcement, and lib/usage/__tests__/services-registry.test.ts holds the
 * registry itself to its rules.
 *
 * Rules:
 * - APPEND-ONLY. Never rename or delete a shipped id: historical usage_events
 *   rows and the costByService rollup maps are keyed by these strings.
 * - Kebab-case, NO DOTS. A dotted id used as a map key inside a Firestore
 *   update path ("costByService.interview.chat") splits into nested fields
 *   and corrupts the rollup shape.
 * - This module must stay client-safe (no firebase imports, type-only
 *   imports elsewhere): pricing/marketing pages and Edge routes read it.
 */

import type { UsageEventType } from "../usage-tracking"

export const USAGE_SERVICES = [
  { id: "interview-chat", label: "Interviewer chat" },
  { id: "interview-extraction", label: "Conversation extraction" },
  { id: "interview-hints", label: "Hints & diagnosis" },
  { id: "complexity-analysis", label: "Complexity analysis" },
  { id: "feedback-generation", label: "Feedback generation" },
  { id: "feedback-validation", label: "Feedback validation" },
  { id: "feedback-extraction", label: "Feedback evidence extraction" },
  { id: "feedback-transcript-analysis", label: "Transcript analysis" },
  { id: "feedback-constitutional", label: "Constitutional review" },
  { id: "feedback-clarifying-questions", label: "Clarifying-questions check" },
  { id: "bugfix-scoring", label: "Bugfix semantic scoring" },
  { id: "labs-chat", label: "Case-lab chat" },
  { id: "labs-feedback", label: "Case-lab feedback" },
  { id: "sprint-labs-chat", label: "Sprint Labs partner chat" },
  { id: "sprint-labs-grading", label: "Sprint Labs grading" },
  { id: "sprint-labs-validate", label: "Sprint Labs contamination gate" },
  { id: "voice-transcription", label: "Voice transcription" },
  { id: "rag-indexing", label: "RAG indexing embeddings" },
  { id: "rag-query-embeddings", label: "RAG query embeddings" },
  { id: "session-telemetry", label: "Session telemetry (no cost)" },
] as const

export type UsageServiceId = (typeof USAGE_SERVICES)[number]["id"]

export const USAGE_SERVICE_IDS: readonly UsageServiceId[] = USAGE_SERVICES.map((s) => s.id)

const USAGE_SERVICE_ID_SET: ReadonlySet<string> = new Set(USAGE_SERVICE_IDS)

export function isUsageServiceId(value: unknown): value is UsageServiceId {
  return typeof value === "string" && USAGE_SERVICE_ID_SET.has(value)
}

export function usageServiceLabel(id: string): string {
  return USAGE_SERVICES.find((s) => s.id === id)?.label ?? id
}

/**
 * Attribution for spend that no signed-in user caused: cron/system extraction,
 * anonymous retrieval embeddings, guest traffic. Recording it under a reserved
 * user keeps every dollar in usage_events (the anomaly sweep and the admin
 * dashboards scan nothing else) instead of only in the global kill-switch
 * counter. Nothing enforces a budget against this id, deliberately.
 */
export const SYSTEM_USER_ID = "system"

/**
 * Read-side bucket for legacy rows that predate the service field and match
 * no mapping. Not a registered service: nothing may WRITE it.
 */
export const UNATTRIBUTED_SERVICE = "unattributed"

/**
 * Where a pre-service-field row belongs, by its eventType. Used by readers
 * (aggregations over historical rows) and by the internal ingest when an
 * in-flight request from an older deploy arrives without a service.
 *
 * Total over UsageEventType by construction — the registry test asserts it
 * stays total when either side changes.
 */
export const LEGACY_EVENT_TYPE_SERVICE: Record<UsageEventType, UsageServiceId> = {
  chat_message: "interview-chat",
  feedback_generation: "feedback-generation",
  hint_request: "interview-hints",
  voice_transcription: "voice-transcription",
  embedding_generation: "rag-indexing",
  session_start: "session-telemetry",
  session_end: "session-telemetry",
}
