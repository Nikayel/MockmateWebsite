/**
 * Lab onboarding — the data an onboarding cinematic is made of.
 *
 * The "you're hired" first-run experience is one reusable overlay
 * (`components/labs/onboarding/LabOnboarding.tsx`) driven entirely by an
 * `OnboardingConfig`. Meridian (Sprint Labs) authors the full five-beat arc
 * including the 3D system map; a decomposition Case Lab reuses the same overlay
 * with a lighter, lab-derived config and no map (a one-sitting problem has no
 * six-module repo to tour). Keeping the content as plain data here — no JSX, no
 * imports — is what lets both surfaces share one renderer and keeps the arc
 * reviewable as prose.
 *
 * Cognitive-load law (see docs/sprint-labs/ONBOARDING-UX.md): one idea per
 * beat, one focal point on screen, and the cinematic is a ~60-90s arrival that
 * hands off to the calm flat workspace. If a beat does not lower the load of the
 * next screen, it does not belong in the list.
 */

/** The kinds of beat the overlay knows how to render, in their natural order. */
export type OnboardingBeatKind = "offer" | "company" | "system-map" | "pair" | "handoff"

/** One top-level module in the system map — the file-level "this is this," without a manual. */
export interface OnboardingModule {
  /** Stable key. */
  id: string
  /** Human name, e.g. "claims service". */
  label: string
  /** One line on what it does, e.g. "creates and reads claims". */
  role: string
  /** The path it maps to, e.g. "src/claims" — the concrete anchor. */
  path: string
}

interface BeatBase {
  /** Short label for the chapter strip. */
  chapter: string
}

/** Beat 1 — the offer. "You're hired." Sets the fiction and the role, no chrome. */
export interface OfferBeat extends BeatBase {
  kind: "offer"
  /** Revealed in order, one focal line at a time (staggered, not click-gated). */
  lines: string[]
}

/** Beat 2 — the company. What it does and why correctness matters. */
export interface CompanyBeat extends BeatBase {
  kind: "company"
  heading: string
  lines: string[]
}

/** Beat 3 — the system map. The one 3D moment; lights one module at a time. */
export interface SystemMapBeat extends BeatBase {
  kind: "system-map"
  heading: string
  /** Six-ish top-level modules. Order is the tour order. */
  modules: OnboardingModule[]
}

/** Beat 4 — your pair. The bridge out of the movie into working. */
export interface PairBeat extends BeatBase {
  kind: "pair"
  partnerName: string
  lines: string[]
}

/** Beat 5 — the handoff. The last beat resolves into the real UI underneath. */
export interface HandoffBeat extends BeatBase {
  kind: "handoff"
  heading: string
  body: string
  /** The button that dismisses the overlay onto the real surface. */
  ctaLabel: string
}

export type OnboardingBeat = OfferBeat | CompanyBeat | SystemMapBeat | PairBeat | HandoffBeat

export interface OnboardingConfig {
  /**
   * Stable id for seen-state, scoped per company/lab (e.g. "meridian",
   * "case-lab:palantir-fdse"). Changing it re-shows the cinematic.
   */
  id: string
  /** Company name, for the resume card and the accessible label. */
  company: string
  /** The beats, in order. Four or five; see the two configs that build these. */
  beats: OnboardingBeat[]
}

/** The system-map beat, if this config has one. Used to lazy-load the 3D scene only when needed. */
export function findSystemMapBeat(config: OnboardingConfig): SystemMapBeat | null {
  return (config.beats.find((beat) => beat.kind === "system-map") as SystemMapBeat) ?? null
}
