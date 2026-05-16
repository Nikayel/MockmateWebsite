import { NextResponse } from "next/server"
import { embedAndStoreSolution } from "@/lib/rag"

export async function handleStoreSolution(params: {
  userId: string
  problemId: string
  problemTitle: string
  solutionCode: string
  language: string
  passed: boolean
  score: number
  problemType?: string
}) {
  const { userId, problemId, problemTitle, solutionCode, language, passed, score, problemType } =
    params

  if (!userId || !problemId || !solutionCode) {
    return NextResponse.json(
      { error: "userId, problemId, and solutionCode are required" },
      { status: 400 }
    )
  }

  const isSystemDesign = problemType === "system-design"
  if (!isSystemDesign && !solutionCode.trim()) {
    return NextResponse.json(
      { error: "solutionCode cannot be empty for non-system-design problems" },
      { status: 400 }
    )
  }

  const embeddingId = await embedAndStoreSolution(userId, problemId, solutionCode, {
    problemTitle,
    language: isSystemDesign ? "notes" : language,
    passed,
    score,
    problemType,
  })

  return NextResponse.json({
    success: true,
    embeddingId,
    message: isSystemDesign
      ? "Design notes stored for future reference"
      : "Solution stored for future reference",
  })
}
