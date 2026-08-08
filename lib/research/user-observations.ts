/**
 * Collapse review events into ONE observation per user.
 *
 * This module exists because of a single fact about the experiment: a user is
 * randomized once, into one arm, and then produces many review events. Those
 * events are not independent samples. A user who practices daily contributes
 * fifty correlated rows; a user who practices twice contributes two. Running a
 * t-test over the raw event stream therefore:
 *
 *   - inflates n from "hundreds of users" to "tens of thousands of events",
 *   - shrinks every standard error by roughly sqrt(events per user),
 *   - and reports p-values orders of magnitude smaller than the evidence
 *     supports, i.e. it manufactures significance out of heavy users.
 *
 * The unit of analysis must match the unit of randomization. Every metric below
 * is therefore computed WITHIN a user first, and the resulting per-user numbers
 * are what the tests consume.
 */

import type { AlgorithmResearchEvent, SpacedRepetitionAlgorithm } from "../types"

/** One randomized unit: everything a single user did inside the window. */
export interface UserObservation {
  userId: string
  algorithm: SpacedRepetitionAlgorithm
  /** Events contributed by this user inside the analysis window. */
  reviews: number
  /** Mean interview score across this user's reviews, null when none carried a score. */
  meanScore: number | null
  /** Share of this user's reviews recalled correctly, null when none recorded it. */
  retentionRate: number | null
  /** Share of this user's reviews where the schedule predicted recall correctly. */
  intervalAccuracy: number | null
  firstEventAt: string
  lastEventAt: string
}

export interface UserObservationSet {
  sm2: UserObservation[]
  fsrs: UserObservation[]
  /** Events that were folded into the observations above. */
  eventsUsed: number
  /**
   * Users seen under BOTH algorithms inside the window. They are excluded
   * entirely: a user who switched arms mid-window belongs to neither, and
   * silently filing them under one arm is exactly how a clean randomization
   * turns into a biased comparison. A non-zero count here is a bug signal
   * (a mid-experiment migration, or a user toggling the algorithm setting).
   */
  usersWithMixedAssignment: number
  /** Events discarded because they carried no user id or no algorithm. */
  eventsDiscarded: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * Rate over the events that actually recorded the flag. Events written before
 * a field existed must not be silently counted as `false`: a missing
 * observation and a negative observation are different facts, and averaging
 * them together drags both arms toward zero by an amount that depends on how
 * old each arm's data is.
 */
function booleanRate(values: Array<boolean | undefined>): number | null {
  const recorded = values.filter((value): value is boolean => typeof value === "boolean")
  if (recorded.length === 0) return null
  return recorded.filter(Boolean).length / recorded.length
}

function numericMean(values: Array<number | undefined>): number | null {
  const recorded = values.filter(isFiniteNumber)
  if (recorded.length === 0) return null
  return recorded.reduce((sum, value) => sum + value, 0) / recorded.length
}

/**
 * Group review events into one observation per user, split by arm.
 *
 * Events are assumed to be pre-filtered to the analysis window by the caller;
 * this function does no time filtering of its own so the window stays a single
 * decision made in one place.
 */
export function aggregateEventsByUser(events: AlgorithmResearchEvent[]): UserObservationSet {
  const byUser = new Map<string, AlgorithmResearchEvent[]>()
  let eventsDiscarded = 0

  for (const event of events) {
    const userId = event?.user_id
    const algorithm = event?.algorithm
    if (!userId || (algorithm !== "sm2" && algorithm !== "fsrs")) {
      eventsDiscarded++
      continue
    }
    const bucket = byUser.get(userId)
    if (bucket) bucket.push(event)
    else byUser.set(userId, [event])
  }

  const sm2: UserObservation[] = []
  const fsrs: UserObservation[] = []
  let usersWithMixedAssignment = 0
  let eventsUsed = 0

  for (const [userId, userEvents] of byUser) {
    const algorithms = new Set(userEvents.map((event) => event.algorithm))
    if (algorithms.size > 1) {
      usersWithMixedAssignment++
      continue
    }

    const algorithm = userEvents[0].algorithm
    const timestamps = userEvents
      .map((event) => event.timestamp)
      .filter((timestamp): timestamp is string => typeof timestamp === "string")
      .sort()

    const observation: UserObservation = {
      userId,
      algorithm,
      reviews: userEvents.length,
      meanScore: numericMean(userEvents.map((event) => event.score)),
      retentionRate: booleanRate(userEvents.map((event) => event.actual_retention)),
      intervalAccuracy: booleanRate(userEvents.map((event) => event.retention_as_predicted)),
      firstEventAt: timestamps[0] ?? "",
      lastEventAt: timestamps[timestamps.length - 1] ?? "",
    }

    eventsUsed += userEvents.length
    if (algorithm === "sm2") sm2.push(observation)
    else fsrs.push(observation)
  }

  return { sm2, fsrs, eventsUsed, usersWithMixedAssignment, eventsDiscarded }
}

/**
 * Pull one metric out of a set of observations, dropping the users who have no
 * value for it. Dropping is right and losing it silently is not, so callers
 * report the resulting n alongside every test.
 */
export function metricValues(
  observations: UserObservation[],
  metric: "meanScore" | "retentionRate" | "intervalAccuracy"
): number[] {
  return observations
    .map((observation) => observation[metric])
    .filter((value): value is number => value !== null && Number.isFinite(value))
}

/** Users who reviewed at least once in the window, per arm. */
export function activeUserCounts(set: UserObservationSet): { sm2: number; fsrs: number } {
  return { sm2: set.sm2.length, fsrs: set.fsrs.length }
}
