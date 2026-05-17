import { NextResponse } from "next/server"
import { getSimilarSolutions } from "@/lib/rag"

export async function handleGetSimilarSolutions(params: {
  userId: string
  problemText: string
  limit?: number
  problemType?: string
}) {
  const { userId, problemText, limit = 5, problemType } = params

  if (!userId || !problemText) {
    return NextResponse.json({ error: "userId and problemText are required" }, { status: 400 })
  }

  const similar = await getSimilarSolutions(problemText, userId, { limit, problemType })

  return NextResponse.json({
    similarSolutions: similar.map((s) => ({
      code: s.text,
      similarity: Math.round(s.similarity * 100),
      metadata: {
        problemId: s.metadata?.problemId,
        problemTitle: s.metadata?.problemTitle,
        language: s.metadata?.language,
        passed: s.metadata?.passed,
        score: s.metadata?.score,
        problemType: s.metadata?.problemType,
        tags: s.metadata?.tags,
      },
    })),
    message:
      similar.length > 0
        ? `Found ${similar.length} similar ${problemType === "system-design" ? "design" : "problem"}${similar.length > 1 ? "s" : ""} you've worked on before!`
        : `No similar past ${problemType === "system-design" ? "designs" : "solutions"} found. This is a new type of problem for you!`,
  })
}
