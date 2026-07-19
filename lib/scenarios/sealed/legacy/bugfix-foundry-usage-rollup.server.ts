// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `function normalizeAccountId(raw) {
  return String(raw).trim().toLowerCase()
}

function dedupe(events) {
  const seen = new Set()
  const unique = []
  for (const event of events) {
    if (seen.has(event.id)) continue
    seen.add(event.id)
    unique.push(event)
  }
  return unique
}

function addEvents(totals, events) {
  for (const event of events) {
    const accountId = normalizeAccountId(event.accountId)
    if (!totals[accountId]) {
      totals[accountId] = { computeSeconds: 0, eventCount: 0 }
    }
    totals[accountId].computeSeconds += event.computeSeconds || 0
    totals[accountId].eventCount += 1
  }
}

function rollupUsage(primaryEvents, backupEvents) {
  const totals = {}
  addEvents(totals, dedupe([...primaryEvents, ...backupEvents]))
  return totals
}

module.exports = { rollupUsage, normalizeAccountId, dedupe }
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-foundry-usage-rollup",
  bugDescription:
    "Duplicates are collapsed within each stream separately and the per-stream totals are then summed, so an event id emitted by both the primary and backup build is metered twice.",
  groundTruth:
    "Root cause: rollupUsage dedupes each stream in isolation and then adds both, so a cross-stream duplicate survives once per stream and is metered twice. Fix: dedupe across the merged streams before accumulating, so an event id seen on both is counted once. Because the merge lists the primary stream first and dedupe keeps the first occurrence, the primary stream's compute-seconds is authoritative for a disagreeing duplicate. Survival story: per-stream dedup looks correct and handles same-stream at-least-once repeats, which is nearly all of the traffic; only a cross-stream duplicate, which the backup-build replay suddenly made common, slips through. Red herrings, all reachable and provably innocent: (1) normalizeAccountId lower-cases and trims, so mixed casing and whitespace collapse to one account and are not the bug; (2) an event missing compute-seconds contributes zero via the || 0 guard and is tolerated; (3) same-stream repeats are already collapsed by dedupe within a stream.",
  rootCauseRubric: [
    "Identifies that dedup runs per stream, so a cross-stream duplicate survives once per stream.",
    "Connects the overbilled accounts to duplicates that span the two streams, not to same-stream repeats.",
    "Rules out account-id normalization and the missing-value guard as innocent with evidence.",
    "Names a regression guard such as a cross-stream duplicate test alongside the same-stream repeat test.",
  ],
  referenceFiles: [
    {
      path: "src/rollup.js",
      role: "editable",
      language: "javascript",
      content: reference,
    },
  ],
}
