import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Onboarding data interface
 */
export interface OnboardingData {
  role: string
  goal: string
  targetCompany?: string | null
  dailyGoal: number
}

/**
 * Save user onboarding preferences to Firestore
 *
 * @param userId - User ID
 * @param data - Onboarding data (role, goal, targetCompany, dailyGoal)
 * @returns Promise that resolves when save is complete
 */
export async function saveOnboardingPreferences(
  userId: string,
  data: OnboardingData
): Promise<void> {
  const profileRef = doc(db, "profiles", userId)

  await setDoc(
    profileRef,
    {
      role: data.role,
      goal: data.goal,
      target_company: data.targetCompany,
      daily_goal: data.dailyGoal,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  )
}

/**
 * Store onboarding data as embeddings for RAG (non-blocking)
 *
 * @param userId - User ID
 * @param data - Onboarding data
 */
export async function storeOnboardingEmbedding(
  userId: string,
  data: OnboardingData
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
        dailyGoal: data.dailyGoal,
      }),
    })
  } catch (error) {
    console.error("Failed to store onboarding embedding (non-blocking):", error)
  }
}

/**
 * Update user's daily goal in spaced repetition system (non-blocking)
 *
 * @param userId - User ID
 * @param dailyGoal - Daily goal count
 */
export async function updateDailyGoal(
  userId: string,
  dailyGoal: number
): Promise<void> {
  try {
    await fetch("/api/spaced-repetition/stats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        daily_goal: dailyGoal,
      }),
    })
  } catch (error) {
    console.error("Failed to update daily goal (non-blocking):", error)
  }
}

/**
 * Complete onboarding flow: save preferences and update related systems
 *
 * @param userId - User ID
 * @param data - Onboarding data
 * @returns Promise that resolves when all operations complete
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingData
): Promise<void> {
  // Save to Firestore (blocking)
  await saveOnboardingPreferences(userId, data)

  // Non-blocking operations
  await Promise.allSettled([
    storeOnboardingEmbedding(userId, data),
    updateDailyGoal(userId, data.dailyGoal),
  ])
}
