/**
 * Company-Specific Time Limits
 *
 * Defines time limits per question for companies that have strict time expectations.
 * This is used by both the CompanyPicker and InterviewTimer components.
 *
 * DRY Principle: Single source of truth for time limit configuration.
 */

import type { CompanyId } from "@/lib/data/company-questions/types"

/**
 * Configuration for a company's strict time limit
 */
export interface StrictTimeConfig {
  /** Time limit in seconds per question */
  seconds: number
  /** Human-readable explanation for the tooltip */
  reason: string
}

/**
 * Companies with strict time limits per question
 *
 * Add new companies here as needed. The key is the CompanyId (lowercase).
 */
export const STRICT_TIME_COMPANIES: Partial<Record<CompanyId, StrictTimeConfig>> = {
  meta: {
    seconds: 25 * 60, // 25 minutes
    reason:
      "Meta gives 45 minutes for 2 coding questions, so ~22-25 min each. They are strict about time.",
  },
  // Future: Add more companies with strict time limits
  // google: {
  //   seconds: 30 * 60, // 30 minutes
  //   reason: "Google allocates ~45 minutes for one coding question with follow-ups.",
  // },
}

/**
 * Get the strict time config for a company
 * @returns The config if the company has a strict time limit, null otherwise
 */
export function getStrictTimeConfig(companyId: CompanyId | string | null): StrictTimeConfig | null {
  if (!companyId) return null
  const id = companyId.toLowerCase() as CompanyId
  return STRICT_TIME_COMPANIES[id] ?? null
}

/**
 * Check if a company has strict time limits
 */
export function hasStrictTimeLimit(companyId: CompanyId | string | null): boolean {
  return getStrictTimeConfig(companyId) !== null
}

/**
 * Get the time limit in minutes for display
 */
export function getStrictTimeLimitMinutes(companyId: CompanyId | string | null): number | null {
  const config = getStrictTimeConfig(companyId)
  return config ? Math.floor(config.seconds / 60) : null
}
