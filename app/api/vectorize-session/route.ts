import { NextRequest, NextResponse } from "next/server"
import {
  vectorizeSessionMetrics,
  extractCodeFeatures,
  vectorizeCodeFeatures,
  storeSessionVector,
  updateUserPerformanceProfile,
  type SessionVector,
  type SessionMetrics,
} from "@/lib/rag"

/**
 * API endpoint to vectorize and store session data for RAG
 * Called after interview completion to build the user's performance profile
 */
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      sessionId,
      scenarioId,
      scenarioTitle,
      language,
      code,
      testResults,
      timeSpent,
      aiCollaborationMetrics,
      interactionMetrics,
      efficiencyMetrics,
      scores,
    } = await request.json()

    if (!userId || !sessionId || !scenarioId) {
      return NextResponse.json(
        { error: "userId, sessionId, and scenarioId are required" },
        { status: 400 }
      )
    }

    // Build session metrics from the provided data
    const testsPassed = testResults?.filter((t: any) => t.passed).length || 0
    const testsTotal = testResults?.length || 0

    const sessionMetrics: Partial<SessionMetrics> = {
      timeSpentSeconds: timeSpent || 0,
      timeToFirstCode: 0, // Not tracked yet - can be added later
      timeBetweenMessages: [], // Not tracked yet

      // Collaboration metrics
      interviewerMessagesSent: interactionMetrics?.interviewerQuestionsAnswered || 0,
      interviewerMessagesReceived: 0, // Would need to track AI messages to user
      partnerMessagesSent: aiCollaborationMetrics?.partnerMessagesSent || 0,
      partnerMessagesReceived: aiCollaborationMetrics?.partnerMessagesReceived || 0,
      hintsRevealed: aiCollaborationMetrics?.partnerHintsRequested || 0,
      hintsTotal: 3, // Assuming 3 hints per problem on average

      // Test metrics
      testsPassed,
      testsTotal,
      testsRunCount: 1, // At least one test run at completion

      // Code metrics
      linesOfCode: efficiencyMetrics?.linesOfCode || 0,
      codeChangesCount: 1, // Not tracked yet
      finalCodeLength: code?.length || 0,

      // Efficiency metrics
      codeEfficiencyScore: efficiencyMetrics?.efficiencyScore || 50,
      timeComplexityScore: getComplexityScore(
        efficiencyMetrics?.estimatedTimeComplexity,
        efficiencyMetrics?.optimalTimeComplexity
      ),
      spaceComplexityScore: getComplexityScore(
        efficiencyMetrics?.estimatedSpaceComplexity,
        efficiencyMetrics?.optimalSpaceComplexity
      ),

      // Problem context
      problemDifficulty: interactionMetrics?.problemDifficulty || 'medium',
      problemType: interactionMetrics?.problemType || 'dsa',

      // Final scores
      correctnessScore: scores?.correctness || (testsPassed / testsTotal) * 100,
      overallScore: scores?.overall || 50,
    }

    // Vectorize session metrics
    const metricsVector = vectorizeSessionMetrics(sessionMetrics)

    // Extract and vectorize code features
    const codeFeatures = extractCodeFeatures(code || '', language || 'javascript')
    const codeVector = vectorizeCodeFeatures(codeFeatures)

    // Combine vectors (metrics + code features)
    const combinedVector = [...metricsVector, ...codeVector]

    // Build session vector object
    const sessionVector: SessionVector = {
      userId,
      sessionId,
      scenarioId,
      scenarioTitle: scenarioTitle || 'Unknown Problem',
      timestamp: new Date(),
      vector: combinedVector,
      scores: {
        correctness: scores?.correctness || 0,
        efficiency: scores?.efficiency || 0,
        codeQuality: scores?.codeQuality || 0,
        reasoning: scores?.reasoningExplanation || 0,
        collaboration: scores?.aiCollaboration || 0,
        overall: scores?.overall || 0,
      },
      metadata: {
        difficulty: sessionMetrics.problemDifficulty || 'medium',
        type: sessionMetrics.problemType || 'dsa',
        language: language || 'javascript',
        duration: timeSpent || 0,
      },
    }

    // Store session vector
    const vectorId = await storeSessionVector(sessionVector)

    // Update user's performance profile
    await updateUserPerformanceProfile(userId, sessionVector)

    return NextResponse.json({
      success: true,
      vectorId,
      vectorDimensions: combinedVector.length,
      message: "Session vectorized and stored successfully",
    })
  } catch (error) {
    console.error("Vectorization error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to vectorize session" },
      { status: 500 }
    )
  }
}

/**
 * Helper to calculate complexity score (0-100) based on match with optimal
 */
function getComplexityScore(estimated?: string, optimal?: string): number {
  if (!estimated || !optimal) return 50

  // If they match, full score
  if (estimated === optimal) return 100

  // Complexity rankings (lower index = better)
  const complexityRanking = [
    'O(1)',
    'O(log n)',
    'O(n)',
    'O(n log n)',
    'O(n²)',
    'O(n³)',
    'O(2^n)',
    'O(n!)',
  ]

  const estimatedIdx = complexityRanking.indexOf(estimated)
  const optimalIdx = complexityRanking.indexOf(optimal)

  if (estimatedIdx === -1 || optimalIdx === -1) return 50

  // Calculate score based on how far off they are
  const diff = estimatedIdx - optimalIdx

  if (diff === 0) return 100
  if (diff === 1) return 80 // One step worse
  if (diff === 2) return 60 // Two steps worse
  if (diff >= 3) return 40 // Three or more steps worse
  if (diff === -1) return 90 // One step better (overoptimized, still good)
  return 70 // Better than optimal (unlikely but possible)
}
