/**
 * Pure state machine for the partition-sim widget: exactly two replicas (A, B) plus
 * clients, scripted writes, CP vs AP behavior during a partition, and BAKED
 * deterministic merge results on heal (LWW drop, version-vector siblings,
 * PN-counter sum, set union). Every outcome is a table-testable value; the widget
 * only renders and narrates them.
 */

export type Side = "A" | "B"
export type PartitionMode = "cp" | "ap"
export type MergeStrategy = "lww" | "version-vector" | "crdt-counter" | "crdt-set"

/** A scripted write the learner fires in order. */
export interface ScriptedWrite {
  side: Side
  /** register: the value to set; counter: the amount to add; set: the element to add. */
  value: string
  label: string
}

export type DataKind = "register" | "counter" | "set"

export interface ReplicaState {
  /** register: last value + logical stamp; counter: per-side sums; set: elements. */
  register?: { value: string; stamp: number; from: Side }
  counter: Record<Side, number>
  elements: string[]
}

export interface ApplyResult {
  accepted: boolean
  reason: string
}

export interface WorldState {
  A: ReplicaState
  B: ReplicaState
  /** Writes each side accepted while partitioned (drives the divergence narration). */
  acceptedDuringPartition: { side: Side; label: string; stamp: number; value: string }[]
}

export function initialWorld(): WorldState {
  return {
    A: { counter: { A: 0, B: 0 }, elements: [] },
    B: { counter: { A: 0, B: 0 }, elements: [] },
    acceptedDuringPartition: [],
  }
}

/**
 * Apply one scripted write. During a partition under CP, side B (the minority in
 * this two-node teaching model) refuses; under AP both sides accept and diverge.
 * Stamps are the script order (deterministic LWW tiebreak: later index wins;
 * equal-index cannot happen).
 */
export function applyWrite(
  world: WorldState,
  kind: DataKind,
  write: ScriptedWrite,
  stamp: number,
  partitioned: boolean,
  mode: PartitionMode
): { world: WorldState; result: ApplyResult } {
  if (partitioned && mode === "cp" && write.side === "B") {
    return {
      world,
      result: {
        accepted: false,
        reason: "CP: the minority side cannot reach a quorum, so it refuses the write.",
      },
    }
  }
  const next: WorldState = {
    A: cloneReplica(world.A),
    B: cloneReplica(world.B),
    acceptedDuringPartition: [...world.acceptedDuringPartition],
  }
  const targets: Side[] = partitioned ? [write.side] : ["A", "B"]
  for (const target of targets) {
    const replica = next[target]
    if (kind === "register") replica.register = { value: write.value, stamp, from: write.side }
    if (kind === "counter") replica.counter[write.side] += Number(write.value)
    if (kind === "set" && !replica.elements.includes(write.value))
      replica.elements = [...replica.elements, write.value].sort()
  }
  if (partitioned)
    next.acceptedDuringPartition.push({
      side: write.side,
      label: write.label,
      stamp,
      value: write.value,
    })
  return {
    world: next,
    result: {
      accepted: true,
      reason: partitioned
        ? `Accepted by ${write.side} only: the sides are now diverging.`
        : "Accepted and replicated to both sides.",
    },
  }
}

function cloneReplica(r: ReplicaState): ReplicaState {
  return {
    register: r.register ? { ...r.register } : undefined,
    counter: { ...r.counter },
    elements: [...r.elements],
  }
}

export interface MergeOutcome {
  merged: ReplicaState
  /** Labels of writes silently discarded (LWW's sin); empty for the safe strategies. */
  dropped: string[]
  /** Concurrent values surfaced to the application (version-vector registers). */
  siblings: string[]
  narrative: string
}

/** Heal the partition and merge deterministically per strategy. */
export function heal(world: WorldState, kind: DataKind, strategy: MergeStrategy): MergeOutcome {
  const during = world.acceptedDuringPartition
  if (kind === "counter") {
    const merged: ReplicaState = {
      counter: {
        A: Math.max(world.A.counter.A, world.B.counter.A),
        B: Math.max(world.A.counter.B, world.B.counter.B),
      },
      elements: [],
    }
    return {
      merged,
      dropped: [],
      siblings: [],
      narrative:
        "PN-counter merge: each side's own increments are taken at their maximum and summed. Nothing is lost; the count is exactly the writes that happened.",
    }
  }
  if (kind === "set") {
    const merged: ReplicaState = {
      counter: { A: 0, B: 0 },
      elements: [...new Set([...world.A.elements, ...world.B.elements])].sort(),
    }
    return {
      merged,
      dropped: [],
      siblings: [],
      narrative:
        "Set union merge: both sides' additions survive. Add-only sets are the simplest CRDT because union is the whole merge function.",
    }
  }
  // Register semantics differ by strategy.
  const a = world.A.register
  const b = world.B.register
  if (!a || !b || a.stamp === b.stamp) {
    const winner = a ?? b
    return {
      merged: { register: winner, counter: { A: 0, B: 0 }, elements: [] },
      dropped: [],
      siblings: [],
      narrative: "No conflicting writes to reconcile.",
    }
  }
  if (strategy === "lww") {
    const winner = a.stamp > b.stamp ? a : b
    const loser = a.stamp > b.stamp ? b : a
    const droppedLabel =
      during.find((w) => w.stamp === loser.stamp)?.label ?? `the ${loser.from} write`
    return {
      merged: { register: winner, counter: { A: 0, B: 0 }, elements: [] },
      dropped: [droppedLabel],
      siblings: [],
      narrative: `Last-writer-wins kept the later stamp and SILENTLY DISCARDED ${droppedLabel}. No error was raised anywhere; the data is simply gone.`,
    }
  }
  // version-vector: the writes are concurrent, so both survive as siblings.
  const siblings = [a.value, b.value].sort()
  return {
    merged: { register: undefined, counter: { A: 0, B: 0 }, elements: [] },
    dropped: [],
    siblings,
    narrative:
      "Version vectors detected the writes as CONCURRENT (neither happened before the other), so both values survive as siblings and the application must resolve them.",
  }
}
