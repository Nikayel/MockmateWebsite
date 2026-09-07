import { adminDb } from "@/lib/firebase-admin"

import type { LabOnboardingId } from "./ids"
import { LAB_ONBOARDING_VERSION, type LabOnboardingCompletion } from "./state"

const COLLECTION_NAME = "lab_onboarding"

function completionRef(userId: string, onboardingId: LabOnboardingId) {
  if (!adminDb) {
    throw new Error("Firestore admin client is unavailable")
  }

  return adminDb.collection("profiles").doc(userId).collection(COLLECTION_NAME).doc(onboardingId)
}

/** Read whether this user completed the current version of a Lab onboarding. */
export async function hasCompletedLabOnboarding(
  userId: string,
  onboardingId: LabOnboardingId
): Promise<boolean> {
  const completion = await completionRef(userId, onboardingId).get()
  return completion.data()?.version === LAB_ONBOARDING_VERSION
}

/**
 * Record a completed or skipped Lab onboarding for one user.
 *
 * A single document per onboarding keeps unrelated Lab experiences independent
 * and avoids coupling cosmetic progress to the primary profile document shape.
 */
export async function completeLabOnboarding(
  userId: string,
  onboardingId: LabOnboardingId
): Promise<LabOnboardingCompletion> {
  const completion: LabOnboardingCompletion = {
    onboardingId,
    version: LAB_ONBOARDING_VERSION,
    completedAt: new Date().toISOString(),
  }

  await completionRef(userId, onboardingId).set(completion)
  return completion
}
