/**
 * ============================================================================
 * DO NOT ACTIVATE YET. This module has no call sites on purpose.
 * ============================================================================
 *
 * Machinery for the Sable/hint-agent consolidation. It is complete and tested,
 * but wiring it into `app/api/chat/route.ts` changes live interviewer behaviour
 * and is a separate, deliberate decision. Before activating, all of these must
 * be true:
 *
 *   1. Delivering a rung increments the same `hintsRevealed` the hint UI feeds,
 *      or the scoring bug this exists to fix is still open (see below).
 *   2. `response-guardrails.ts` rejects insight-level content when no rung was
 *      sanctioned, so the model ignoring its instructions is caught rather than
 *      trusted.
 *   3. The ledger is injected AFTER the conversation history in the prompt,
 *      never before. Cached input is 10x cheaper than fresh on GPT-5.6 Luna
 *      ($0.02 vs $0.20 per 1M) and caching needs a byte-stable prefix; a ledger
 *      ahead of the history invalidates the cache every single turn.
 *
 * WHY THIS EXISTS
 *
 * On 2026-08-22 the interviewer probed one thread seven consecutive times and
 * then stated the problem's core insight outright. Two separate causes, and
 * neither was the prompt being insufficiently strict:
 *
 *   - It could not see its own earlier probes, because history was windowed.
 *     That is fixed in context-window.ts.
 *   - Having exhausted probing, it had no legal move except to answer. Nothing
 *     in the system offered it a third option.
 *
 * This module supplies the third option as STATE rather than instruction. The
 * interviewer stops being asked to remember how many times it has probed a
 * topic and is told, as a fact, what it may do next. Past the cap, `nextAction`
 * simply never returns "probe" - the illegal move is absent from the option set
 * rather than forbidden by prose.
 *
 * WHY IT IS NOT PART OF StruggleMetrics
 *
 * `lib/agents/hints/types.ts` defines struggle purely from the workspace:
 * timeSpentMinutes, codeChanges, testsRun, testsFailed, errorCount. All of it
 * assumes the candidate is writing code. The 2026-08-22 candidate never wrote
 * any - the session died in discussion - so every one of those reads zero and
 * `calculateStruggleLevel` scores them "none", which recommends rung 1 or does
 * not fire at all. Conversational struggle is invisible to the hint agent.
 * `toStruggleContribution` below is how this ledger supplies it.
 *
 * THE SCORING BUG THIS CLOSES
 *
 * `hintsRevealed` is derived from `state.hintsViewed.length`, i.e. the hint UI,
 * and it drives `mastery-score` penalties and FSRS difficulty. The interviewer
 * talks on a different path entirely, so an insight handed over in conversation
 * increments nothing. That candidate would have been scored as though they
 * derived the answer unaided, and spaced repetition would have filed the
 * problem as understood. Routing interviewer hints through a counted ladder is
 * what makes a leak impossible to hide rather than merely discouraged.
 */

import type { HintLevel } from "@/lib/agents/hints"

/**
 * How many times one topic may be probed before probing stops being offered.
 *
 * Two, matching the cap the interviewer prompt has stated in prose since
 * 2026-08-10. The prose version was unenforceable: it asked a model with a
 * truncated view of its own history to count its own questions.
 */
export const PROBE_CAP = 2

export type TopicStatus =
  /** Raised by the interviewer, not yet answered to satisfaction. */
  | "probed"
  /** The candidate gave an answer the extractor accepted. Stop asking. */
  | "answered"
  /** Probing exhausted; at least one hint rung has been delivered. */
  | "hinted"
  /** Exhausted and set aside without resolution, to be reported as a gap. */
  | "parked"

export interface TopicEntry {
  topicId: string
  probeCount: number
  status: TopicStatus
  /** Highest rung delivered for this topic, or null if none has been. */
  lastRungIssued: HintLevel | null
}

export interface TopicLedger {
  readonly topics: Readonly<Record<string, TopicEntry>>
}

/**
 * What the interviewer is permitted to do about a topic on this turn.
 *
 * Deliberately a closed union with no "answer it" member. There is no
 * representable value here that means "state the insight outright", which is
 * the entire point: a leak cannot be selected, only invented in defiance of the
 * sanctioned action, and that is what the guardrail catches.
 */
export type NextAction =
  | { kind: "probe"; probeNumber: number }
  | { kind: "hint"; level: HintLevel }
  | { kind: "move_on"; reason: "answered" | "ladder_exhausted" }

export function emptyLedger(): TopicLedger {
  return { topics: {} }
}

function entryFor(ledger: TopicLedger, topicId: string): TopicEntry {
  return (
    ledger.topics[topicId] ?? {
      topicId,
      probeCount: 0,
      status: "probed",
      lastRungIssued: null,
    }
  )
}

function withEntry(ledger: TopicLedger, entry: TopicEntry): TopicLedger {
  return { topics: { ...ledger.topics, [entry.topicId]: entry } }
}

/**
 * Record that the interviewer probed a topic.
 *
 * Counts past PROBE_CAP rather than clamping. The excess is the signal that
 * something upstream is ignoring `nextAction`, and a clamped counter would hide
 * exactly the runaway this module exists to prevent.
 */
export function recordProbe(ledger: TopicLedger, topicId: string): TopicLedger {
  const entry = entryFor(ledger, topicId)
  if (entry.status === "answered") return ledger

  return withEntry(ledger, {
    ...entry,
    probeCount: entry.probeCount + 1,
    status: entry.status === "hinted" ? "hinted" : "probed",
  })
}

/** Record that the candidate answered a topic. Terminal: probing stops. */
export function recordAnswer(ledger: TopicLedger, topicId: string): TopicLedger {
  return withEntry(ledger, { ...entryFor(ledger, topicId), status: "answered" })
}

/**
 * Record that a hint rung was delivered.
 *
 * Never lowers `lastRungIssued`. Rungs are cumulative disclosure: once rung 3
 * has been said aloud, later delivering rung 2 does not un-disclose it, and the
 * scoring penalty must reflect the deepest rung reached.
 */
export function recordRung(ledger: TopicLedger, topicId: string, level: HintLevel): TopicLedger {
  const entry = entryFor(ledger, topicId)
  const highest = (
    entry.lastRungIssued === null ? level : Math.max(entry.lastRungIssued, level)
  ) as HintLevel

  return withEntry(ledger, { ...entry, status: "hinted", lastRungIssued: highest })
}

/** Mark a topic set aside unresolved, so feedback can report it as a gap. */
export function recordParked(ledger: TopicLedger, topicId: string): TopicLedger {
  const entry = entryFor(ledger, topicId)
  if (entry.status === "answered") return ledger
  return withEntry(ledger, { ...entry, status: "parked" })
}

export function probeCount(ledger: TopicLedger, topicId: string): number {
  return ledger.topics[topicId]?.probeCount ?? 0
}

/**
 * The one legal move for this topic right now.
 *
 * `maxLevel` is how many rungs the hint agent actually generated for this
 * problem; asking for a rung it never produced would resolve to nothing and
 * leave the interviewer with no move at all, which is the state that produced
 * the leak.
 */
export function nextAction(
  ledger: TopicLedger,
  topicId: string,
  maxLevel: HintLevel = 4
): NextAction {
  const entry = ledger.topics[topicId]

  if (!entry) return { kind: "probe", probeNumber: 1 }
  if (entry.status === "answered") return { kind: "move_on", reason: "answered" }

  if (entry.probeCount < PROBE_CAP) {
    return { kind: "probe", probeNumber: entry.probeCount + 1 }
  }

  const nextRung = entry.lastRungIssued === null ? 1 : entry.lastRungIssued + 1
  if (nextRung > maxLevel) return { kind: "move_on", reason: "ladder_exhausted" }

  return { kind: "hint", level: nextRung as HintLevel }
}

/**
 * Conversational struggle, in the currency `StruggleMetrics` already counts.
 *
 * Returned as a contribution to be added to the workspace-derived metrics
 * rather than a replacement, so a candidate who is stuck BOTH in discussion and
 * in code is scored as more stuck than one who is stuck in only one of them.
 *
 * `hintsRevealed` counts topics, not rungs: a candidate needing rung 3 on one
 * topic is not three times as stuck as one needing rung 1 on the same topic,
 * but one needing help on three separate topics genuinely is further behind.
 */
export function toStruggleContribution(ledger: TopicLedger): {
  probesBeyondCap: number
  topicsHinted: number
  hintsRevealed: number
} {
  const entries = Object.values(ledger.topics)

  return {
    probesBeyondCap: entries.reduce((sum, e) => sum + Math.max(0, e.probeCount - PROBE_CAP), 0),
    topicsHinted: entries.filter((e) => e.status === "hinted").length,
    hintsRevealed: entries.filter((e) => e.lastRungIssued !== null).length,
  }
}

/**
 * Render the ledger as facts for the prompt.
 *
 * Facts, never rules: this block says what IS true, and the sanctioned action
 * is injected separately. Mixing the two is how a prompt grows an instruction
 * per edge case until none of them are followed.
 *
 * Sorted by topic id so the same ledger always renders the same bytes. An
 * unstable render would change the prompt tail on turns where nothing actually
 * changed, and defeat prompt caching for no benefit.
 */
export function formatForPrompt(ledger: TopicLedger): string {
  const entries = Object.values(ledger.topics).sort((a, b) => a.topicId.localeCompare(b.topicId))
  if (entries.length === 0) return ""

  const lines = entries.map((e) => {
    const rung = e.lastRungIssued === null ? "" : `, hint rung ${e.lastRungIssued} delivered`
    return `- ${e.topicId}: ${e.status}, probed ${e.probeCount}x${rung}`
  })

  return `TOPIC STATE (facts, not instructions):\n${lines.join("\n")}`
}
