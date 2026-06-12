/**
 * Streaming Feedback API - Edge Function with NO TIMEOUT
 *
 * Edge functions don't timeout when streaming responses.
 * This allows us to run all AI operations and stream the result
 * without hitting Vercel's 10s hobby plan limit.
 *
 * Flow:
 * 1. Receive session data
 * 2. Calculate instant scores (no AI, < 100ms)
 * 3. Stream scores immediately
 * 4. Run AI operations
 * 5. Stream rich feedback as it generates
 */

import { NextRequest } from "next/server"
import {
  generateFeedbackResponseEdge,
  validateConversationEdge,
  extractConversationEvidenceEdge,
} from "@/lib/ai-providers-edge"
// Direct imports to avoid pulling in Node.js dependencies via barrel exports
import { preScreenConversation } from "@/lib/feedback/pre-screening"
import { analyzeCodeCompleteness } from "@/lib/feedback/completeness-analysis"
import { parseFeedbackSections, buildSilentNotesContext } from "@/lib/feedback/parsers"
import { completeFeedbackSections } from "@/lib/feedback/structured-feedback-schema"
import { calculateInstantScores, buildSignalsFromMetrics } from "@/lib/feedback/score-accumulator"
import {
  analyzeAICodeOverlap,
  getDefaultValidation,
  calculateValidatedScores,
  applyScoreFloors,
  buildEvidenceSummary,
} from "@/lib/feedback/edge-utils"
import { analyzeTranscriptForMistakesEdge } from "@/lib/feedback/transcript-analysis-edge"
import { summarizeBugfixEvidence } from "@/lib/bugfix/evidence"
import { buildBugfixPostSessionReport } from "@/lib/bugfix/report"
import { calculateBugfixEvidenceScore } from "@/lib/bugfix/scoring"
import type {
  BugfixEvidenceEvent,
  BugfixEvidenceSummary,
  BugfixScoreBreakdown,
} from "@/lib/bugfix/types"

// CRITICAL: Edge runtime for no timeout on streaming
export const runtime = "edge"

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a TransformStream for streaming
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    await writer.write(encoder.encode(payload))
  }

  // Process in background while streaming
  const processRequest = async () => {
    try {
      const body = await request.json()
      const {
        sessionId,
        userId,
        code,
        language,
        testsPassed,
        testsTotal,
        scenarioType,
        scenarioTitle,
        scenarioId,
        scenarioDifficulty,
        scenarioPattern,
        conversationTranscript,
        partnerMessages,
        phaseTracking,
        silentNotes: existingSilentNotes,
        efficiencyMetrics,
        submittedFromPhase,
        testsRanBeforeSubmit,
        bugfixEvidenceEvents,
        bugfixExpectedTouchedFiles,
        bugfixRootCause,
        bugfixPrevention,
      } = body

      // ========================================
      // PHASE 1: Instant Scores (< 100ms, no AI)
      // ========================================
      await sendEvent("phase", { phase: "calculating_scores", message: "Calculating scores..." })

      const codeAnalysis = code
        ? analyzeCodeCompleteness(code, language || "javascript")
        : { isIncomplete: true, hasActualLogic: false }

      // Derive actual message counts from transcript (not hardcoded 0)
      const transcriptArray =
        conversationTranscript && Array.isArray(conversationTranscript)
          ? conversationTranscript
          : []
      const candidateMessageCount = transcriptArray.filter(
        (m: { role?: string; type?: string }) =>
          m.role === "candidate" || m.role === "user" || m.type === "user"
      ).length
      const interviewerMessageCount = transcriptArray.filter(
        (m: { role?: string; type?: string }) =>
          m.role === "interviewer" || m.type === "interviewer"
      ).length

      const signals = buildSignalsFromMetrics({
        testsPassed,
        testsTotal,
        efficiencyScore: efficiencyMetrics?.efficiencyScore ?? 50,
        codeLength: code?.length || 0,
        hasActualLogic: codeAnalysis.hasActualLogic,
        approachExplained: phaseTracking?.conversationTracker?.approachExplained || false,
        complexityDiscussed: phaseTracking?.conversationTracker?.timeComplexityMentioned || false,
        edgeCasesIdentified: phaseTracking?.conversationTracker?.edgeCasesMentioned || [],
        hintsViewed: [],
        totalInterviewerMessages: interviewerMessageCount,
        totalChatMessages: candidateMessageCount,
        aiSuggestionsCopiedBlindly: 0,
        testsRanBeforeSubmit: testsRanBeforeSubmit ?? false,
        submittedFromPhase: submittedFromPhase || "unknown",
        scenarioType: scenarioType || "dsa",
        difficulty: scenarioDifficulty || "medium",
      })

      const instantScores = calculateInstantScores(signals)

      // Send instant scores immediately
      await sendEvent("scores", {
        understanding: instantScores.understanding,
        problemSolving: instantScores.problemSolving,
        codeQuality: instantScores.codeQuality,
        communication: instantScores.communication,
        overall: instantScores.overall,
        flags: {
          silentSolution: instantScores.silentSolution,
          incompleteSolution: instantScores.incompleteSolution,
          aiCopyingDetected: instantScores.aiCopyingDetected,
        },
      })

      // ========================================
      // PHASE 2: AI Validation (parallel)
      // ========================================
      await sendEvent("phase", { phase: "analyzing", message: "Analyzing your interview..." })

      const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0
      const preScreen = preScreenConversation(conversationTranscript)
      const aiCodeOverlap = analyzeAICodeOverlap(code, partnerMessages)
      const hasBlindCopying = aiCodeOverlap.hasHighOverlap && !aiCodeOverlap.modificationsMade
      const bugfixEvidenceSummary: BugfixEvidenceSummary | null =
        scenarioType === "bugfix" && Array.isArray(bugfixEvidenceEvents)
          ? summarizeBugfixEvidence({
              events: bugfixEvidenceEvents as BugfixEvidenceEvent[],
              expectedTouchedFiles: Array.isArray(bugfixExpectedTouchedFiles)
                ? bugfixExpectedTouchedFiles
                : [],
            })
          : null
      const bugfixScoreBreakdown: BugfixScoreBreakdown | null = bugfixEvidenceSummary
        ? calculateBugfixEvidenceScore(bugfixEvidenceSummary, {
            difficulty: scenarioDifficulty || "medium",
          })
        : null

      // Prepare transcript
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

      // Run validation, extraction, and silent notes analysis in parallel
      const shouldValidateWithAI =
        scenarioType === "system-design" ||
        (preScreen.hasContent && preScreen.candidateMessageCount >= 1)

      // Problem context for silent notes analysis
      const problemContext = {
        title: scenarioTitle || "Unknown Problem",
        optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
        optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
        criticalEdgeCases: ["empty input", "single element", "null values"],
        scenarioType: scenarioType || "dsa",
      }

      const [aiValidation, extractedEvidence, silentNotesAnalysis] = await Promise.all([
        shouldValidateWithAI
          ? validateConversationEdge(
              transcriptMessages,
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
          ? extractConversationEvidenceEdge(transcriptMessages, problemContext).catch(() => null)
          : Promise.resolve(null),
        // Generate silent notes if we don't have existing ones and have transcript
        !existingSilentNotes?.length && transcriptMessages.length >= 2
          ? analyzeTranscriptForMistakesEdge(
              transcriptMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              problemContext
            ).catch((err) => {
              console.warn("[Streaming Feedback] Silent notes analysis failed:", err)
              return { silentNotes: [], analysisMetadata: null }
            })
          : Promise.resolve({ silentNotes: existingSilentNotes || [], analysisMetadata: null }),
      ])

      // Use generated silent notes or existing ones
      const finalSilentNotes = silentNotesAnalysis.silentNotes || existingSilentNotes || []
      if (silentNotesAnalysis.analysisMetadata) {
        console.log("[Streaming Feedback] Silent notes generated:", {
          count: finalSilentNotes.length,
          algorithmicDetections: silentNotesAnalysis.analysisMetadata.algorithmicDetections,
          semanticDetections: silentNotesAnalysis.analysisMetadata.semanticDetections,
        })
      }

      // Reconcile evidence - extracted evidence overrides AI when it finds concrete quotes
      if (extractedEvidence) {
        if (extractedEvidence.approach.explained) {
          aiValidation.approachExplained = true
        }
        if (extractedEvidence.timeComplexity.mentioned) {
          aiValidation.complexityDiscussed = true
          if (extractedEvidence.timeComplexity.isCorrect !== undefined) {
            aiValidation.complexityAccurate = extractedEvidence.timeComplexity.isCorrect
          }
        }
        if (extractedEvidence.edgeCases.mentionedByCandidate.length > 0) {
          aiValidation.edgeCasesConsidered = true
        }
      }

      // ========================================
      // PHASE 3: Calculate Final Scores
      // ========================================
      // Note: extractedEvidence is already merged into aiValidation above
      const validatedScores = calculateValidatedScores(
        passRate,
        efficiencyMetrics,
        preScreen,
        aiValidation,
        scenarioType,
        code,
        null // Evidence already merged into aiValidation
      )

      if (hasBlindCopying && scenarioType !== "system-design") {
        validatedScores.understanding = Math.max(30, validatedScores.understanding - 25)
      }

      let finalScores = applyScoreFloors(
        validatedScores,
        passRate,
        efficiencyMetrics?.efficiencyScore,
        aiValidation
      )

      if (bugfixScoreBreakdown) {
        finalScores = mapBugfixScoreToFeedbackScores(bugfixScoreBreakdown)
      }

      // Send refined scores
      await sendEvent("refined_scores", {
        understanding: finalScores.understanding,
        problemSolving: finalScores.problemSolving,
        codeQuality: finalScores.codeQuality,
        communication: finalScores.communication,
        overall: finalScores.overall,
      })

      // ========================================
      // PHASE 4: Generate AI Feedback
      // ========================================
      await sendEvent("phase", {
        phase: "generating",
        message: "Generating personalized feedback...",
      })

      const systemInstruction = buildSystemInstruction(scenarioType)
      const prompt = buildPrompt({
        scenarioTitle,
        scenarioType,
        passRate,
        finalScores: finalScores as unknown as Record<string, number>,
        aiValidation: aiValidation as unknown as Record<string, unknown>,
        extractedEvidence,
        bugfixEvidenceSummary,
        bugfixScoreBreakdown,
        bugfixRootCause,
        bugfixPrevention,
        silentNotes: finalSilentNotes,
        code,
        language,
        efficiencyMetrics,
        testsPassed,
        testsTotal,
      })

      const aiResponse = await generateFeedbackResponseEdge(systemInstruction, prompt)

      const feedback = aiResponse.text

      // Parse sections
      const parsedSections = parseFeedbackSections(feedback)
      const sections = completeFeedbackSections(parsedSections, {
        rawFeedback: feedback,
        scenarioTitle,
        testsPassed,
        testsTotal,
        overallScore: finalScores.overall,
      })

      // ========================================
      // PHASE 5: Stream Final Results
      // ========================================
      await sendEvent("phase", { phase: "complete", message: "Done!" })

      await sendEvent("feedback", {
        raw: feedback,
        tldr: sections.tldr || "",
        whatWorked: sections.whatWorked || [],
        fixNext: sections.fixNext || [],
        actionPlan: sections.actionPlan || [],
        silentNotes: finalSilentNotes,
        bugfixEvidenceSummary,
        bugfixScoreBreakdown,
        bugfixPostSessionReport:
          bugfixEvidenceSummary && bugfixScoreBreakdown
            ? buildBugfixPostSessionReport({
                evidence: bugfixEvidenceSummary,
                score: bugfixScoreBreakdown,
                rootCauseText: typeof bugfixRootCause === "string" ? bugfixRootCause : undefined,
                preventionText: typeof bugfixPrevention === "string" ? bugfixPrevention : undefined,
              })
            : undefined,
        scores: {
          understanding: finalScores.understanding,
          problemSolving: finalScores.problemSolving,
          codeQuality: finalScores.codeQuality,
          communication: finalScores.communication,
          overall: finalScores.overall,
        },
      })

      await sendEvent("done", { success: true })
    } catch (error) {
      console.error("[Streaming Feedback] Error", error)
      await sendEvent("error", {
        message: error instanceof Error ? error.message : "Failed to generate feedback",
      })
    } finally {
      await writer.close()
    }
  }

  // Start processing (don't await - let it stream)
  processRequest()

  // Return the stream immediately
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

function buildSystemInstruction(scenarioType: string): string {
  const baseRules = `
IMPORTANT: Scores are PRE-CALCULATED. Reference them in your feedback. Focus on actionable narrative.

RULES:
- ~200 words max. Be concise.
- Focus on actionable improvements.
- Be specific - reference actual code/conversation.
`

  if (scenarioType === "system-design") {
    return `You are a senior system design interviewer. Be direct and specific.
${baseRules}

FORMAT:
**TL;DR** – One sentence.
**Score Snapshot** (use PRE-CALCULATED SCORES)
**What Worked** – 2-3 specific strengths with evidence
**Fix Next** – 2-3 specific improvements
**Action Plan** – 3 concrete next steps
`
  }

  if (scenarioType === "bugfix") {
    return `You are a senior debugging interviewer. Be direct, evidence-based, and specific.
${baseRules}

FORMAT:
**TL;DR** – One sentence.
**Debugging Score Snapshot** (use PRE-CALCULATED SCORES)
**What Worked** – 2-3 specific strengths with evidence from files, tests, or notes
**Fix Next** – 2-3 concrete debugging process improvements
**Action Plan** – 3 concrete next debugging habits
`
  }

  return `You are a senior technical interviewer. Be honest about gaps but recognize achievements.
${baseRules}

FORMAT:
**TL;DR** – One sentence.
**Score Snapshot** (use PRE-CALCULATED SCORES)
**What Worked** – 2-3 specific strengths with evidence
**Fix Next** – 2-3 specific improvements
**Action Plan** – 3 concrete next steps
`
}

function buildPrompt(data: {
  scenarioTitle: string
  scenarioType: string
  passRate: number
  finalScores: Record<string, number>
  aiValidation: Record<string, unknown>
  extractedEvidence?: unknown
  bugfixEvidenceSummary?: BugfixEvidenceSummary | null
  bugfixScoreBreakdown?: BugfixScoreBreakdown | null
  bugfixRootCause?: unknown
  bugfixPrevention?: unknown
  silentNotes: unknown[]
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
    bugfixEvidenceSummary,
    bugfixScoreBreakdown,
    bugfixRootCause,
    bugfixPrevention,
    silentNotes,
    code,
    language,
    efficiencyMetrics,
    testsPassed,
    testsTotal,
  } = data

  const evidenceSummary = extractedEvidence
    ? buildEvidenceSummary(extractedEvidence as Parameters<typeof buildEvidenceSummary>[0])
    : ""
  const silentNotesContext = buildSilentNotesContext(
    silentNotes as Parameters<typeof buildSilentNotesContext>[0]
  )
  const bugfixEvidenceContext =
    scenarioType === "bugfix" && bugfixEvidenceSummary && bugfixScoreBreakdown
      ? buildBugfixEvidenceContext({
          summary: bugfixEvidenceSummary,
          score: bugfixScoreBreakdown,
          rootCause: typeof bugfixRootCause === "string" ? bugfixRootCause : "",
          prevention: typeof bugfixPrevention === "string" ? bugfixPrevention : "",
        })
      : ""

  return `Generate specific, actionable interview feedback.

PROBLEM: ${scenarioTitle} (${scenarioType?.toUpperCase() || "DSA"})

TEST RESULTS: ${testsPassed}/${testsTotal} passed (${Math.round(passRate)}%)

PRE-CALCULATED SCORES (use exactly):
${
  scenarioType === "system-design"
    ? `- Requirements: ${finalScores.understanding}/100
- Architecture: ${finalScores.problemSolving}/100
- Scalability: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
    : scenarioType === "bugfix"
      ? `- Investigation: ${finalScores.understanding}/100
- Debugging Process: ${finalScores.problemSolving}/100
- Fix Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
      : `- Understanding: ${finalScores.understanding}/100
- Problem-Solving: ${finalScores.problemSolving}/100
- Code Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
}
- Overall: ${finalScores.overall}/100

COMMUNICATION:
- Approach explained: ${(aiValidation as Record<string, unknown>).approachExplained ? "YES" : "NO"}
- Complexity discussed: ${(aiValidation as Record<string, unknown>).complexityDiscussed ? "YES" : "NO"}

${evidenceSummary ? `EVIDENCE FROM CONVERSATION:\n${evidenceSummary}\n` : ""}
${bugfixEvidenceContext}
${silentNotesContext}

CODE (${language || "javascript"}):
\`\`\`
${code?.slice(0, 1500) || "[No code]"}
\`\`\`

${
  efficiencyMetrics
    ? `
COMPLEXITY:
- Time: ${(efficiencyMetrics as Record<string, unknown>).estimatedTimeComplexity || "N/A"}
- Space: ${(efficiencyMetrics as Record<string, unknown>).estimatedSpaceComplexity || "N/A"}
`
    : ""
}

CRITICAL: Be SPECIFIC. Reference actual code patterns, conversation quotes, or test failures.
Do NOT give generic advice. Make it clear you analyzed THIS session.`
}

function averageScores(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function mapBugfixScoreToFeedbackScores(score: BugfixScoreBreakdown) {
  return {
    understanding: averageScores([
      score.reproductionDiscipline,
      score.evidenceGathering,
      score.hypothesisQuality,
      score.rootCauseUnderstanding,
    ]),
    problemSolving: averageScores([
      score.codebaseNavigation,
      score.verificationDiscipline,
      score.aiCollaborationQuality,
    ]),
    codeQuality: averageScores([
      score.minimalFixQuality,
      score.overEditControl,
      score.regressionPrevention,
    ]),
    communication: score.communication,
    overall: score.overall,
  }
}

function buildBugfixEvidenceContext(params: {
  summary: BugfixEvidenceSummary
  score: BugfixScoreBreakdown
  rootCause: string
  prevention: string
}): string {
  const { summary, score, rootCause, prevention } = params

  return `
BUGFIX SESSION EVIDENCE:
- Reproduced before editing: ${summary.reproducedBeforeEditing ? "YES" : "NO"}
- Files inspected: ${summary.inspectedFiles.join(", ") || "none recorded"}
- Tests/docs inspected: ${summary.inspectedTestOrDocs.join(", ") || "none recorded"}
- Edited files: ${summary.editedFiles.join(", ") || "none recorded"}
- Over-edited files: ${summary.overEditedFiles.join(", ") || "none"}
- Visible test runs: ${summary.visibleTestsRun}
- Final pass rate: ${Math.round(summary.finalPassRate)}%
- Hypotheses captured: ${summary.hypothesisCount}
- Root cause captured: ${rootCause.trim() || "not captured"}
- Prevention idea captured: ${prevention.trim() || "not captured"}
- AI partner uses: ${summary.aiPartnerUseCount}
- AI shortcut requests: ${summary.aiShortcutCount}

BUGFIX SCORE BREAKDOWN:
- Reproduction Discipline: ${score.reproductionDiscipline}/100
- Codebase Navigation: ${score.codebaseNavigation}/100
- Evidence Gathering: ${score.evidenceGathering}/100
- Hypothesis Quality: ${score.hypothesisQuality}/100
- Minimal Fix Quality: ${score.minimalFixQuality}/100
- Verification Discipline: ${score.verificationDiscipline}/100
- Over-Edit Control: ${score.overEditControl}/100
- Root Cause Understanding: ${score.rootCauseUnderstanding}/100
- Regression Prevention: ${score.regressionPrevention}/100
- AI Collaboration Quality: ${score.aiCollaborationQuality}/100
`
}
