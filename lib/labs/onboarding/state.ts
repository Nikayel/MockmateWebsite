import type { LabOnboardingId } from "./ids"

/**
 * Increment this when a material onboarding update should replay for everyone.
 * Completion is keyed by both onboarding ID and version in Firestore.
 */
export const LAB_ONBOARDING_VERSION = "lab-onboarding-v1"

export interface LabOnboardingCompletion {
  onboardingId: LabOnboardingId
  version: typeof LAB_ONBOARDING_VERSION
  completedAt: string
}
