/**
 * The one place the retention bands are defined.
 *
 * Deliberately dependency-free. The bands are needed by client components (the
 * /knowledge concept bar and recall dial) as well as by the scheduler, and
 * `algorithm-router.ts` — where they used to live — imports firebase-admin, so
 * reaching for them there drags the Admin SDK into the browser bundle.
 *
 * Several surfaces band the same number independently and had already drifted:
 * /knowledge coloured its concept bars at 80/60/40 while the card chip beside it
 * used these cut points, so one value could read green on the bar and amber on the
 * chip. Anything that turns a 0-100 retention into a label, a colour or a verdict
 * must derive it from here.
 *
 * The two named constants elsewhere are these same numbers by design:
 * `SOLID_RECALL_THRESHOLD` (0.9) is the "safe" floor, and `AT_RISK_RETRIEVABILITY`
 * (70) is the "ok" floor.
 */

export type MemoryUrgency = "safe" | "ok" | "warning" | "urgent"

/** Highest floor first — `memoryBandFor`'s find() depends on the order. */
export const MEMORY_STRENGTH_BANDS = [
  { floor: 90, label: "Strong", urgency: "safe" },
  { floor: 70, label: "Good", urgency: "ok" },
  { floor: 50, label: "Weakening", urgency: "warning" },
  { floor: 0, label: "Fading", urgency: "urgent" },
] as const satisfies ReadonlyArray<{ floor: number; label: string; urgency: MemoryUrgency }>

/** The band a 0-100 retention falls in. Values outside the range clamp to an end band. */
export function memoryBandFor(retention: number): { label: string; urgency: MemoryUrgency } {
  const band =
    MEMORY_STRENGTH_BANDS.find((b) => retention >= b.floor) ??
    MEMORY_STRENGTH_BANDS[MEMORY_STRENGTH_BANDS.length - 1]
  return { label: band.label, urgency: band.urgency }
}

/**
 * The ~5-rounded display value, rounded TOWARD its own band.
 *
 * Plain nearest-5 rounding lets a card at 68% print "~70%" beside the label
 * "Weakening" — the shown number sits ON the Good-band floor while the word says it
 * dropped out, and "why is ~70% weakening?" is the first question an audience asks.
 * When nearest-5 crosses a band boundary, we round the other way so the number and
 * the word always tell the same story.
 */
export function displayRetention(v: number): number {
  let shown = Math.round(v / 5) * 5
  if (memoryBandFor(shown).urgency !== memoryBandFor(v).urgency) {
    shown = v < shown ? shown - 5 : shown + 5
  }
  return shown
}
