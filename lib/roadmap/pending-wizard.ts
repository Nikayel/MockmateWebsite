import { z } from "zod"

import type { CompanyId, RoadmapCategory, RoadmapMixMode } from "@/lib/data/company-questions/types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

// The pattern id gets only a string check here. The strict membership validator
// (DSAPatternSchema) lives in lib/validations/api-schemas.ts, which imports
// next/server and has no business in this client-bundled module; `/api/roadmap`
// re-validates membership server-side on every replay anyway.
const dsaPatternSchema = z.custom<DSAPattern>((value) => typeof value === "string")

// Same trade for the company id: presence here, catalog membership at the two
// places that act on it (the resume guard's getCompanyById check, the API).
const companyIdSchema = z.custom<CompanyId>(
  (value) => typeof value === "string" && value.length > 0
)

/**
 * The answers the roadmap wizard's skill-assessment step hands back. Canonical home of the
 * shape: `SkillAssessment` re-exports it, and `savePendingWizard` persists it, so the wizard
 * and the resume path can never drift apart. The type is derived from the schema below for
 * the same reason: the validator IS the shape, so the two cannot disagree.
 */
const assessmentResultSchema = z.object({
  experienceLevel: z.enum(["intern", "beginner", "intermediate", "advanced"]),
  targetTrack: z.enum(["swe", "fdse"]).optional(),
  problemsSolved: z.number(),
  hoursPerDay: z.number(),
  patternFamiliarity: z.array(
    z.object({
      pattern: dsaPatternSchema,
      level: z.enum(["unknown", "seen", "practiced", "confident"]),
    })
  ),
  mixMode: z.enum(["full", "dsa-only", "custom"]) satisfies z.ZodType<RoadmapMixMode>,
  selectedCategories: z
    .array(
      z.enum([
        "dsa",
        "bugfix",
        "decomposition",
        "system-design",
      ]) satisfies z.ZodType<RoadmapCategory>
    )
    .optional(),
})

export type AssessmentResult = z.infer<typeof assessmentResultSchema>

/** A finished wizard walk that could not generate yet: everything `/api/roadmap` needs. */
const pendingWizardSchema = z.object({
  companyId: companyIdSchema,
  /** ISO string, because this crosses JSON. */
  interviewDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Unparseable interview date"),
  result: assessmentResultSchema,
})

export type PendingWizard = z.infer<typeof pendingWizardSchema>

const STORAGE_KEY = "cs-pending-roadmap-wizard"
const VERSION = 1

const storedEnvelopeSchema = z.object({
  version: z.literal(VERSION),
  savedAt: z.number(),
  wizard: pendingWizardSchema,
})

type StoredEnvelope = z.infer<typeof storedEnvelopeSchema>

/**
 * An hour: long enough for the sign-in or upgrade round trip the save exists for, short
 * enough that a weeks-old walk never resurrects itself and generates a surprise roadmap.
 */
export const PENDING_WIZARD_TTL_MS = 60 * 60 * 1000

/**
 * Remember a finished wizard walk across a full-page round trip (sign-in, upgrade), in
 * sessionStorage so it stays in this tab and dies with it. Best effort: storage being
 * unavailable only costs the visitor a re-walk, so failures are swallowed.
 */
export function savePendingWizard(wizard: PendingWizard, now: number = Date.now()): void {
  if (typeof window === "undefined") return
  try {
    const envelope: StoredEnvelope = { version: VERSION, savedAt: now, wizard }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    // Quota or privacy mode. Losing the resume is acceptable; breaking the wizard is not.
  }
}

/**
 * The saved walk, or null when there is none worth resuming. Anything expired, from another
 * version, or structurally broken is removed and reported as absent. The schema parse is
 * crash-safety for JSON that this module wrote; it is not a trust boundary, because
 * `/api/roadmap` re-validates everything server-side.
 */
export function loadPendingWizard(now: number = Date.now()): PendingWizard | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = storedEnvelopeSchema.safeParse(JSON.parse(raw))
    if (!parsed.success || now - parsed.data.savedAt > PENDING_WIZARD_TTL_MS) {
      clearPendingWizard()
      return null
    }
    return parsed.data.wizard
  } catch {
    clearPendingWizard()
    return null
  }
}

export function clearPendingWizard(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do: if storage is unreachable, there is nothing stored to clear either.
  }
}
