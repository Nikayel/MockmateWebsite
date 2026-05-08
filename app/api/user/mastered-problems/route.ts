import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { getMasteredProblems } from "@/lib/scoring"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get mastered problems
    const masteredProblems = await getMasteredProblems(userId)

    return NextResponse.json({
      problems: masteredProblems,
      count: masteredProblems.length,
    })
  } catch (error) {
    logger.error("Error fetching mastered problems", { error })
    return NextResponse.json({ error: "Failed to fetch mastered problems" }, { status: 500 })
  }
}
