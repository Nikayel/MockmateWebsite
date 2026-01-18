/**
 * CommunicationAnalyzerAgent
 *
 * Production-grade communication scoring with separation of concerns:
 * 1. Deterministic metrics (word count, keywords, response ratio) - no AI randomness
 * 2. Focused AI analysis (clarity, engagement only) - single responsibility
 * 3. Transparent scoring formula - auditable, testable
 *
 * This replaces the mixed-concern validateConversationWithAI function
 * which had unreliable safety nets and inconsistent scoring.
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"

// =============================================================================
// TYPES
// =============================================================================

export interface ObjectiveMetrics {
  totalWords: number
  avgWordsPerMessage: number
  totalMessages: number
  complexityMentions: number
  complexityKeywordsFound: string[]
  approachKeywords: string[]
  questionResponseRatio: number
  edgeCasesMentioned: boolean
  edgeCaseKeywordsFound: string[]
  // Raw data for debugging
  candidateMessageCount: number
  totalCandidateChars: number
}

export interface SubjectiveAnalysis {
  clarity: "excellent" | "good" | "basic" | "poor"
  engagement: "proactive" | "responsive" | "minimal"
  reasoning: string
}

export interface CommunicationAnalysisResult {
  score: number
  metrics: ObjectiveMetrics
  subjective: SubjectiveAnalysis
  breakdown: {
    clarityPoints: number
    engagementPoints: number
    wordCountPoints: number
    complexityPoints: number
    approachPoints: number
    edgeCasePoints: number
  }
  // Backward compatibility with ConversationValidation
  approachExplained: boolean
  approachQuality: "none" | "poor" | "basic" | "good" | "excellent"
  complexityDiscussed: boolean
  edgeCasesConsidered: boolean
}

// =============================================================================
// PATTERNS FOR DETECTION
// =============================================================================

const COMPLEXITY_PATTERNS = {
  bigO: /O\s*\(\s*[n1logkm\d\s\^*]+\s*\)/gi,
  timeComplexity: /time\s*complexity|runtime\s*(is|complexity)/gi,
  spaceComplexity: /space\s*complexity|memory\s*(is|complexity)/gi,
  linear: /\blinear\b|\bo\s*of\s*n\b/gi,
  constant: /\bconstant\s*(time|space)\b|\bo\s*of\s*1\b/gi,
  quadratic: /\bquadratic\b|\bn\s*squared\b|\bo\s*of\s*n\s*squared\b/gi,
  logarithmic: /\blogarithmic\b|\blog\s*n\b/gi,
}

const APPROACH_PATTERNS: Record<string, RegExp> = {
  "two-pointer": /two\s*pointer|two\s*pointers|left\s*(and|,)?\s*right\s*pointer/gi,
  "hash-map": /hash\s*map|hash\s*table|hashmap|dictionary|hash\s*set/gi,
  "sliding-window": /sliding\s*window/gi,
  "binary-search": /binary\s*search/gi,
  "dynamic-programming": /\bdp\b|dynamic\s*programming|memoiz/gi,
  "breadth-first": /\bbfs\b|breadth\s*first/gi,
  "depth-first": /\bdfs\b|depth\s*first/gi,
  "divide-conquer": /divide\s*(and)?\s*conquer/gi,
  greedy: /\bgreedy\b/gi,
  recursion: /\brecurs/gi,
  iteration: /\biterat|loop\s*through|for\s*loop/gi,
  "prefix-sum": /prefix\s*(sum|array|product)/gi,
  stack: /\bstack\b/gi,
  queue: /\bqueue\b/gi,
}

const EDGE_CASE_PATTERNS = [
  /edge\s*case/gi,
  /\bempty\b|\bnull\b|\bnone\b/gi,
  /\bzero\b|single\s*element/gi,
  /\bnegative\b/gi,
  /\bboundary\b|\bbase\s*case/gi,
  /what\s*if\s*(the|it|there|we)/gi,
  /special\s*case/gi,
]

// =============================================================================
// OBJECTIVE METRICS EXTRACTION (NO AI)
// =============================================================================

/**
 * Extract objective, deterministic metrics from transcript
 * This is fast and 100% reproducible
 */
export function extractObjectiveMetrics(
  transcript: Array<{ role?: string; type?: string; content?: string; message?: string }>
): ObjectiveMetrics {
  // Normalize messages
  const normalizedTranscript = transcript.map((m) => ({
    role: m.role || (m.type === "user" ? "candidate" : m.type === "ai" ? "interviewer" : m.type),
    content: m.content || m.message || "",
  }))

  const candidateMessages = normalizedTranscript.filter(
    (m) => m.role === "candidate" || m.role === "user"
  )

  const interviewerMessages = normalizedTranscript.filter(
    (m) => m.role === "interviewer" || m.role === "ai" || m.role === "assistant"
  )

  // Count total words and chars
  const totalWords = candidateMessages.reduce(
    (sum, m) => sum + (m.content?.split(/\s+/).filter(Boolean).length || 0),
    0
  )

  const totalCandidateChars = candidateMessages.reduce(
    (sum, m) => sum + (m.content?.length || 0),
    0
  )

  const avgWordsPerMessage = totalWords / Math.max(1, candidateMessages.length)

  // Concatenate all candidate content for keyword detection
  const allCandidateContent = candidateMessages.map((m) => m.content || "").join(" ")

  // Count complexity mentions
  let complexityMentions = 0
  const complexityKeywordsFound: string[] = []
  for (const [name, pattern] of Object.entries(COMPLEXITY_PATTERNS)) {
    const matches = allCandidateContent.match(pattern)
    if (matches) {
      complexityMentions += matches.length
      complexityKeywordsFound.push(name)
    }
  }

  // Find approach keywords
  const approachKeywords: string[] = []
  for (const [name, pattern] of Object.entries(APPROACH_PATTERNS)) {
    if (pattern.test(allCandidateContent)) {
      approachKeywords.push(name)
    }
    // Reset lastIndex since we're using global flag
    pattern.lastIndex = 0
  }

  // Count interviewer questions
  const interviewerQuestions = interviewerMessages.filter((m) => m.content?.includes("?")).length

  // Calculate question response ratio
  const questionResponseRatio = candidateMessages.length / Math.max(1, interviewerQuestions)

  // Check for edge case mentions
  let edgeCasesMentioned = false
  const edgeCaseKeywordsFound: string[] = []
  for (const pattern of EDGE_CASE_PATTERNS) {
    const matches = allCandidateContent.match(pattern)
    if (matches) {
      edgeCasesMentioned = true
      edgeCaseKeywordsFound.push(...matches.map((m) => m.toLowerCase()))
    }
    // Reset lastIndex
    pattern.lastIndex = 0
  }

  return {
    totalWords,
    avgWordsPerMessage: Math.round(avgWordsPerMessage * 10) / 10,
    totalMessages: candidateMessages.length,
    complexityMentions,
    complexityKeywordsFound: [...new Set(complexityKeywordsFound)],
    approachKeywords: [...new Set(approachKeywords)],
    questionResponseRatio: Math.round(questionResponseRatio * 100) / 100,
    edgeCasesMentioned,
    edgeCaseKeywordsFound: [...new Set(edgeCaseKeywordsFound)],
    candidateMessageCount: candidateMessages.length,
    totalCandidateChars,
  }
}

// =============================================================================
// SUBJECTIVE AI ANALYSIS (SINGLE FOCUSED CALL)
// =============================================================================

/**
 * AI-powered subjective analysis
 * Single focused prompt - ONLY evaluates clarity and engagement
 * All objective facts are pre-computed to anchor the AI
 */
async function analyzeSubjectiveQuality(
  transcript: Array<{ role?: string; type?: string; content?: string; message?: string }>,
  metrics: ObjectiveMetrics
): Promise<SubjectiveAnalysis> {
  // Build concise transcript for AI (limit to key parts)
  const normalizedTranscript = transcript.map((m) => ({
    role: m.role || (m.type === "user" ? "candidate" : m.type === "ai" ? "interviewer" : m.type),
    content: m.content || m.message || "",
  }))

  // Take first 10 + last 10 messages for long conversations
  let messagesToAnalyze = normalizedTranscript
  if (normalizedTranscript.length > 25) {
    const first10 = normalizedTranscript.slice(0, 10)
    const last10 = normalizedTranscript.slice(-10)
    messagesToAnalyze = [...first10, { role: "system", content: "[... middle ...]" }, ...last10]
  }

  const conversationText = messagesToAnalyze
    .map((m) => {
      const role = m.role === "candidate" || m.role === "user" ? "CANDIDATE" : "INTERVIEWER"
      const content =
        (m.content || "").slice(0, 200) + ((m.content?.length || 0) > 200 ? "..." : "")
      return `[${role}]: ${content}`
    })
    .join("\n")

  const prompt = `Analyze communication quality. Focus ONLY on clarity and engagement.

OBJECTIVE FACTS (already measured - do not contradict these):
- Total words spoken: ${metrics.totalWords}
- Total messages: ${metrics.totalMessages}
- Mentioned complexity: ${metrics.complexityMentions > 0 ? "YES (" + metrics.complexityKeywordsFound.join(", ") + ")" : "NO"}
- Mentioned approach: ${metrics.approachKeywords.length > 0 ? "YES (" + metrics.approachKeywords.join(", ") + ")" : "NO"}
- Discussed edge cases: ${metrics.edgeCasesMentioned ? "YES" : "NO"}

YOUR TASK: Evaluate SUBJECTIVE quality only (things that require human judgment):

1. Clarity (how clearly they explained their thinking):
   - excellent: Crystal clear reasoning, easy to follow, specific examples given
   - good: Understandable explanations, mostly clear with minor gaps
   - basic: Vague or incomplete explanations, somewhat hard to follow
   - poor: Confusing or incoherent, no clear explanation

2. Engagement (how they interacted with the interviewer):
   - proactive: Asked questions, volunteered information, drove the conversation
   - responsive: Answered questions when asked, engaged when prompted
   - minimal: Short answers, passive, little back-and-forth

IMPORTANT:
- Voice transcription may have typos/run-ons - judge IDEAS not spelling
- "I'm thinking..." and tracing examples IS explaining (conversational style counts)
- Walking through logic step-by-step IS explaining even without formal terms

CONVERSATION:
${conversationText}

Return ONLY this JSON (no markdown, no extra text):
{
  "clarity": "excellent" | "good" | "basic" | "poor",
  "engagement": "proactive" | "responsive" | "minimal",
  "reasoning": "1-2 sentence explanation"
}`

  try {
    const response = await generateAIResponse(
      "You are a technical interview evaluator. Return only valid JSON.",
      prompt,
      [],
      { complexity: "standard", temperature: 0.1 }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Validate and normalize response
      const validClarity = ["excellent", "good", "basic", "poor"].includes(parsed.clarity)
        ? parsed.clarity
        : "basic"
      const validEngagement = ["proactive", "responsive", "minimal"].includes(parsed.engagement)
        ? parsed.engagement
        : "responsive"

      return {
        clarity: validClarity as "excellent" | "good" | "basic" | "poor",
        engagement: validEngagement as "proactive" | "responsive" | "minimal",
        reasoning: parsed.reasoning || "Analysis completed",
      }
    }
  } catch (error) {
    logger.error("[CommunicationAnalyzer] AI analysis failed", { error })
  }

  // Fallback based on objective metrics
  return getDefaultSubjectiveAnalysis(metrics)
}

/**
 * Fallback subjective analysis when AI fails
 * Uses objective metrics to estimate
 */
function getDefaultSubjectiveAnalysis(metrics: ObjectiveMetrics): SubjectiveAnalysis {
  // Estimate clarity from word count and approach keywords
  let clarity: "excellent" | "good" | "basic" | "poor" = "basic"
  if (metrics.totalWords >= 200 && metrics.approachKeywords.length >= 1) {
    clarity = "good"
  } else if (metrics.totalWords >= 100) {
    clarity = "basic"
  } else if (metrics.totalWords < 30) {
    clarity = "poor"
  }

  // Estimate engagement from message count and response ratio
  let engagement: "proactive" | "responsive" | "minimal" = "responsive"
  if (metrics.questionResponseRatio >= 1.5 || metrics.totalMessages >= 10) {
    engagement = "proactive"
  } else if (metrics.totalMessages < 3) {
    engagement = "minimal"
  }

  return {
    clarity,
    engagement,
    reasoning: "Estimated from objective metrics (AI analysis unavailable)",
  }
}

// =============================================================================
// TRANSPARENT SCORING MODEL
// =============================================================================

/**
 * Calculate final score using transparent formula
 * Every point is accounted for - no black box
 *
 * Scoring breakdown (100 points total):
 * - Clarity (subjective): 40 points
 * - Engagement (subjective): 20 points
 * - Word count (objective): 15 points
 * - Complexity discussion (objective): 10 points
 * - Approach explanation (objective): 10 points
 * - Edge cases (objective): 5 points
 */
function calculateScore(
  metrics: ObjectiveMetrics,
  subjective: SubjectiveAnalysis
): { score: number; breakdown: CommunicationAnalysisResult["breakdown"] } {
  // Clarity points (40 max)
  const clarityMap = { excellent: 40, good: 30, basic: 20, poor: 10 }
  const clarityPoints = clarityMap[subjective.clarity]

  // Engagement points (20 max)
  const engagementMap = { proactive: 20, responsive: 12, minimal: 5 }
  const engagementPoints = engagementMap[subjective.engagement]

  // Word count points (15 max)
  // Voice transcription creates many short messages, so use TOTAL words
  let wordCountPoints = 0
  if (metrics.totalWords >= 200) wordCountPoints = 15
  else if (metrics.totalWords >= 100) wordCountPoints = 10
  else if (metrics.totalWords >= 50) wordCountPoints = 5
  else if (metrics.totalWords >= 20) wordCountPoints = 2

  // Complexity discussion points (10 max)
  let complexityPoints = 0
  if (metrics.complexityMentions >= 3) complexityPoints = 10
  else if (metrics.complexityMentions >= 2) complexityPoints = 8
  else if (metrics.complexityMentions >= 1) complexityPoints = 5

  // Approach explanation points (10 max)
  let approachPoints = 0
  if (metrics.approachKeywords.length >= 2) approachPoints = 10
  else if (metrics.approachKeywords.length >= 1) approachPoints = 7

  // Edge case points (5 max)
  const edgeCasePoints = metrics.edgeCasesMentioned ? 5 : 0

  const score = Math.min(
    100,
    clarityPoints +
      engagementPoints +
      wordCountPoints +
      complexityPoints +
      approachPoints +
      edgeCasePoints
  )

  return {
    score,
    breakdown: {
      clarityPoints,
      engagementPoints,
      wordCountPoints,
      complexityPoints,
      approachPoints,
      edgeCasePoints,
    },
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Analyze communication quality with full transparency
 *
 * Returns:
 * - score: Final communication score (0-100)
 * - metrics: Objective measurements (deterministic)
 * - subjective: AI analysis (clarity + engagement)
 * - breakdown: Exact point allocation for each category
 */
export async function analyzeCommunication(
  transcript: Array<{ role?: string; type?: string; content?: string; message?: string }>
): Promise<CommunicationAnalysisResult> {
  const startTime = Date.now()

  // Step 1: Extract objective metrics (fast, deterministic)
  const metrics = extractObjectiveMetrics(transcript)

  // Step 2: AI analyzes subjective quality (focused, reliable)
  const subjective = await analyzeSubjectiveQuality(transcript, metrics)

  // Step 3: Calculate score using transparent formula
  const { score, breakdown } = calculateScore(metrics, subjective)

  // Step 4: Derive backward-compatible fields
  const approachExplained = metrics.approachKeywords.length > 0 || metrics.totalWords >= 100
  const approachQuality = deriveApproachQuality(metrics, subjective)
  const complexityDiscussed = metrics.complexityMentions > 0
  const edgeCasesConsidered = metrics.edgeCasesMentioned

  const latency = Date.now() - startTime
  logger.info("[CommunicationAnalyzer] Analysis complete", {
    score,
    latencyMs: latency,
    metrics: {
      totalWords: metrics.totalWords,
      complexityMentions: metrics.complexityMentions,
      approachKeywords: metrics.approachKeywords,
      edgeCasesMentioned: metrics.edgeCasesMentioned,
    },
    subjective: {
      clarity: subjective.clarity,
      engagement: subjective.engagement,
    },
    breakdown,
  })

  return {
    score,
    metrics,
    subjective,
    breakdown,
    approachExplained,
    approachQuality,
    complexityDiscussed,
    edgeCasesConsidered,
  }
}

/**
 * Derive approach quality from metrics and subjective analysis
 */
function deriveApproachQuality(
  metrics: ObjectiveMetrics,
  subjective: SubjectiveAnalysis
): "none" | "poor" | "basic" | "good" | "excellent" {
  // No approach if no keywords and low word count
  if (metrics.approachKeywords.length === 0 && metrics.totalWords < 50) {
    return "none"
  }

  // Map clarity to approach quality (they correlate)
  if (subjective.clarity === "excellent" && metrics.approachKeywords.length >= 1) {
    return "excellent"
  }
  if (subjective.clarity === "good" || metrics.approachKeywords.length >= 2) {
    return "good"
  }
  if (subjective.clarity === "basic" || metrics.approachKeywords.length >= 1) {
    return "basic"
  }
  if (metrics.totalWords >= 30) {
    return "poor"
  }
  return "none"
}

/**
 * Backward-compatible wrapper that returns ConversationValidation shape
 * For gradual migration from validateConversationWithAI
 */
export async function validateCommunication(
  transcript: Array<{ role?: string; type?: string; content?: string; message?: string }>,
  _code?: string,
  _actualComplexity?: { time: string; space: string } | null
): Promise<{
  isCoherent: boolean
  responsesRelevant: boolean
  approachExplained: boolean
  approachQuality: "none" | "poor" | "basic" | "good" | "excellent"
  complexityDiscussed: boolean
  complexityAccurate: boolean
  statedComplexity: string | null
  questionsAsked: number
  questionsAnswered: number
  edgeCasesConsidered: boolean
  alternativesDiscussed: boolean
  communicationScore: number
}> {
  const result = await analyzeCommunication(transcript)

  // Count questions for backward compatibility
  const interviewerMessages = transcript.filter(
    (m) => (m.role === "interviewer" || m.type === "ai") && (m.content || m.message)?.includes("?")
  )

  return {
    isCoherent: true, // Assumed coherent if we got here
    responsesRelevant: true, // Assumed relevant if we got here
    approachExplained: result.approachExplained,
    approachQuality: result.approachQuality,
    complexityDiscussed: result.complexityDiscussed,
    complexityAccurate: result.complexityDiscussed, // Assume accurate if discussed
    statedComplexity: result.metrics.complexityKeywordsFound[0] || null,
    questionsAsked: interviewerMessages.length,
    questionsAnswered: Math.min(result.metrics.candidateMessageCount, interviewerMessages.length),
    edgeCasesConsidered: result.edgeCasesConsidered,
    alternativesDiscussed: result.metrics.approachKeywords.length > 1,
    communicationScore: result.score,
  }
}
