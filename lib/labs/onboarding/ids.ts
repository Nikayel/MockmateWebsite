/**
 * Stable identifiers for persisted Lab onboarding progress.
 *
 * These IDs are stored in Firestore, so they intentionally describe the
 * experience rather than the component that renders it. Bumping the version in
 * `state.ts` can replay an updated experience without changing historical IDs.
 */

export const LAB_ONBOARDING_IDS = {
  MERIDIAN: "meridian",
} as const

export type LabOnboardingId =
  | (typeof LAB_ONBOARDING_IDS)[keyof typeof LAB_ONBOARDING_IDS]
  | `case-lab:${string}`

const CASE_LAB_ID_PATTERN = /^case-lab:[a-z0-9-]+$/

export function isLabOnboardingId(value: unknown): value is LabOnboardingId {
  return (
    value === LAB_ONBOARDING_IDS.MERIDIAN ||
    (typeof value === "string" && CASE_LAB_ID_PATTERN.test(value))
  )
}

/** Only Meridian has a Sprint Lab onboarding experience today. */
export function getSprintLabOnboardingId(workbookId: string): LabOnboardingId | null {
  return workbookId === LAB_ONBOARDING_IDS.MERIDIAN ? LAB_ONBOARDING_IDS.MERIDIAN : null
}
