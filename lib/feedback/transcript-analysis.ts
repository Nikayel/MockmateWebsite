/**
 * Post-Interview Transcript Analysis
 *
 * Analyzes the interview transcript AFTER the interview is complete to detect
 * mistakes that weren't corrected. This generates silent notes for the
 * "What You Missed" feedback section.
 *
 * DRY: Reuses patterns from shared-patterns.ts and types from interview-phases.ts
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import {
  extractComplexityFromText,
  getComplexityRank,
  EDGE_CASE_KEYWORDS,
} from "@/lib/interview/shared-patterns"
import type { SilentNote, SilentNoteType } from "@/lib/interview/interview-phases"
import type { ExtractedEvidence } from "./structured-extraction"

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptMessage {
  role: "user" | "interviewer" | "assistant" | "candidate" | "ai_partner"
  content: string
  timestamp?: number
}

export interface ProblemContext {
  title: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  criticalEdgeCases: string[]
  scenarioType?: string
}

interface AnalysisResult {
  silentNotes: SilentNote[]
  analysisMetadata: {
    transcriptLength: number
    candidateMessages: number
    mistakesDetected: number
    algorithmicDetections: number
    semanticDetections: number
  }
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze transcript to detect uncorrected mistakes
 * Called post-interview, before feedback generation
 *
 * @param transcript - Array of conversation messages
 * @param problemContext - Problem metadata (complexity, edge cases, etc.)
 * @param existingEvidence - Already extracted evidence (optional, to avoid duplicate work)
 * @returns Array of SilentNote objects for "What You Missed" section
 */
export async function analyzeTranscriptForMistakes(
  transcript: TranscriptMessage[],
  problemContext: ProblemContext,
  existingEvidence?: ExtractedEvidence
): Promise<AnalysisResult> {
  const silentNotes: SilentNote[] = []
  let algorithmicDetections = 0
  let semanticDetections = 0

  // Normalize transcript roles for consistent processing
  const normalizedTranscript = normalizeTranscript(transcript)
  const candidateMessages = normalizedTranscript.filter((m) => m.role === "user")

  // Skip analysis if no meaningful conversation
  if (candidateMessages.length < 2) {
    return {
      silentNotes: [],
      analysisMetadata: {
        transcriptLength: transcript.length,
        candidateMessages: candidateMessages.length,
        mistakesDetected: 0,
        algorithmicDetections: 0,
        semanticDetections: 0,
      },
    }
  }

  // Step 1: Algorithmic detection (fast, no AI)
  const algorithmicNotes = detectMistakesAlgorithmically(
    normalizedTranscript,
    problemContext,
    existingEvidence
  )
  silentNotes.push(...algorithmicNotes)
  algorithmicDetections = algorithmicNotes.length

  // Step 2: Semantic detection (AI-powered, for nuanced mistakes)
  // Only run if we have enough content and didn't find many algorithmic mistakes
  if (candidateMessages.length >= 3 && algorithmicNotes.length < 3) {
    try {
      const semanticNotes = await detectMistakesSemantically(
        normalizedTranscript,
        problemContext,
        algorithmicNotes // Pass existing notes to avoid duplicates
      )
      silentNotes.push(...semanticNotes)
      semanticDetections = semanticNotes.length
    } catch (error) {
      logger.warn("[Transcript Analysis] Semantic analysis failed, using algorithmic only", {
        error,
      })
    }
  }

  // Deduplicate and limit notes (max 5 to avoid overwhelming feedback)
  const dedupedNotes = deduplicateNotes(silentNotes).slice(0, 5)

  logger.info("[Transcript Analysis] Analysis complete", {
    totalNotes: dedupedNotes.length,
    algorithmicDetections,
    semanticDetections,
    candidateMessages: candidateMessages.length,
  })

  return {
    silentNotes: dedupedNotes,
    analysisMetadata: {
      transcriptLength: transcript.length,
      candidateMessages: candidateMessages.length,
      mistakesDetected: dedupedNotes.length,
      algorithmicDetections,
      semanticDetections,
    },
  }
}

// =============================================================================
// ALGORITHMIC DETECTION
// =============================================================================

/**
 * Fast pattern-based detection of common mistakes
 */
function detectMistakesAlgorithmically(
  transcript: TranscriptMessage[],
  problemContext: ProblemContext,
  existingEvidence?: ExtractedEvidence
): SilentNote[] {
  const notes: SilentNote[] = []

  // Track what the interviewer corrected (to avoid duplicate notes)
  const interviewerCorrectedTopics = new Set<string>()

  // Build a map of candidate statements and interviewer responses
  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i]
    const content = msg.content.toLowerCase()
    const nextMsg = transcript[i + 1]
    const isInterviewerNext = nextMsg?.role === "interviewer"

    // Track interviewer corrections
    if (msg.role === "interviewer") {
      if (
        content.includes("actually") ||
        content.includes("not quite") ||
        content.includes("close, but") ||
        content.includes("that's not") ||
        content.includes("incorrect")
      ) {
        // Mark that interviewer corrected something - extract topic
        if (content.includes("complexity")) interviewerCorrectedTopics.add("complexity")
        if (content.includes("edge case")) interviewerCorrectedTopics.add("edge_case")
        if (content.includes("approach")) interviewerCorrectedTopics.add("approach")
      }
    }

    if (msg.role === "user") {
      // 1. Wrong complexity detection (time AND space)
      const complexityNotes = detectWrongComplexity(
        msg.content,
        problemContext,
        isInterviewerNext ? nextMsg?.content : undefined
      )
      if (complexityNotes.length > 0 && !interviewerCorrectedTopics.has("complexity")) {
        notes.push(...complexityNotes)
      }

      // 2. Missed edge case detection (use existing evidence if available)
      if (!interviewerCorrectedTopics.has("edge_case")) {
        const edgeCaseNotes = detectMissedEdgeCases(
          transcript.slice(0, i + 1), // Only messages up to this point
          problemContext,
          existingEvidence
        )
        // Only add if interviewer didn't correct and candidate didn't later mention
        const laterMessages = transcript
          .slice(i + 1)
          .filter((m) => m.role === "user")
          .map((m) => m.content.toLowerCase())
          .join(" ")

        for (const note of edgeCaseNotes) {
          // Check if candidate mentioned this edge case later
          const edgeCaseTerm = note.context?.toLowerCase() || ""
          if (!laterMessages.includes(edgeCaseTerm)) {
            notes.push(note)
          }
        }
      }

      // 3. Wrong optimality claim
      const optimalityNote = detectWrongOptimality(msg.content, problemContext)
      if (optimalityNote && !interviewerCorrectedTopics.has("approach")) {
        notes.push(optimalityNote)
      }

      // 4. Deflection detection
      const deflectionNote = detectDeflection(msg.content)
      if (deflectionNote) {
        notes.push(deflectionNote)
      }

      // 5. Confused approach detection
      const confusedNote = detectConfusedApproach(msg.content)
      if (confusedNote) {
        notes.push(confusedNote)
      }
    }
  }

  return notes
}

/**
 * Detect when user states wrong complexity (time or space)
 * Returns an array of notes since user might get both wrong
 */
function detectWrongComplexity(
  userMessage: string,
  problemContext: ProblemContext,
  interviewerResponse?: string
): SilentNote[] {
  const notes: SilentNote[] = []
  const content = userMessage.toLowerCase()

  // Check if interviewer corrected (if so, not a silent note)
  if (interviewerResponse) {
    const responseLC = interviewerResponse.toLowerCase()
    if (
      responseLC.includes("actually") ||
      responseLC.includes("not quite") ||
      responseLC.includes("that's not correct")
    ) {
      return [] // Interviewer corrected, not a silent mistake
    }
  }

  // Determine if this message is about space or time complexity
  const isAboutSpace =
    content.includes("space") || content.includes("memory") || content.includes("auxiliary")
  const isAboutTime =
    content.includes("time") ||
    content.includes("runtime") ||
    (!isAboutSpace && !content.includes("space")) // Default to time if not explicitly space

  // Extract complexity value from the message
  const statedComplexity = extractComplexityFromText(userMessage)
  if (!statedComplexity) return []

  const statedRank = getComplexityRank(statedComplexity)

  // Check SPACE complexity if user mentioned space
  if (isAboutSpace && problemContext.optimalSpaceComplexity) {
    const optimalSpaceRank = getComplexityRank(problemContext.optimalSpaceComplexity)

    // If user's stated space complexity is significantly better than actual, they're wrong
    // e.g., claiming O(1) space for recursive solution when actual is O(h) or O(n)
    if (statedRank !== -1 && optimalSpaceRank !== -1 && statedRank < optimalSpaceRank - 1) {
      notes.push({
        type: "wrong_complexity",
        timestamp: Date.now(),
        userSaid: extractRelevantQuote(userMessage, statedComplexity),
        correct: `Space complexity is ${problemContext.optimalSpaceComplexity}`,
        context: "space complexity",
      })
    }
  }

  // Check TIME complexity
  if (isAboutTime) {
    const optimalTimeRank = getComplexityRank(problemContext.optimalTimeComplexity)

    // If user's stated complexity is significantly better than optimal, they're wrong
    // (e.g., claiming O(1) when optimal is O(n))
    if (statedRank !== -1 && optimalTimeRank !== -1 && statedRank < optimalTimeRank - 1) {
      // Check if this is about their approach or the optimal
      const isClaimingTheirSolution =
        content.includes("my") ||
        content.includes("this") ||
        content.includes("solution") ||
        content.includes("approach") ||
        content.includes("would be") ||
        content.includes("is")

      if (isClaimingTheirSolution) {
        notes.push({
          type: "wrong_complexity",
          timestamp: Date.now(),
          userSaid: extractRelevantQuote(userMessage, statedComplexity),
          correct: `Time complexity is ${problemContext.optimalTimeComplexity}`,
          context: "time complexity",
        })
      }
    }

    // Also check if user stated complexity is significantly worse than what's achievable
    // but they thought it was optimal
    if (statedRank > optimalTimeRank + 1) {
      if (
        content.includes("optimal") ||
        content.includes("best") ||
        content.includes("can't do better")
      ) {
        notes.push({
          type: "wrong_optimality",
          timestamp: Date.now(),
          userSaid: extractRelevantQuote(userMessage, statedComplexity),
          correct: `Can achieve ${problemContext.optimalTimeComplexity}`,
          context: "better solution exists",
        })
      }
    }
  }

  return notes
}

/**
 * Detect missed critical edge cases
 */
function detectMissedEdgeCases(
  transcriptSoFar: TranscriptMessage[],
  problemContext: ProblemContext,
  existingEvidence?: ExtractedEvidence
): SilentNote[] {
  const notes: SilentNote[] = []

  // Use existing evidence if available
  if (existingEvidence?.edgeCases.missedCritical.length) {
    // These are already known missed edge cases
    // Only create notes if there are critical ones
    const criticalMissed = existingEvidence.edgeCases.missedCritical.filter((ec) =>
      problemContext.criticalEdgeCases.some(
        (critical) =>
          critical.toLowerCase().includes(ec.toLowerCase()) ||
          ec.toLowerCase().includes(critical.toLowerCase())
      )
    )

    if (criticalMissed.length > 0) {
      notes.push({
        type: "missed_edge_case",
        timestamp: Date.now(),
        userSaid: "Did not mention critical edge cases",
        correct: `Consider: ${criticalMissed.slice(0, 2).join(", ")}`,
        context: criticalMissed[0],
      })
    }
    return notes
  }

  // Algorithmic detection: check if user mentioned critical edge cases
  const allUserContent = transcriptSoFar
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ")

  for (const criticalEdge of problemContext.criticalEdgeCases) {
    const edgeLower = criticalEdge.toLowerCase()
    // Check if any edge case keyword was mentioned
    const mentioned = EDGE_CASE_KEYWORDS.some(
      (keyword) =>
        (allUserContent.includes(keyword) && allUserContent.includes(edgeLower.split(" ")[0])) ||
        allUserContent.includes(edgeLower)
    )

    if (!mentioned) {
      notes.push({
        type: "missed_edge_case",
        timestamp: Date.now(),
        userSaid: "Did not discuss this edge case",
        correct: `Should consider: ${criticalEdge}`,
        context: criticalEdge,
      })
    }
  }

  return notes.slice(0, 2) // Limit to 2 edge case notes
}

/**
 * Detect when user wrongly claims solution is optimal
 */
function detectWrongOptimality(
  userMessage: string,
  problemContext: ProblemContext
): SilentNote | null {
  const content = userMessage.toLowerCase()

  // Check for optimality claims
  const claimsOptimal =
    content.includes("optimal") ||
    content.includes("best possible") ||
    content.includes("can't do better") ||
    content.includes("most efficient")

  if (!claimsOptimal) return null

  // Extract their stated complexity
  const statedComplexity = extractComplexityFromText(userMessage)
  if (!statedComplexity) return null

  const statedRank = getComplexityRank(statedComplexity)
  const optimalRank = getComplexityRank(problemContext.optimalTimeComplexity)

  // If they claim optimal but their complexity is worse than actual optimal
  if (statedRank > optimalRank) {
    return {
      type: "wrong_optimality",
      timestamp: Date.now(),
      userSaid: extractRelevantQuote(userMessage, "optimal"),
      correct: `Optimal is ${problemContext.optimalTimeComplexity}, not ${statedComplexity}`,
      context: "solution optimality",
    }
  }

  return null
}

/**
 * Detect when user deflects a question
 */
function detectDeflection(userMessage: string): SilentNote | null {
  const content = userMessage.toLowerCase()

  const deflectionPatterns = [
    "you tell me",
    "what do you think",
    "i don't know",
    "not sure",
    "no idea",
    "can you explain",
    "what's the answer",
    "just tell me",
  ]

  for (const pattern of deflectionPatterns) {
    if (content.includes(pattern)) {
      // Make sure it's not part of a longer, substantive response
      if (userMessage.length < 50) {
        return {
          type: "deflection",
          timestamp: Date.now(),
          userSaid: userMessage.substring(0, 100),
          correct: "Attempt an answer, even if uncertain",
          context: "interviewer question",
        }
      }
    }
  }

  return null
}

/**
 * Detect when user confuses different approaches
 */
function detectConfusedApproach(userMessage: string): SilentNote | null {
  const content = userMessage.toLowerCase()

  // Pattern: claiming brute force is optimized or vice versa
  if (
    (content.includes("brute force") && content.includes("optimal")) ||
    (content.includes("nested loop") && content.includes("o(n)") && !content.includes("o(n^2)"))
  ) {
    return {
      type: "confused_approach",
      timestamp: Date.now(),
      userSaid: extractRelevantQuote(userMessage, "brute"),
      correct: "Brute force is typically O(n²), not optimal",
      context: "approach confusion",
    }
  }

  // Pattern: confusing data structures
  if ((content.includes("hash") || content.includes("hashmap")) && content.includes("o(n²)")) {
    return {
      type: "confused_approach",
      timestamp: Date.now(),
      userSaid: extractRelevantQuote(userMessage, "hash"),
      correct: "HashMap typically enables O(n) or O(1) lookup, not O(n²)",
      context: "data structure misconception",
    }
  }

  return null
}

// =============================================================================
// SEMANTIC DETECTION (AI-POWERED)
// =============================================================================

/**
 * Use AI to detect nuanced mistakes that pattern matching misses
 */
async function detectMistakesSemantically(
  transcript: TranscriptMessage[],
  problemContext: ProblemContext,
  existingNotes: SilentNote[]
): Promise<SilentNote[]> {
  const transcriptText = transcript
    .filter((m) => m.role === "user" || m.role === "interviewer")
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")
    .substring(0, 6000) // Limit for API

  const existingTypes = existingNotes.map((n) => n.type).join(", ")

  const prompt = `Analyze this technical interview transcript for UNCORRECTED mistakes.

PROBLEM: ${problemContext.title}
OPTIMAL TIME COMPLEXITY: ${problemContext.optimalTimeComplexity}
OPTIMAL SPACE COMPLEXITY: ${problemContext.optimalSpaceComplexity}
CRITICAL EDGE CASES: ${problemContext.criticalEdgeCases.join(", ")}

Already detected: ${existingTypes || "none"}

TRANSCRIPT:
${transcriptText}

Find mistakes the CANDIDATE made that the INTERVIEWER did NOT correct. Only include:
1. Wrong complexity claims (stated O(x) but actual is O(y))
2. Wrong edge case handling (said X happens, but Y happens)
3. Claiming solution is optimal when it's not
4. Confusing different approaches or data structures
5. Incomplete/vague answers that weren't probed

DO NOT include:
- Mistakes the interviewer already corrected
- Types already detected: ${existingTypes}
- Stylistic preferences
- Minor clarifications

Return JSON array (max 3 items):
[
  {
    "type": "wrong_complexity|wrong_edge_case|missed_edge_case|wrong_optimality|confused_approach|incomplete_answer",
    "userSaid": "exact quote or close paraphrase (max 100 chars)",
    "correct": "what the correct answer would be",
    "context": "brief context"
  }
]

If no uncorrected mistakes found, return empty array: []`

  try {
    const response = await generateAIResponse(
      "You are a technical interview analyst. Return only valid JSON array.",
      prompt,
      [],
      { complexity: "critique", temperature: 0.1 }
    )

    const jsonMatch = response.text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.map((note: any) => ({
        type: note.type as SilentNoteType,
        timestamp: Date.now(),
        userSaid: note.userSaid || "",
        correct: note.correct,
        context: note.context,
      }))
    }
  } catch (error) {
    logger.error("[Transcript Analysis] Semantic detection failed", { error })
  }

  return []
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize transcript to consistent role format
 */
function normalizeTranscript(transcript: TranscriptMessage[]): TranscriptMessage[] {
  return transcript.map((msg) => ({
    ...msg,
    role:
      msg.role === "candidate" || msg.role === "user"
        ? "user"
        : msg.role === "ai_partner"
          ? "assistant"
          : msg.role === "assistant"
            ? "interviewer"
            : msg.role,
  })) as TranscriptMessage[]
}

/**
 * Extract a relevant quote around a keyword
 */
function extractRelevantQuote(text: string, keyword: string): string {
  const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (keywordIndex === -1) return text.substring(0, 100)

  const start = Math.max(0, keywordIndex - 30)
  const end = Math.min(text.length, keywordIndex + keyword.length + 50)
  let quote = text.substring(start, end)

  if (start > 0) quote = "..." + quote
  if (end < text.length) quote = quote + "..."

  return quote.substring(0, 120)
}

/**
 * Deduplicate notes based on type and context
 */
function deduplicateNotes(notes: SilentNote[]): SilentNote[] {
  const seen = new Set<string>()
  return notes.filter((note) => {
    const key = `${note.type}:${note.context || ""}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
