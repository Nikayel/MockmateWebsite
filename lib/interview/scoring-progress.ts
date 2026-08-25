/**
 * Progress model for the scoring wait.
 *
 * The problem this solves: the dominant cost of scoring is an LLM call made with
 * `stream: false` (lib/ai-providers-edge.ts), so there is no token-level signal to
 * count. What the pipeline *does* emit is a handful of phase events at real
 * boundaries. Between them we know nothing, and a progress indicator that stops
 * moving between them reads as a hang.
 *
 * So: anchor the ring to the events we actually get, and *creep* between them
 * along a curve that approaches the next anchor without ever reaching it. The ring
 * then advances whenever the work advances, keeps moving when it doesn't, and is
 * structurally incapable of arriving somewhere before the work does.
 *
 * The anchors are DERIVED from one table of expected segment durations rather than
 * hand-assigned per phase. Hand-set fractions are the same class of invention as
 * the `SCORING_P95_MS = 15000` this replaces, just spread across more lines; with a
 * table, re-fitting the model to measured data is editing four numbers.
 *
 * THE NUMBERS BELOW ARE ESTIMATES, AND THEY ARE THE LAST ONES. Nothing in this
 * repo has ever measured the wait end to end, which is how four contradictory
 * duration claims survived. `scoring_wait_completed` (lib/hooks/use-streaming-feedback.ts)
 * now records each segment; once ~50 real sessions have landed, replace these with
 * the observed medians. Being wrong here costs pacing, never correctness: the
 * safety properties are structural, not tuned.
 */

/** A real event we get from the scoring pipeline, in the order they arrive. */
export type ScoringSignal =
  | "connect" // request issued; nothing has come back yet
  | "analyzing" // server: the parallel validation batch has started
  | "generating" // server: the single feedback-generation call has started
  | "persisting" // client: streaming is done, saving to history
  | "done" // results are on screen

/**
 * Median duration of the work that FOLLOWS each signal.
 *
 * connect     auth + POST + Edge boot + the instant algorithmic scores
 * analyzing   Promise.all of 2-4 non-streamed 512-token calls; wall time is the slowest
 * generating  ONE awaited 2048-token call, no parallelism to hide behind. The long pole.
 * persisting  the client's own persist round trip, after the stream closes
 */
const SEGMENTS: { signal: ScoringSignal; expectedMs: number }[] = [
  { signal: "connect", expectedMs: 700 },
  { signal: "analyzing", expectedMs: 8000 },
  { signal: "generating", expectedMs: 12000 },
  { signal: "persisting", expectedMs: 1200 },
]

/**
 * Where the ring starts. Not zero: a round line cap at exactly 0 renders as a lone
 * dot, which reads as a speck of dirt rather than the head of an arc.
 */
const LEAD = 0.02

/**
 * The asymptote while work is still running. Reaching 1.0 means "your results are
 * here", so nothing short of the results landing may produce it. This is the one
 * invariant worth protecting: a ring that reads 100% while the answer is still
 * being computed is exactly the lie this model exists to remove.
 */
const CEILING = 0.97

/**
 * Creep shape, hyperbolic: 1 - (1 + t/tau)^-ALPHA.
 *
 * Chosen over an exponential deliberately. An exponential's derivative decays like
 * e^-t and is numerically zero by ~3 tau — precisely when a slow run most needs the
 * ring to still be visibly moving. This tail decays like t^-(ALPHA+1) instead, so a
 * 45-second analyze phase is still crawling forward. It also needs no minimum-velocity
 * floor, and therefore no second clamp fighting the first to keep that floor from
 * marching past the anchor.
 *
 * At 1x the expected duration it has covered 82.8% of the segment, at 2x 92.4%,
 * at 4x 97.0% — and it never reaches 100%, which is what makes overtaking impossible.
 */
const ALPHA = 1.6

const TOTAL_MS = SEGMENTS.reduce((sum, s) => sum + s.expectedMs, 0)

/** Fraction the ring has reached at the moment each signal arrives. */
export const ANCHORS: Record<ScoringSignal, number> = (() => {
  const out = {} as Record<ScoringSignal, number>
  let elapsed = 0
  for (const seg of SEGMENTS) {
    out[seg.signal] = LEAD + (CEILING - LEAD) * (elapsed / TOTAL_MS)
    elapsed += seg.expectedMs
  }
  out.done = 1
  return out
})()

function segmentFor(signal: ScoringSignal) {
  return SEGMENTS.find((s) => s.signal === signal)
}

/** The anchor the current segment is creeping toward. */
function targetAfter(signal: ScoringSignal): number {
  const i = SEGMENTS.findIndex((s) => s.signal === signal)
  if (i === -1 || i === SEGMENTS.length - 1) return CEILING
  return ANCHORS[SEGMENTS[i + 1].signal]
}

/**
 * Progress at `elapsedMs` into the segment that began with `signal`.
 *
 * Guaranteed by construction: monotonic in elapsedMs, >= the signal's own anchor,
 * and strictly less than the next anchor for any finite elapsed time.
 */
export function progressFor(signal: ScoringSignal, elapsedMs: number): number {
  if (signal === "done") return 1
  const seg = segmentFor(signal)
  if (!seg) return LEAD

  const from = ANCHORS[signal]
  const to = targetAfter(signal)
  const tau = seg.expectedMs / 2
  const eased = 1 - Math.pow(1 + Math.max(elapsedMs, 0) / tau, -ALPHA)

  return Math.min(from + (to - from) * eased, CEILING)
}

/**
 * The opaque path: callers that get a start and an end and nothing in between
 * (the system-design flow POSTs /api/generate-feedback and never opens the SSE
 * stream). One segment spanning the whole expected wait, same curve, same ceiling
 * — so it walks instead of freezing, without inventing phases it cannot observe.
 */
export function opaqueProgress(elapsedMs: number): number {
  const tau = TOTAL_MS / 2
  const eased = 1 - Math.pow(1 + Math.max(elapsedMs, 0) / tau, -ALPHA)
  return Math.min(LEAD + (CEILING - LEAD) * eased, CEILING)
}

/**
 * Which checklist row a given fraction belongs to. Derived from the same anchors
 * the ring uses, so the list and the arc can never disagree — and so the opaque
 * path gets a walking checklist without a second set of hardcoded timers.
 */
export function stepForFraction(progress: number, stepCount: number): number {
  const bounds = SEGMENTS.map((s) => ANCHORS[s.signal])
  let step = 0
  for (let i = 0; i < bounds.length; i++) {
    if (progress >= bounds[i]) step = i
  }
  return Math.min(step, stepCount - 1)
}

/**
 * A segment running far past its expected duration. Past this point the curve is
 * advancing by less than a pixel every few seconds, so the arc is no longer a
 * liveness signal and no curve fixes that without lying. Say so in the copy
 * instead, and let the scanning eyes carry aliveness.
 */
const STALL_MULTIPLE = 3

export function isStalled(signal: ScoringSignal, elapsedMs: number): boolean {
  const seg = segmentFor(signal)
  return seg ? elapsedMs > seg.expectedMs * STALL_MULTIPLE : false
}

/**
 * How long the closing sweep to 100% should take, given where the ring had got to.
 *
 * Deliberately asymmetric: a fast answer earns a long, showy close, a slow one gets
 * an instant one. After forty seconds of waiting nobody wants a victory lap.
 */
export function closeDurationMs(progress: number): number {
  return Math.min(Math.max(900 * (1 - progress), 260), 620)
}

export const SCORING_PROGRESS_INTERNALS = { LEAD, CEILING, ALPHA, SEGMENTS, TOTAL_MS }
