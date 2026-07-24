/**
 * Pure, deterministic producer/consumer queue simulation for the queue-sim widget:
 * depth over time under a rate mismatch, bounded backpressure vs unbounded growth,
 * drop policies, and the scale-on-backlog mode (KEDA-style leading signal) that
 * adds consumers when lag crosses a threshold. Fractional rates accumulate exactly;
 * no randomness anywhere.
 */

export interface QueueSimResult {
  /** Queue depth sampled after each tick. */
  depth: number[]
  produced: number
  consumed: number
  dropped: number
  /** Final backlog latency in ticks (depth / effective drain rate), Infinity when drain is 0. */
  backlogLatency: number
  /** Consumers active at the end (grows only in scale-on-backlog mode). */
  consumers: number
  /** First tick depth crossed the unbounded warning line, or null. */
  runawayAt: number | null
}

export function simulateQueue(opts: {
  producerRate: number
  consumerRate: number
  ticks: number
  /** Queue capacity; Infinity = unbounded. */
  capacity: number
  /** What happens to arrivals over capacity (bounded only). */
  onFull?: "drop" | "backpressure"
  /** A temporary producer surge multiplier over [burstFrom, burstTo). */
  burst?: { from: number; to: number; multiplier: number }
  /** Scale-on-backlog: add a consumer each time depth stays over threshold. */
  scaleOnBacklog?: { threshold: number; maxConsumers: number }
  /** Depth considered runaway for the unbounded story. */
  runawayLine?: number
}): QueueSimResult {
  const {
    producerRate,
    consumerRate,
    ticks,
    capacity,
    onFull = "drop",
    burst,
    scaleOnBacklog,
    runawayLine = 200,
  } = opts

  let depth = 0
  let produceCredit = 0
  let consumeCredit = 0
  let produced = 0
  let consumed = 0
  let dropped = 0
  let consumers = 1
  let runawayAt: number | null = null
  const samples: number[] = []

  for (let t = 0; t < ticks; t++) {
    const rate =
      burst && t >= burst.from && t < burst.to ? producerRate * burst.multiplier : producerRate
    produceCredit += rate
    while (produceCredit >= 1) {
      produceCredit -= 1
      if (depth < capacity) {
        depth++
        produced++
      } else if (onFull === "drop") {
        dropped++
      } else {
        // Backpressure: the producer is stalled; the item is neither queued nor lost.
        produceCredit = 0
        break
      }
    }

    consumeCredit += consumerRate * consumers
    while (consumeCredit >= 1 && depth > 0) {
      consumeCredit -= 1
      depth--
      consumed++
    }
    if (depth === 0) consumeCredit = Math.min(consumeCredit, 1)

    if (
      scaleOnBacklog &&
      depth > scaleOnBacklog.threshold &&
      consumers < scaleOnBacklog.maxConsumers
    )
      consumers++

    if (runawayAt === null && depth >= runawayLine) runawayAt = t
    samples.push(depth)
  }

  const drain = consumerRate * consumers
  return {
    depth: samples,
    produced,
    consumed,
    dropped,
    backlogLatency: drain > 0 ? depth / drain : Number.POSITIVE_INFINITY,
    consumers,
    runawayAt,
  }
}
