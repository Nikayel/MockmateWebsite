/**
 * Feedback Process API - Background job processor for rich feedback
 *
 * This endpoint processes pending feedback jobs. It can be:
 * 1. Called directly after instant feedback (fire-and-forget)
 * 2. Called by a cron job to process queued jobs
 * 3. Called manually to retry failed jobs
 *
 * The heavy AI operations happen here, not in the user-facing request.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { generateFeedbackResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { FeedbackScores, StructuredFeedback } from "@/lib/feedback"
import {
  preScreenConversation,
  validateConversationWithAI,
  getDefaultValidation,
  analyzeAICodeOverlap,
  analyzeCodeCompleteness,
  isBlankDesignTemplate,
  calculateValidatedScores,
  applyScoreFloors,
  critiqueScores,
  parseFeedbackSections,
  injectScoresIntoFeedback,
  sanitizeFeedbackForScoreConsistency,
  buildSilentNotesContext,
} from "@/lib/feedback"
import {
  extractConversationEvidence,
  buildEvidenceSummary,
} from "@/lib/feedback/structured-extraction"
import { analyzeTranscriptForMistakes } from "@/lib/feedback/transcript-analysis"

// Vercel Pro allows up to 5 minutes for background functions
export const maxDuration = 300

interface ProcessRequest {
  jobId?: string // Process specific job
  processAll?: boolean // Process all pending jobs
  limit?: number // Max jobs to process
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: ProcessRequest = await request.json()
    const { jobId, processAll = false, limit = 5 } = body

    // Get jobs to process
    let jobs: FirebaseFirestore.QueryDocumentSnapshot[] = []

    if (jobId) {
      // Process specific job
      const jobDoc = await adminDb.collection("feedback_jobs").doc(jobId).get()
      if (jobDoc.exists && ["pending", "failed"].includes(jobDoc.data()?.status)) {
        jobs = [jobDoc as FirebaseFirestore.QueryDocumentSnapshot]
      }
    } else if (processAll) {
      // Process pending jobs
      const snapshot = await adminDb
        .collection("feedback_jobs")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .limit(limit)
        .get()
      jobs = snapshot.docs
    }

    if (jobs.length === 0) {
      return NextResponse.json({ message: "No jobs to process", processed: 0 })
    }

    logger.info("[Feedback Process] Starting batch", {
      jobCount: jobs.length,
      firstJob: jobs[0]?.id,
    })

    const results: Array<{ jobId: string; status: "complete" | "failed"; error?: string }> = []

    // Process jobs sequentially to avoid overloading AI providers
    for (const jobDoc of jobs) {
      const job = jobDoc.data()
      const currentJobId = jobDoc.id

      try {
        // Mark as processing
        await adminDb.collection("feedback_jobs").doc(currentJobId).update({
          status: "processing",
          startedAt: FieldValue.serverTimestamp(),
          progress: 0,
        })

        // Process the job
        const result = await processJob(currentJobId, job)

        // Mark as complete
        await adminDb.collection("feedback_jobs").doc(currentJobId).update({
          status: "complete",
          completedAt: FieldValue.serverTimestamp(),
          output: result,
          progress: 100,
        })

        // Update the interview session with final feedback
        await adminDb
          .collection("interview_sessions")
          .doc(job.sessionId)
          .update({
            feedback_status: "complete",
            feedback: result.feedback,
            performance_score: result.scores.overall,
            technical_score: result.technicalScore,
            score_breakdown: {
              understandingScore: result.scores.understanding,
              problemSolvingScore: result.scores.problemSolving,
              codeQualityScore: result.scores.codeQuality,
              communicationScore: result.scores.communication,
              overallScore: result.scores.overall,
            },
            structured_feedback: result.structured,
            updated_at: FieldValue.serverTimestamp(),
          })

        results.push({ jobId: currentJobId, status: "complete" })

        logger.info("[Feedback Process] Job completed", {
          jobId: currentJobId,
          sessionId: job.sessionId,
          overallScore: result.scores.overall,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        // Mark as failed
        await adminDb.collection("feedback_jobs").doc(currentJobId).update({
          status: "failed",
          error: errorMessage,
          failedAt: FieldValue.serverTimestamp(),
        })

        results.push({ jobId: currentJobId, status: "failed", error: errorMessage })

        logger.error("[Feedback Process] Job failed", {
          jobId: currentJobId,
          error: errorMessage,
        })
      }
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      processed: results.length,
      results,
      totalTimeMs: totalTime,
    })
  } catch (error) {
    logger.error("[Feedback Process] Batch error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Process a single feedback job - this is where the heavy AI work happens
 */
async function processJob(
  jobId: string,
  job: FirebaseFirestore.DocumentData
): Promise<{
  feedback: string
  scores: FeedbackScores
  technicalScore: number
  structured: StructuredFeedback
  constitutionalAICritique?: Record<string, unknown>
}> {
  const input = job.input
  const {
    code,
    language,
    scenarioTitle,
    scenarioType,
    scenarioId,
    scenarioDifficulty,
    testsPassed,
    testsTotal,
    efficiencyScore,
    conversationTranscript,
    partnerMessages,
    efficiencyMetrics,
    silentNotes,
  } = input

  // Update progress
  const updateProgress = async (progress: number) => {
    await adminDb.collection("feedback_jobs").doc(jobId).update({ progress })
  }

  // ========================================
  // PHASE 1: Pre-processing (10%)
  // ========================================
  await updateProgress(10)

  const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0
  const preScreen = preScreenConversation(conversationTranscript)
  const aiCodeOverlap = analyzeAICodeOverlap(code, partnerMessages)
  const hasBlindCopying = aiCodeOverlap.hasHighOverlap && !aiCodeOverlap.modificationsMade

  // Prepare transcript messages
  const transcriptMessages =
    conversationTranscript && Array.isArray(conversationTranscript)
      ? conversationTranscript.map(
          (msg: { type?: string; role?: string; message?: string; content?: string }) => ({
            role:
              msg.type === "user" || msg.role === "user" || msg.role === "candidate"
                ? ("user" as const)
                : ("interviewer" as const),
            content: msg.message || msg.content || "",
          })
        )
      : []

  // ========================================
  // PHASE 2: AI Validation & Extraction (40%)
  // ========================================
  await updateProgress(20)

  // Run AI operations in parallel
  const shouldValidateWithAI =
    scenarioType === "system-design"
      ? true
      : preScreen.hasContent &&
        !preScreen.suspiciousPatterns.possibleGibberish &&
        preScreen.candidateMessageCount >= 1

  const [aiValidation, extractedEvidence] = await Promise.all([
    shouldValidateWithAI
      ? validateConversationWithAI(
          conversationTranscript,
          code,
          efficiencyMetrics
            ? {
                time: efficiencyMetrics.estimatedTimeComplexity,
                space: efficiencyMetrics.estimatedSpaceComplexity,
              }
            : null
        ).catch(() => getDefaultValidation())
      : Promise.resolve(getDefaultValidation()),
    transcriptMessages.length > 0
      ? extractConversationEvidence(transcriptMessages, {
          title: scenarioTitle,
          optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
          optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
          criticalEdgeCases: ["empty input", "single element", "null values"],
        }).catch(() => undefined)
      : Promise.resolve(undefined),
  ])

  await updateProgress(40)

  // Reconcile evidence sources
  if (extractedEvidence) {
    if (extractedEvidence.approach.explained && extractedEvidence.approach.quote) {
      aiValidation.approachExplained = true
      aiValidation.approachQuality =
        aiValidation.approachQuality === "none" ? "basic" : aiValidation.approachQuality
    }
    if (extractedEvidence.timeComplexity.mentioned) {
      aiValidation.complexityDiscussed = true
      if (extractedEvidence.timeComplexity.value) {
        aiValidation.complexityAccurate = extractedEvidence.timeComplexity.isCorrect ?? false
        aiValidation.statedComplexity = extractedEvidence.timeComplexity.value
      }
    }
    if (extractedEvidence.edgeCases.mentionedByCandidate.length > 0) {
      aiValidation.edgeCasesConsidered = true
    }
  }

  // ========================================
  // PHASE 3: Score Calculation (50%)
  // ========================================
  await updateProgress(50)

  // Calculate validated scores
  const validatedScores = calculateValidatedScores(
    passRate,
    efficiencyMetrics,
    preScreen,
    aiValidation,
    scenarioType,
    code,
    extractedEvidence
  )

  // Apply AI copying penalty
  if (hasBlindCopying && scenarioType !== "system-design") {
    validatedScores.understanding = Math.min(
      validatedScores.understanding,
      Math.max(30, validatedScores.understanding - 25)
    )
  }

  // Apply score floors
  const algorithmicScores = applyScoreFloors(
    validatedScores,
    passRate,
    efficiencyMetrics?.efficiencyScore,
    aiValidation
  )

  // ========================================
  // PHASE 4: Constitutional AI Critique (60%)
  // ========================================
  await updateProgress(60)

  const scoreCritique = await critiqueScores(algorithmicScores, {
    passRate,
    scenarioType: scenarioType || "dsa",
    aiValidation,
    codeCompleteness: code ? analyzeCodeCompleteness(code, language || "python") : undefined,
    hasBlindCopying,
    extractedEvidence,
    problemContext: {
      title: scenarioTitle,
      optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
      optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
    },
    conversationTranscript: conversationTranscript?.map(
      (msg: { type?: string; role?: string; message?: string; content?: string }) => ({
        role: msg.type === "user" || msg.role === "user" ? "candidate" : "interviewer",
        content: msg.message || msg.content || "",
      })
    ),
  })

  const finalScores =
    scoreCritique.madeChanges && scoreCritique.adjustedScores
      ? scoreCritique.adjustedScores
      : algorithmicScores

  // ========================================
  // PHASE 5: Transcript Analysis (70%)
  // ========================================
  await updateProgress(70)

  let analyzedSilentNotes = silentNotes || []
  if (transcriptMessages.length > 0 && scenarioType !== "system-design") {
    try {
      const analysisResult = await analyzeTranscriptForMistakes(
        transcriptMessages,
        {
          title: scenarioTitle,
          optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
          optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
          criticalEdgeCases: ["empty input", "single element", "null/undefined values"],
          scenarioType,
        },
        extractedEvidence
      )

      if (analysisResult.silentNotes.length > 0) {
        const existingKeys = new Set(
          analyzedSilentNotes.map(
            (n: { type: string; context?: string }) => `${n.type}:${n.context || ""}`
          )
        )
        const newNotes = analysisResult.silentNotes.filter(
          (n) => !existingKeys.has(`${n.type}:${n.context || ""}`)
        )
        analyzedSilentNotes = [...analyzedSilentNotes, ...newNotes]
      }
    } catch {
      // Continue with existing notes
    }
  }

  // ========================================
  // PHASE 6: Generate AI Feedback (90%)
  // ========================================
  await updateProgress(80)

  // Build prompt (simplified version - full version in generate-feedback)
  const systemInstruction = buildSystemInstruction(scenarioType)
  const prompt = buildPrompt({
    scenarioTitle,
    scenarioType,
    passRate,
    finalScores,
    aiValidation: aiValidation as unknown as Record<string, unknown>,
    extractedEvidence: extractedEvidence as unknown as Record<string, unknown> | undefined,
    analyzedSilentNotes,
    code,
    language,
    efficiencyMetrics,
    testsPassed,
    testsTotal,
  })

  const aiResponse = await generateFeedbackResponse(systemInstruction, prompt, [], {
    userId: job.userId,
    sessionId: job.sessionId,
    scenarioId,
  })

  await updateProgress(90)

  // ========================================
  // PHASE 7: Post-processing (100%)
  // ========================================
  const rawFeedback = aiResponse.text

  // Inject authoritative scores
  const feedbackWithScores = injectScoresIntoFeedback(rawFeedback, finalScores, scenarioType)

  // Sanitize for consistency
  const finalFeedback = sanitizeFeedbackForScoreConsistency(feedbackWithScores, finalScores, {
    approachExplained: extractedEvidence?.approach.explained ?? aiValidation.approachExplained,
    complexityDiscussed:
      extractedEvidence?.timeComplexity.mentioned ?? aiValidation.complexityDiscussed,
  })

  // Build structured response
  const sections = parseFeedbackSections(finalFeedback)

  const scores: FeedbackScores = {
    understanding: finalScores.understanding,
    problemSolving: finalScores.problemSolving,
    codeQuality: finalScores.codeQuality,
    communication: finalScores.communication,
    correctness: finalScores.codeQuality,
    efficiency: efficiencyMetrics?.efficiencyScore || 50,
    reasoningExplanation: finalScores.communication,
    aiCollaboration: 50,
    overall: finalScores.overall,
  }

  const structured: StructuredFeedback = {
    scores,
    tldr: sections.tldr || "Feedback generated successfully.",
    whatWorked: sections.whatWorked || [],
    fixNext: sections.fixNext || [],
    actionPlan: sections.actionPlan || [],
    aiWatchlist: sections.aiWatchlist || "",
    rawFeedback: finalFeedback,
  }

  // Calculate technical score (same as instant)
  const technicalScore = Math.round(
    (finalScores.understanding + finalScores.problemSolving + finalScores.codeQuality) / 3
  )

  return {
    feedback: finalFeedback,
    scores,
    technicalScore,
    structured,
    ...(scoreCritique.madeChanges
      ? {
          constitutionalAICritique: {
            critiques: scoreCritique.critiques,
            reasoning: scoreCritique.reasoning,
            originalScores: algorithmicScores,
            adjustedScores: scoreCritique.adjustedScores,
          },
        }
      : {}),
  }
}

function buildSystemInstruction(scenarioType: string): string {
  const baseRules = `
IMPORTANT: Scores are PRE-CALCULATED. Just reference them in your feedback. Focus on actionable narrative.

RULES:
- ~200 words max. Be concise.
- Focus on actionable improvements.
- Reference the conversation and discussion quality.
`

  if (scenarioType === "system-design") {
    return `You are a brutally honest senior system design interviewer at a FAANG company. Be direct—if they didn't try, call it out.
${baseRules}

## OUTPUT FORMAT FOR SYSTEM DESIGN

**TL;DR** – One sentence summary.

**Score Snapshot** (use PRE-CALCULATED SCORES)
- Requirements: X/100
- Architecture: X/100
- Scalability: X/100
- Communication: X/100
- Overall: X/100

**What Worked**
- specific strengths

**Fix Next**
- specific improvements

**Action Plan**
1. Immediate action
2. Short-term goal
3. Long-term goal
`
  }

  return `You are a senior interviewer delivering a focused, constructive technical debrief. Be HONEST about gaps, but RECOGNIZE ACHIEVEMENTS.
${baseRules}

## OUTPUT FORMAT

**TL;DR** – One sentence summary.

**Score Snapshot** (use PRE-CALCULATED SCORES)
- Understanding: X/100
- Problem-Solving: X/100
- Code Quality: X/100
- Communication: X/100
- Overall: X/100

**What Worked**
- specific strengths

**Fix Next**
- specific improvements

**Action Plan**
1. Immediate action
2. Short-term goal
3. Long-term goal
`
}

function buildPrompt(data: {
  scenarioTitle: string
  scenarioType: string
  passRate: number
  finalScores: Record<string, number>
  aiValidation: Record<string, unknown>
  extractedEvidence?: Record<string, unknown>
  analyzedSilentNotes: unknown[]
  code: string
  language: string
  efficiencyMetrics?: Record<string, unknown>
  testsPassed: number
  testsTotal: number
}): string {
  const {
    scenarioTitle,
    scenarioType,
    passRate,
    finalScores,
    aiValidation,
    extractedEvidence,
    analyzedSilentNotes,
    code,
    language,
    efficiencyMetrics,
    testsPassed,
    testsTotal,
  } = data

  const evidenceSummary = extractedEvidence
    ? buildEvidenceSummary(
        extractedEvidence as unknown as Parameters<typeof buildEvidenceSummary>[0]
      )
    : ""
  const silentNotesContext = buildSilentNotesContext(
    analyzedSilentNotes as Parameters<typeof buildSilentNotesContext>[0]
  )

  return `Generate interview feedback for:

PROBLEM: ${scenarioTitle} (${scenarioType?.toUpperCase() || "DSA"})

TEST RESULTS:
- Passed: ${testsPassed}/${testsTotal} (${Math.round(passRate)}%)

PRE-CALCULATED SCORES (use these exactly):
${
  scenarioType === "system-design"
    ? `- Requirements: ${finalScores.understanding}/100
- Architecture: ${finalScores.problemSolving}/100
- Scalability: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
    : `- Understanding: ${finalScores.understanding}/100
- Problem-Solving: ${finalScores.problemSolving}/100
- Code Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
}
- Overall: ${finalScores.overall}/100

COMMUNICATION ANALYSIS:
- Approach explained: ${(aiValidation as Record<string, unknown>).approachExplained ? "YES" : "NO"}
- Complexity discussed: ${(aiValidation as Record<string, unknown>).complexityDiscussed ? "YES" : "NO"}

${evidenceSummary ? `EXTRACTED EVIDENCE:\n${evidenceSummary}\n` : ""}
${silentNotesContext}

CODE (${language || "javascript"}):
\`\`\`
${code?.slice(0, 1500) || "[No code]"}
\`\`\`

${
  efficiencyMetrics
    ? `EFFICIENCY:
- Time: ${(efficiencyMetrics as Record<string, unknown>).estimatedTimeComplexity || "N/A"}
- Space: ${(efficiencyMetrics as Record<string, unknown>).estimatedSpaceComplexity || "N/A"}
- Score: ${(efficiencyMetrics as Record<string, unknown>).efficiencyScore || "N/A"}/100`
    : ""
}

Generate concise, actionable feedback using the scores above.`
}
