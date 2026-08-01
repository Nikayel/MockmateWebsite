/**
 * Edge-Compatible Feedback Utilities
 *
 * These functions are extracted from the main feedback modules
 * to avoid pulling in Node.js dependencies via imports.
 *
 * Used by /api/feedback/stream (Edge runtime)
 */

import type { ConversationValidation, PreScreenResult, ExtendedScoreResult } from "./types"
import { SCORING, clampScore } from "../constants"
import {
  assessCommunicationEvidence,
  capSubscoresForCommunicationEvidence,
  capOverallForCommunicationEvidence,
  isSilentSolution,
} from "./scoring/communication-gate"

// ============================================================================
// EXTRACTED EVIDENCE TYPE (duplicated to avoid import chain)
// ============================================================================

export interface ExtractedEvidence {
  approach: {
    explained: boolean
    type: "brute_force" | "optimized" | "unclear" | "none"
    quote: string | null
    messageIndex: number | null
  }
  timeComplexity: {
    mentioned: boolean
    value: string | null
    explanationGiven: boolean
    quote: string | null
    messageIndex: number | null
    isCorrect: boolean | null
  }
  spaceComplexity: {
    mentioned: boolean
    value: string | null
    quote: string | null
    messageIndex: number | null
    isCorrect: boolean | null
  }
  edgeCases: {
    mentionedByCandidate: string[]
    mentionedAfterPrompt: string[]
    missedCritical: string[]
  }
  progression: {
    startedWithBruteForce: boolean
    improvedAfterPrompt: boolean
    selfCorrectedBugs: boolean
    bugQuotes: string[]
  }
  interviewerQuestions: {
    question: string
    answered: boolean
    answerQuality: "good" | "partial" | "poor" | "unanswered"
    quote: string | null
  }[]
  communication: {
    explainedWhileCoding: boolean
    askedClarifyingQuestions: boolean
    respondedToFeedback: boolean
    quotes: string[]
  }
  hints: {
    totalGiven: number
    usedEffectively: boolean
    copiedBlindly: boolean
  }
}

// ============================================================================
// AI CODE OVERLAP DETECTION (Edge-compatible)
// ============================================================================

export interface AICodeOverlapResult {
  hasHighOverlap: boolean
  overlapPercentage: number
  modificationsMade: boolean
  explanation: string
}

/**
 * Extract code blocks from AI Partner conversation
 */
function extractCodeFromPartnerMessages(
  messages: Array<{ role: string; content: string }> | undefined
): string[] {
  if (!messages || !Array.isArray(messages)) return []

  const codeBlocks: string[] = []
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g

  for (const msg of messages) {
    if (msg.role !== "model" && msg.role !== "assistant") continue

    let match
    while ((match = codeBlockRegex.exec(msg.content)) !== null) {
      const code = match[1].trim()
      if (code.length > 20) {
        codeBlocks.push(code)
      }
    }
  }

  return codeBlocks
}

/**
 * Normalize code for comparison
 */
function normalizeCode(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .replace(/#.*$/gm, "") // Remove Python comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/['"]/g, '"') // Normalize quotes
    .toLowerCase()
    .trim()
}

/**
 * Calculate similarity between two code strings
 */
function calculateCodeSimilarity(code1: string, code2: string): number {
  const norm1 = normalizeCode(code1)
  const norm2 = normalizeCode(code2)

  if (norm1.length === 0 || norm2.length === 0) return 0
  if (norm1 === norm2) return 100

  // Jaccard similarity on character trigrams
  const getTrigrams = (str: string): Set<string> => {
    const trigrams = new Set<string>()
    for (let i = 0; i <= str.length - 3; i++) {
      trigrams.add(str.substring(i, i + 3))
    }
    return trigrams
  }

  const trigrams1 = getTrigrams(norm1)
  const trigrams2 = getTrigrams(norm2)

  let intersection = 0
  for (const t of trigrams1) {
    if (trigrams2.has(t)) intersection++
  }

  const union = trigrams1.size + trigrams2.size - intersection
  return union > 0 ? (intersection / union) * 100 : 0
}

/**
 * Analyze overlap between user's code and AI Partner suggestions
 */
export function analyzeAICodeOverlap(
  userCode: string | null | undefined,
  partnerMessages: Array<{ role: string; content: string }> | string[] | undefined
): AICodeOverlapResult {
  if (!userCode || userCode.trim().length < 20) {
    return {
      hasHighOverlap: false,
      overlapPercentage: 0,
      modificationsMade: true,
      explanation: "No meaningful code to analyze",
    }
  }

  // Handle both formats
  const messages = Array.isArray(partnerMessages)
    ? partnerMessages.map((m) => (typeof m === "string" ? { role: "model", content: m } : m))
    : []

  const aiCodeBlocks = extractCodeFromPartnerMessages(messages)

  if (aiCodeBlocks.length === 0) {
    return {
      hasHighOverlap: false,
      overlapPercentage: 0,
      modificationsMade: true,
      explanation: "No AI Partner code suggestions found",
    }
  }

  // Find highest overlap
  let maxOverlap = 0
  for (const aiCode of aiCodeBlocks) {
    const similarity = calculateCodeSimilarity(userCode, aiCode)
    maxOverlap = Math.max(maxOverlap, similarity)
  }

  // 85%+ is concerning, 70-85% might be okay with modifications
  const hasHighOverlap = maxOverlap >= 85
  const modificationsMade = maxOverlap < 95

  return {
    hasHighOverlap,
    overlapPercentage: Math.round(maxOverlap),
    modificationsMade,
    explanation: hasHighOverlap
      ? `High similarity (${Math.round(maxOverlap)}%) with AI suggestions`
      : `Code appears to be original work`,
  }
}

// ============================================================================
// SCORING ALGORITHMS (Edge-compatible)
// ============================================================================

/**
 * Default validation result - returns full ConversationValidation type
 */
export function getDefaultValidation(): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 30,
  }
}

/**
 * Calculate validated scores based on test results and AI validation
 */
export function calculateValidatedScores(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number } | null | undefined,
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation,
  scenarioType: string,
  code: string | null | undefined,
  extractedEvidence?: ExtractedEvidence | null
): ExtendedScoreResult {
  // ?? alone misses NaN: a garbage efficiencyScore propagated into the base
  // arithmetic and clampScore zeroed understanding for the whole session.
  const rawEfficiencyScore = efficiencyMetrics?.efficiencyScore
  const efficiencyScore = Number.isFinite(rawEfficiencyScore)
    ? Math.min(100, Math.max(0, rawEfficiencyScore as number))
    : 50

  // Base scores from test performance
  let understanding = passRate * 0.4 + efficiencyScore * 0.3
  let problemSolving = passRate * 0.5 + efficiencyScore * 0.3
  let codeQuality = passRate * 0.5 + efficiencyScore * 0.4
  let communication = 30 // Base communication score

  // Approach explanation bonus
  if (aiValidation.approachExplained) {
    understanding += 20
    communication += 30
  }

  // Complexity discussion bonus
  if (aiValidation.complexityDiscussed) {
    understanding += aiValidation.complexityAccurate ? 10 : 5
    communication += aiValidation.complexityAccurate ? 20 : 10
  }

  // Edge cases bonus
  if (aiValidation.edgeCasesConsidered) {
    problemSolving += 10
    communication += 10
  }

  // Clean solution bonus
  if (passRate >= 90 && efficiencyScore >= 70) {
    codeQuality += 10
  }

  // Clamp all scores
  understanding = clampScore(understanding)
  problemSolving = clampScore(problemSolving)
  codeQuality = clampScore(codeQuality)
  communication = clampScore(communication)

  // Communication-evidence gate: pass rate alone cannot earn Understanding or
  // Problem-Solving when the candidate said (nearly) nothing. Same rule as the
  // instant accumulator and the Node scorers, so instant and refined agree.
  const commEvidenceLevel = assessCommunicationEvidence({
    candidateMessageCount: preScreen.candidateMessageCount,
    approachExplained: aiValidation.approachExplained,
    complexityDiscussed: aiValidation.complexityDiscussed,
  })
  const gated = capSubscoresForCommunicationEvidence(
    { understanding, problemSolving },
    commEvidenceLevel
  )
  understanding = gated.understanding
  problemSolving = gated.problemSolving

  // Calculate overall based on scenario type. Weights come from SCORING in lib/constants.ts,
  // the same source every other scoring module reads, so the Edge route cannot drift from the
  // Node route. These were previously hard-coded here and had drifted on all three scenario
  // types: DSA transposed CODE_QUALITY/COMMUNICATION (0.3/0.2 vs 0.2/0.3), bugfix transposed
  // UNDERSTANDING/PROBLEM_SOLVING (0.25/0.35 vs 0.35/0.25), and system-design used
  // 0.2/0.2/0.1/0.5 against a canonical 0.2/0.3/0.2/0.3.
  const w =
    scenarioType === "system-design"
      ? SCORING.SYSTEM_DESIGN_WEIGHTS
      : scenarioType === "bugfix"
        ? SCORING.BUG_FIX_WEIGHTS
        : SCORING.PERFORMANCE_WEIGHTS
  let overall =
    understanding * w.UNDERSTANDING +
    problemSolving * w.PROBLEM_SOLVING +
    codeQuality * w.CODE_QUALITY +
    communication * w.COMMUNICATION

  overall = capOverallForCommunicationEvidence(overall, commEvidenceLevel)

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall: Math.round(overall),
    silentSolution: isSilentSolution(commEvidenceLevel, passRate),
  }
}

/**
 * Apply score floors based on test results
 */
export function applyScoreFloors(
  scores: ExtendedScoreResult,
  passRate: number,
  efficiencyScore: number | undefined,
  aiValidation: ConversationValidation
): ExtendedScoreResult {
  const result = { ...scores }

  // All tests passing = minimum 70 overall — but ONLY when the candidate actually
  // interviewed. Silent perfect solutions keep the communication-gate caps; the
  // code itself is still credited via the codeQuality floor below.
  // INVARIANT: this overall floor must stay gated on exactly
  // (approachExplained || complexityDiscussed) — the same disjunction that
  // forces assessCommunicationEvidence to "adequate". That coincidence is the
  // only thing preventing the floor from out-raising the gate's overall cap
  // (which calculateValidatedScores applied before this function runs).
  // Widening this condition reopens the silent-session bypass.
  if (passRate >= 100) {
    if (aiValidation.approachExplained || aiValidation.complexityDiscussed) {
      result.overall = Math.max(result.overall, 70)
      result.problemSolving = Math.max(result.problemSolving, 70)
    }
    result.codeQuality = Math.max(result.codeQuality, 75)
  }

  // High efficiency = minimum code quality
  if ((efficiencyScore ?? 50) >= 80) {
    result.codeQuality = Math.max(result.codeQuality, 70)
  }

  // Good communication = minimum communication score
  if (aiValidation.approachExplained && aiValidation.complexityDiscussed) {
    result.communication = Math.max(result.communication, 65)
  }

  return result
}

// ============================================================================
// EVIDENCE SUMMARY (Edge-compatible)
// ============================================================================

// Simpler edge evidence type from extractConversationEvidenceEdge
interface EdgeExtractedEvidence {
  approach: { explained: boolean; quote?: string }
  timeComplexity: { mentioned: boolean; value?: string; isCorrect?: boolean }
  edgeCases: { mentionedByCandidate: string[] }
}

/**
 * Build human-readable summary from extracted evidence
 * Handles both full ExtractedEvidence and simpler EdgeExtractedEvidence
 */
export function buildEvidenceSummary(
  evidence: ExtractedEvidence | EdgeExtractedEvidence | null | undefined
): string {
  if (!evidence) return ""

  const sections: string[] = []

  // Approach
  sections.push(`## APPROACH`)
  if (evidence.approach?.explained) {
    const type = (evidence.approach as { type?: string }).type || "explained"
    sections.push(`- Candidate explained approach: YES (${type})`)
    if (evidence.approach.quote) {
      sections.push(`- Quote: ${evidence.approach.quote}`)
    }
  } else {
    sections.push(`- Candidate explained approach: NO`)
  }

  // Complexity
  sections.push(`\n## COMPLEXITY DISCUSSION`)
  if (evidence.timeComplexity?.mentioned) {
    sections.push(
      `- Time complexity discussed: YES - ${evidence.timeComplexity.value || "unknown"}`
    )
    const explanationGiven = (evidence.timeComplexity as { explanationGiven?: boolean })
      .explanationGiven
    if (explanationGiven !== undefined) {
      sections.push(`- Explanation given: ${explanationGiven ? "YES" : "NO"}`)
    }
    sections.push(
      `- Correct: ${evidence.timeComplexity.isCorrect === null || evidence.timeComplexity.isCorrect === undefined ? "Unknown" : evidence.timeComplexity.isCorrect ? "YES" : "NO"}`
    )
    const quote = (evidence.timeComplexity as { quote?: string }).quote
    if (quote) {
      sections.push(`- Quote: ${quote}`)
    }
  } else {
    sections.push(`- Time complexity discussed: NO`)
  }

  // Space complexity (only in full evidence)
  const spaceComplexity = (evidence as ExtractedEvidence).spaceComplexity
  if (spaceComplexity?.mentioned) {
    sections.push(`- Space complexity discussed: YES - ${spaceComplexity.value}`)
  }

  // Edge cases
  sections.push(`\n## EDGE CASES`)
  const edgeCases = evidence.edgeCases
  if (edgeCases?.mentionedByCandidate?.length > 0) {
    sections.push(
      `- Mentioned BEFORE interviewer asked: ${edgeCases.mentionedByCandidate.join(", ")}`
    )
    sections.push(`  -> DO NOT say "didn't mention edge cases" - they did!`)
  }
  // These properties only exist in full ExtractedEvidence
  const fullEdgeCases = edgeCases as ExtractedEvidence["edgeCases"] | undefined
  if (fullEdgeCases?.mentionedAfterPrompt && fullEdgeCases.mentionedAfterPrompt.length > 0) {
    sections.push(
      `- Mentioned AFTER interviewer asked: ${fullEdgeCases.mentionedAfterPrompt.join(", ")}`
    )
  }
  if (fullEdgeCases?.missedCritical && fullEdgeCases.missedCritical.length > 0) {
    sections.push(`- Missed critical edge cases: ${fullEdgeCases.missedCritical.join(", ")}`)
  }

  // Progression (only in full evidence)
  const progression = (evidence as ExtractedEvidence).progression
  if (progression) {
    sections.push(`\n## PROBLEM-SOLVING PROGRESSION`)
    if (progression.startedWithBruteForce) {
      sections.push(`- Started with brute force: YES`)
      if (progression.improvedAfterPrompt) {
        sections.push(`- Improved to optimal: YES (POSITIVE SIGNAL - give credit!)`)
      }
    }
    if (progression.selfCorrectedBugs) {
      sections.push(`- Self-corrected bugs: YES (POSITIVE SIGNAL!)`)
      progression.bugQuotes?.forEach((q) => sections.push(`  - ${q}`))
    }
  }

  // Questions answered (only in full evidence)
  const interviewerQuestions = (evidence as ExtractedEvidence).interviewerQuestions
  if (interviewerQuestions?.length > 0) {
    sections.push(`\n## QUESTIONS ANSWERED`)
    const answered = interviewerQuestions.filter((q) => q.answered)
    const total = interviewerQuestions.length
    sections.push(`- ${answered.length}/${total} interviewer questions answered`)
    interviewerQuestions.slice(0, 5).forEach((q) => {
      sections.push(`- Q: "${q.question.substring(0, 50)}..." -> ${q.answerQuality}`)
    })
  }

  // Communication (only in full evidence)
  const communication = (evidence as ExtractedEvidence).communication
  if (communication) {
    sections.push(`\n## COMMUNICATION`)
    sections.push(`- Explained while coding: ${communication.explainedWhileCoding ? "YES" : "NO"}`)
    sections.push(
      `- Asked clarifying questions: ${communication.askedClarifyingQuestions ? "YES" : "NO"}`
    )
    sections.push(`- Responded to feedback: ${communication.respondedToFeedback ? "YES" : "NO"}`)
  }

  // Hints (only in full evidence)
  const hints = (evidence as ExtractedEvidence).hints
  if (hints) {
    sections.push(`\n## HINTS`)
    sections.push(`- Total hints given: ${hints.totalGiven}`)
  }

  return sections.join("\n")
}
