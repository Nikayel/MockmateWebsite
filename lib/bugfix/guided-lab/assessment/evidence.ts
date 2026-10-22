import type { LabEvidence, LabEvent, LabObservation } from "./schema"

export function emptyLabEvidence(): LabEvidence {
  return { version: 1, revision: 0, nextSequence: 0, truncated: false, events: [] }
}

/** Retain the beginning and most recent history. Never silently claim a complete trace. */
export function appendLabEvidence(
  log: LabEvidence,
  phaseId: string,
  observation: LabObservation,
  revision = log.revision
): LabEvidence {
  const event = {
    ...observation,
    id: `e${log.nextSequence}`,
    phaseId,
    revision,
    timestamp: Date.now(),
  } as LabEvent
  const events = [...log.events, event]
  let truncated = log.truncated
  while (
    events.length > 300 ||
    new TextEncoder().encode(JSON.stringify(events)).byteLength > 160000
  ) {
    events.splice(Math.min(12, events.length - 2), 1)
    truncated = true
  }
  return { ...log, events, truncated, nextSequence: log.nextSequence + 1 }
}
