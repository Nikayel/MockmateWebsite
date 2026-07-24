/**
 * Pure quorum overlap math for the quorum-explorer sim: N/R/W guarantees, stale-read
 * risk, availability under replica kills, and the two absorbed presets (Kafka
 * acks/min.insync.replicas, BFT 3f+1). Table-testable; the widget only renders it.
 */

export interface QuorumAnalysis {
  /** R + W > N: every read set intersects every write set. */
  overlapGuaranteed: boolean
  /** Replicas a read may miss entirely (N - R): the stale window when overlap fails. */
  unreadReplicas: number
  /** How many replica losses still leave a WRITE quorum reachable. */
  writeToleratesFailures: number
  /** How many replica losses still leave a READ quorum reachable. */
  readToleratesFailures: number
}

export function analyzeQuorum(n: number, r: number, w: number): QuorumAnalysis {
  return {
    overlapGuaranteed: r + w > n,
    unreadReplicas: Math.max(0, n - r),
    writeToleratesFailures: Math.max(0, n - w),
    readToleratesFailures: Math.max(0, n - r),
  }
}

/** With `killed` replicas down, can a write/read quorum still be assembled? */
export function availableUnderFailures(n: number, quorum: number, killed: number): boolean {
  return quorum <= n - killed
}

/**
 * Kafka mapping: RF ~ N, min.insync.replicas ~ the write quorum when acks=all.
 * An acked write survives a broker loss iff every acked copy set still holds one
 * live member; with acks=all + min.insync=Q, tolerated broker losses = Q - 1.
 */
export function kafkaAckedWriteSurvives(opts: {
  replicationFactor: number
  minInsync: number
  killedBrokers: number
}): { writable: boolean; ackedSurvives: boolean } {
  const { replicationFactor, minInsync, killedBrokers } = opts
  return {
    writable: minInsync <= replicationFactor - killedBrokers,
    ackedSurvives: killedBrokers <= minInsync - 1,
  }
}

/** BFT: tolerating f Byzantine nodes needs N >= 3f + 1 (quorums of 2f + 1 overlap in f + 1, one honest). */
export function bftTolerated(n: number): number {
  return Math.max(0, Math.floor((n - 1) / 3))
}
