import { NextResponse } from "next/server"
import { embedAndStoreOnboarding } from "@/lib/rag"

export async function handleStoreOnboarding(params: {
  userId: string
  role: string
  goal: string
}) {
  const { userId, role, goal } = params

  if (!userId || !role || !goal) {
    return NextResponse.json({ error: "userId, role, and goal are required" }, { status: 400 })
  }

  const embeddingId = await embedAndStoreOnboarding(userId, role, goal)

  return NextResponse.json({
    success: true,
    embeddingId,
    message: "Onboarding data stored for personalized recommendations",
  })
}
