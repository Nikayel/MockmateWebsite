/**
 * Pure replication-lag timeline for the replication-lag widget: a leader appends to
 * its log (with an optional write burst), followers apply at a capped rate so lag
 * spikes and drains visibly, and the read-your-writes scenario is a computed
 * outcome: the comment vanishes on a lagging replica, and sticky routing or a
 * version token cures it (the token by waiting, sticky by routing to the leader).
 */

export type Cure = "none" | "sticky" | "version-token"

export interface ReplicationTimeline {
  /** Leader log length after each tick. */
  leader: number[]
  /** Per-follower applied length after each tick. */
  followers: number[][]
  /** Per-follower lag (entries behind) after each tick. */
  lag: number[][]
}

export function simulateReplication(opts: {
  ticks: number
  /** Steady leader writes per tick. */
  writeRate: number
  /** Burst multiplier over [from, to). */
  burst?: { from: number; to: number; multiplier: number }
  /** Each follower applies at most this many entries per tick (the lag source). */
  applyRate: number
  /** Extra per-follower apply handicap (follower i applies applyRate - handicap*i, min 1). */
  followerCount: number
  handicap?: number
}): ReplicationTimeline {
  const { ticks, writeRate, burst, applyRate, followerCount, handicap = 1 } = opts
  let leaderLen = 0
  let writeCredit = 0
  const applied = Array.from({ length: followerCount }, () => 0)
  const applyCredit = Array.from({ length: followerCount }, () => 0)
  const leader: number[] = []
  const followers: number[][] = Array.from({ length: followerCount }, () => [])
  const lag: number[][] = Array.from({ length: followerCount }, () => [])

  for (let t = 0; t < ticks; t++) {
    const rate = burst && t >= burst.from && t < burst.to ? writeRate * burst.multiplier : writeRate
    writeCredit += rate
    while (writeCredit >= 1) {
      writeCredit -= 1
      leaderLen++
    }
    for (let f = 0; f < followerCount; f++) {
      applyCredit[f] += Math.max(1, applyRate - handicap * f)
      while (applyCredit[f] >= 1 && applied[f] < leaderLen) {
        applyCredit[f] -= 1
        applied[f]++
      }
      if (applied[f] >= leaderLen) applyCredit[f] = Math.min(applyCredit[f], 1)
      followers[f].push(applied[f])
      lag[f].push(leaderLen - applied[f])
    }
    leader.push(leaderLen)
  }
  return { leader, followers, lag }
}

export interface ReadOutcome {
  visible: boolean
  servedBy: string
  waitedTicks: number
  narrative: string
}

/**
 * The vanishing-comment scenario: the write lands at position `leader[writeTick]`
 * on the leader; a read at `readTick` from follower `f` sees it only if that
 * follower has applied past the write's position, unless a cure intervenes.
 */
export function readYourWrites(
  timeline: ReplicationTimeline,
  opts: { writeTick: number; readTick: number; follower: number; cure: Cure }
): ReadOutcome {
  const { writeTick, readTick, follower, cure } = opts
  const position = timeline.leader[writeTick]
  const appliedAtRead = timeline.followers[follower][readTick]

  if (cure === "sticky")
    return {
      visible: true,
      servedBy: "leader (sticky routing)",
      waitedTicks: 0,
      narrative:
        "Sticky routing sends this user's reads to the leader after their write, so the comment is there. The cost: those reads no longer scale across replicas.",
    }
  if (cure === "version-token") {
    let wait = 0
    while (
      readTick + wait < timeline.followers[follower].length &&
      timeline.followers[follower][readTick + wait] < position
    )
      wait++
    const caughtUp = timeline.followers[follower][readTick + wait] >= position
    return {
      visible: caughtUp,
      servedBy: `follower ${follower + 1} (version token)`,
      waitedTicks: wait,
      narrative: caughtUp
        ? `The read carried the write's log position as a token; the replica held the read ${wait} ${wait === 1 ? "tick" : "ticks"} until it caught up, then answered correctly.`
        : "The replica never caught up within the window.",
    }
  }
  const visible = appliedAtRead >= position
  return {
    visible,
    servedBy: `follower ${follower + 1}`,
    waitedTicks: 0,
    narrative: visible
      ? "The replica happened to be caught up past the write, so the comment is there."
      : "The comment VANISHED: the load balancer routed the read to a replica that has not applied the write yet. The user just watched their own comment disappear.",
  }
}
