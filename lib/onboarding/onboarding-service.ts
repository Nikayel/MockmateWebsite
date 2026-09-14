import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ProfilePersonalizationData } from "./profile-personalization"

/**
 * Store onboarding data as embeddings for RAG (non-blocking)
 *
 * @param userId - User ID
 * @param data - Onboarding data
 */
export async function storeOnboardingEmbedding(
  userId: string,
  data: Pick<ProfilePersonalizationData, "role" | "goal" | "targetCompany">
): Promise<void> {
  try {
    await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "store-onboarding",
        userId,
        role: data.role,
        goal: data.goal,
        targetCompany: data.targetCompany,
      }),
    })
  } catch (error) {
    console.error("Failed to store onboarding embedding (non-blocking):", error)
  }
}

/**
 * Record the lightweight first-run arrival without starting an embedding or
 * spaced-repetition write. Those systems need real preference data, not a
 * guessed answer from a welcome screen.
 */
export async function completeInitialOnboarding(userId: string): Promise<void> {
  await setDoc(
    doc(db, "profiles", userId),
    {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  )
}

/** Save the preference signal collected after a user's first completed session. */
export async function completeProfilePersonalization(
  userId: string,
  data: ProfilePersonalizationData
): Promise<void> {
  const now = new Date().toISOString()

  await setDoc(
    doc(db, "profiles", userId),
    {
      role: data.role,
      goal: data.goal,
      target_company: data.targetCompany || null,
      interview_timeline: data.interviewTimeline,
      weekly_goal: data.weeklyGoal,
      onboarding_completed: true,
      profile_calibration_completed: true,
      profile_calibration_completed_at: now,
      updated_at: now,
    },
    { merge: true }
  )

  // The profile write is the completion boundary. Embedding enrichment is
  // useful, but it should not keep the confirmation button spinning.
  void storeOnboardingEmbedding(userId, data)
}
