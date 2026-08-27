import type { CompanyId, RoadmapCategory, RoadmapMixMode } from "@/lib/data/company-questions/types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

/**
 * The answers the roadmap wizard's skill-assessment step hands back. Canonical home of the
 * shape: `SkillAssessment` re-exports it, and `savePendingWizard` persists it, so the wizard
 * and the resume path can never drift apart.
 */
export interface AssessmentResult {
  experienceLevel: "intern" | "beginner" | "intermediate" | "advanced"
  targetTrack?: "swe" | "fdse"
  problemsSolved: number
  hoursPerDay: number
  patternFamiliarity: {
    pattern: DSAPattern
    level: "unknown" | "seen" | "practiced" | "confident"
  }[]
  mixMode: RoadmapMixMode
  selectedCategories?: RoadmapCategory[]
}

/** A finished wizard walk that could not generate yet: everything `/api/roadmap` needs. */
export interface PendingWizard {
  companyId: CompanyId
  /** ISO string, because this crosses JSON. */
  interviewDate: string
  result: AssessmentResult
}

interface StoredEnvelope {
  version: number
  savedAt: number
  wizard: PendingWizard
}

const STORAGE_KEY = "cs-pending-roadmap-wizard"
const VERSION = 1

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
 * version, or structurally broken is removed and reported as absent. The checks below are
 * crash-safety for JSON that this module wrote; they are not a trust boundary, because
 * `/api/roadmap` re-validates everything server-side.
 */
export function loadPendingWizard(now: number = Date.now()): PendingWizard | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const envelope = JSON.parse(raw) as Partial<StoredEnvelope>
    const wizard = envelope?.wizard
    const intact =
      envelope?.version === VERSION &&
      typeof envelope.savedAt === "number" &&
      now - envelope.savedAt <= PENDING_WIZARD_TTL_MS &&
      typeof wizard?.companyId === "string" &&
      wizard.companyId.length > 0 &&
      typeof wizard.interviewDate === "string" &&
      !Number.isNaN(new Date(wizard.interviewDate).getTime()) &&
      typeof wizard.result === "object" &&
      wizard.result !== null &&
      typeof wizard.result.experienceLevel === "string" &&
      typeof wizard.result.mixMode === "string" &&
      typeof wizard.result.problemsSolved === "number" &&
      typeof wizard.result.hoursPerDay === "number" &&
      Array.isArray(wizard.result.patternFamiliarity)

    if (!intact) {
      clearPendingWizard()
      return null
    }
    return wizard as PendingWizard
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
