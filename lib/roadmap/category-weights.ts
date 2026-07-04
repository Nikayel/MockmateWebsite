/**
 * Research-driven roadmap category weighting.
 *
 * Turns (experience level x track x target company) into a category mix
 * (algorithms / debugging / feature-building / system-design), and resolves the
 * user's creation choice (full research mix / DSA only / custom subset) into
 * normalized weights. All composition business rules live here (CLAUDE.md: no
 * duplicated business logic).
 *
 * Weight magnitudes come from the design council's synthesis of 2025-2026
 * interview-composition research (interviewing.io, company engineering blogs,
 * Levels.fyi): DSA still leads junior loops but is no longer the whole story;
 * debugging rounds are the fastest-growing round type; practical/feature-build
 * ("decomposition") rounds increasingly reach juniors; standalone system design
 * scales with seniority and is essentially absent for interns.
 */

import type {
  RoadmapCategory,
  RoadmapMixMode,
  RoadmapCategoryMix,
  CompanyId,
  CompanyTrack,
} from "@/lib/data/company-questions/types"
import { COMPANY_TIERS } from "@/lib/data/company-questions"

type ExperienceLevel = "intern" | "beginner" | "intermediate" | "advanced"
type Mix = Record<RoadmapCategory, number>

export const CATEGORY_TO_SCENARIO_TYPE: Record<RoadmapCategory, string> = {
  dsa: "dsa",
  bugfix: "bugfix",
  decomposition: "add-functionality",
  "system-design": "system-design",
}

export const SCENARIO_TYPE_TO_CATEGORY: Record<string, RoadmapCategory> = {
  dsa: "dsa",
  bugfix: "bugfix",
  "add-functionality": "decomposition",
  "system-design": "system-design",
}

export const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  dsa: "Algorithms",
  bugfix: "Debugging",
  decomposition: "Feature Build",
  "system-design": "System Design",
}

/**
 * System design is not yet schedulable in a roadmap: SystemDesignScenario has no
 * executable/auto-scored completion path, so a scheduled SD node could stall
 * day-completion. Until that writeback is verified, SD is excluded from every
 * generated mix. Flip to true (and add SD to the wizard) once it is wired.
 */
export const SYSTEM_DESIGN_ENABLED = false

/** Categories a roadmap can currently schedule and offer in the wizard. */
export const SCHEDULABLE_CATEGORIES: RoadmapCategory[] = SYSTEM_DESIGN_ENABLED
  ? ["dsa", "bugfix", "decomposition", "system-design"]
  : ["dsa", "bugfix", "decomposition"]

function emptyMix(): Mix {
  return { dsa: 0, bugfix: 0, decomposition: 0, "system-design": 0 }
}

// Research base mix by role bucket (renormalized to 100 over the 4 categories).
const ROLE_MIX: Record<string, Mix> = {
  "intern:swe": { dsa: 60, bugfix: 15, decomposition: 20, "system-design": 5 },
  "beginner:swe": { dsa: 55, bugfix: 15, decomposition: 20, "system-design": 10 },
  "intermediate:swe": { dsa: 40, bugfix: 15, decomposition: 20, "system-design": 25 },
  "advanced:swe": { dsa: 35, bugfix: 15, decomposition: 20, "system-design": 30 },
  fdse: { dsa: 30, bugfix: 15, decomposition: 45, "system-design": 10 },
}

function roleBucket(level: ExperienceLevel, track?: CompanyTrack): string {
  return track === "fdse" ? "fdse" : `${level}:swe`
}

// Company-group tilt on top of the role base. Directional; magnitudes are
// tunable defaults from the research prose, not exact measured values.
const GROUP_DELTA: Partial<Record<keyof typeof COMPANY_TIERS, Partial<Mix>>> = {
  topTech: { dsa: -27, bugfix: 15, decomposition: 15, "system-design": -3 }, // Stripe-style practical loops
  enterpriseDevtools: { dsa: -30, bugfix: 10, decomposition: 20, "system-design": 5 }, // take-home shops
  faang: { dsa: -10, bugfix: 5, decomposition: 5 }, // 2026 modernization tilt
  socialConsumer: { dsa: -8, bugfix: 3, decomposition: 7 },
  gamingEntertainment: { dsa: -12, decomposition: 10, "system-design": 5 },
  growthFinance: { dsa: -15, bugfix: 10, decomposition: 10 },
  emergingTech: { dsa: -10, decomposition: 15 },
}

// System-design ceiling by seniority (interns essentially never get standalone SDI).
const SD_CAP: Record<ExperienceLevel, number> = {
  intern: 5,
  beginner: 12,
  intermediate: 28,
  advanced: 40,
}

function groupOf(companyId: CompanyId): keyof typeof COMPANY_TIERS | undefined {
  return (Object.keys(COMPANY_TIERS) as (keyof typeof COMPANY_TIERS)[]).find((g) =>
    COMPANY_TIERS[g].companies.includes(companyId)
  )
}

/** Normalize to sum 100; DSA (deepest inventory) absorbs the rounding remainder. */
function normalize100(mix: Mix): Mix {
  const cats = Object.keys(mix) as RoadmapCategory[]
  const sum = cats.reduce((acc, c) => acc + Math.max(0, mix[c]), 0)
  if (sum <= 0) return { ...emptyMix(), dsa: 100 }

  const out = emptyMix()
  cats.forEach((c) => {
    out[c] = Math.round((Math.max(0, mix[c]) / sum) * 100)
  })
  const total = cats.reduce((acc, c) => acc + out[c], 0)
  out.dsa = Math.max(0, out.dsa + (100 - total))
  return out
}

/** Zero out categories that are not yet schedulable, then renormalize. */
function applySchedulablePolicy(mix: Mix): Mix {
  if (SYSTEM_DESIGN_ENABLED) return normalize100(mix)
  return normalize100({ ...mix, "system-design": 0 })
}

/** The research-recommended mix for a given profile (schedulable categories only). */
export function resolveResearchMix(
  level: ExperienceLevel,
  track: CompanyTrack | undefined,
  companyId: CompanyId
): Mix {
  const base = { ...(ROLE_MIX[roleBucket(level, track)] ?? ROLE_MIX["beginner:swe"]) }
  const group = groupOf(companyId)
  const delta = group ? GROUP_DELTA[group] : undefined

  const tilted: Mix = {
    dsa: base.dsa + (delta?.dsa ?? 0),
    bugfix: base.bugfix + (delta?.bugfix ?? 0),
    decomposition: base.decomposition + (delta?.decomposition ?? 0),
    "system-design": Math.min(
      base["system-design"] + (delta?.["system-design"] ?? 0),
      SD_CAP[level]
    ),
  }

  return applySchedulablePolicy(tilted)
}

/**
 * Resolve the user's creation choice into a concrete category mix.
 * - "dsa-only": 100% algorithms (classic grind).
 * - "custom": renormalize the research weights over the selected categories.
 * - "full" (default): the research-driven mix.
 */
export function resolveCategoryMix(input: {
  mixMode: RoadmapMixMode
  selectedCategories?: RoadmapCategory[]
  experienceLevel: ExperienceLevel
  targetTrack?: CompanyTrack
  companyId: CompanyId
}): RoadmapCategoryMix {
  const research = resolveResearchMix(input.experienceLevel, input.targetTrack, input.companyId)

  if (input.mixMode === "dsa-only") {
    return { mode: "dsa-only", weights: { ...emptyMix(), dsa: 100 }, source: "user-custom" }
  }

  if (input.mixMode === "custom") {
    const selected = (input.selectedCategories ?? []).filter((c) =>
      SCHEDULABLE_CATEGORIES.includes(c)
    )
    if (selected.length > 0) {
      const kept = emptyMix()
      // Ensure every explicitly selected category gets a nonzero share, even if
      // its research weight is 0.
      selected.forEach((c) => {
        kept[c] = Math.max(research[c], 1)
      })
      return {
        mode: "custom",
        weights: normalize100(kept),
        selectedCategories: selected,
        source: "user-custom",
      }
    }
  }

  return { mode: "full", weights: research, source: "research-default" }
}
