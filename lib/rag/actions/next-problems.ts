import { NextResponse } from "next/server"
import { getRecommendedNextProblems } from "@/lib/rag"

export async function handleGetNextProblems(params: {
  userId: string
  currentProblemText: string
  currentProblemId?: string
}) {
  const { userId, currentProblemText, currentProblemId } = params

  if (!userId || !currentProblemText) {
    return NextResponse.json(
      { error: "userId and currentProblemText are required" },
      { status: 400 }
    )
  }

  const recommendations = await getRecommendedNextProblems(
    userId,
    currentProblemText,
    currentProblemId
  )

  return NextResponse.json({
    recommendations: recommendations.map((problem) => ({
      problemId: problem.metadata?.problemId,
      title: problem.metadata?.title || "Unknown Problem",
      text: problem.text.substring(0, 200) + "...",
      similarity: Math.round(problem.similarity * 100),
      difficulty: problem.metadata?.difficulty || "medium",
      type: problem.metadata?.type || "dsa",
    })),
    message:
      recommendations.length > 0
        ? `Found ${recommendations.length} similar problems you haven't solved yet!`
        : "No similar unsolved problems found. Try something new!",
  })
}
