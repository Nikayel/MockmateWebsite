/**
 * A decomposition Case Lab reuses the same onboarding overlay as Meridian, with
 * a lighter, lab-derived arc: offer, the brief, the room, handoff. No system-map
 * beat — a one-sitting decomposition problem has no six-module repo to tour, and
 * inventing one would raise cognitive load instead of lowering it. Every line is
 * drawn from the lab's own authored fields, so it cannot describe a company or a
 * problem the lab does not actually pose.
 */

import type { OnboardingConfig } from "@/lib/labs/onboarding/config"
import type { CaseLab } from "@/lib/labs/types"

/** "palantir" -> "Palantir", "google-cloud" -> "Google Cloud". The lab stores a lowercase slug. */
function companyDisplayName(slug: string): string {
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function caseLabOnboardingConfig(lab: CaseLab): OnboardingConfig {
  const company = companyDisplayName(lab.company)
  return {
    // Per-lab seen-state: each company's round plays its "you're in the room" intro once, never again.
    id: `case-lab:${lab.id}`,
    company,
    beats: [
      {
        kind: "offer",
        chapter: "Offer",
        lines: [
          `${company} — ${lab.role} interview`,
          `You're in the room. Today's round: ${lab.title}.`,
        ],
      },
      {
        kind: "company",
        chapter: "The brief",
        heading: "What you're here to do",
        lines: [
          lab.hook,
          "The prompt is deliberately underspecified, the way the real one is. Scope it before you build.",
        ],
      },
      {
        kind: "pair",
        chapter: "The room",
        partnerName: "Your interviewer",
        lines: [
          "Your interviewer is in the room with you. Think out loud, the way you would on the day.",
          "You'll clarify, decompose, design, then build until the tests pass.",
        ],
      },
      {
        kind: "handoff",
        chapter: "Begin",
        heading: "Ready when you are",
        body: "Read the brief, then start with the questions you would ask before writing a single line.",
        ctaLabel: "See the brief",
      },
    ],
  }
}
