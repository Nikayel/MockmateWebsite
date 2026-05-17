import { NextResponse } from "next/server"
import { getSimilarProblems } from "@/lib/rag"

export async function handleGetSimilarProblems(params: {
  problemText: string
  problemId?: string
  difficulty?: string
  limit?: number
}) {
  const { problemText, problemId, difficulty, limit = 5 } = params

  if (!problemText) {
    return NextResponse.json({ error: "problemText is required" }, { status: 400 })
  }

  const similar = await getSimilarProblems(problemText, {
    limit,
    excludeProblemId: problemId,
    difficulty,
  })

  return NextResponse.json({
    similarProblems: similar.map((p) => ({
      text: p.text.substring(0, 200) + "...",
      similarity: Math.round(p.similarity * 100),
      metadata: p.metadata,
    })),
  })
}
