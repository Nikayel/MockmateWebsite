import type { TextEmbedding } from "../types"
import { generateTrackedEmbedding } from "./embeddings"
import { storeTextEmbedding } from "./storage"

export async function embedAndStoreOnboarding(
  userId: string,
  role: string,
  goal: string
): Promise<string> {
  const onboardingText = `User profile: ${role} engineer with goal of ${goal}`
  const vector = await generateTrackedEmbedding(onboardingText, userId)

  const embedding: TextEmbedding = {
    text: onboardingText,
    type: "onboarding",
    vector,
    metadata: {
      userId,
      user_id: userId,
      role,
      goal,
      tags: [role, goal],
      timestamp: new Date().toISOString(),
    },
  }

  return storeTextEmbedding(embedding)
}
