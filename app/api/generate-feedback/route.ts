import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { generateFeedbackResponse, generateAIResponse } from "@/lib/ai-providers"
import { trackFeedbackGenerationServer } from "@/lib/analytics-server"

// Structured feedback schema - NEW GRADING CRITERIA
// Aligned with real Meta/Google AI-assisted interview scoring
interface FeedbackScores {
  // New grading criteria
  understanding: number       // 30% - Can you explain your approach?
  problemSolving: number      // 25% - Debug & optimize
  codeQuality: number         // 25% - Clean & efficient
  communication: number       // 20% - Think out loud
  // Legacy (kept for backward compatibility)
  correctness: number
  efficiency: number
  reasoningExplanation: number
  aiCollaboration: number
  overall: number
}

interface StructuredFeedback {
  scores: FeedbackScores
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  aiWatchlist: string
  rawFeedback: string
}

/**
 * AI-validated conversation analysis results
 * This is what the AI returns after semantic analysis
 */
interface ConversationValidation {
  // Coherence checks - is this real communication or gibberish?
  isCoherent: boolean              // Are responses actual sentences?
  responsesRelevant: boolean       // Do responses relate to questions asked?

  // Approach explanation quality
  approachExplained: boolean       // Did they explain their approach?
  approachQuality: 'none' | 'poor' | 'basic' | 'good' | 'excellent'

  // Complexity analysis - validated against actual code
  complexityDiscussed: boolean     // Did they mention complexity?
  complexityAccurate: boolean      // Was their stated complexity CORRECT?
  statedComplexity: string | null  // What they claimed (e.g., "O(n)")

  // Question-answer quality
  questionsAsked: number           // How many questions interviewer asked
  questionsAnswered: number        // How many were substantively answered

  // Technical discussion depth
  edgeCasesConsidered: boolean
  alternativesDiscussed: boolean

  // Overall communication quality (0-100)
  communicationScore: number
}

/**
 * STEP 1: Basic algorithmic pre-screening (fast, no AI)
 * Detects obvious signals and filters out empty/minimal conversations
 */
function preScreenConversation(transcript: Array<{ role: string; content: string }> | undefined): {
  hasContent: boolean
  candidateMessageCount: number
  avgMessageLength: number
  hasKeywords: {
    complexity: boolean
    approach: boolean
    alternatives: boolean
    edgeCases: boolean
  }
  suspiciousPatterns: {
    tooShort: boolean
    possibleGibberish: boolean
    keywordStuffing: boolean
  }
} {
  if (!transcript || transcript.length === 0) {
    return {
      hasContent: false,
      candidateMessageCount: 0,
      avgMessageLength: 0,
      hasKeywords: { complexity: false, approach: false, alternatives: false, edgeCases: false },
      suspiciousPatterns: { tooShort: true, possibleGibberish: false, keywordStuffing: false }
    }
  }

  const candidateMessages = transcript.filter(m => m.role === 'candidate')
  const candidateContent = candidateMessages.map(m => m.content)
  const allContent = candidateContent.join(' ').toLowerCase()

  // Calculate message stats
  const totalLength = candidateContent.reduce((sum, m) => sum + m.length, 0)
  const avgLength = totalLength / Math.max(1, candidateMessages.length)

  // Keyword detection (basic signals)
  const hasKeywords = {
    complexity: /\b(time complexity|space complexity|big o|o\(n\)|o\(1\)|o\(n\^2\)|o\(log|linear|constant|quadratic)\b/i.test(allContent),
    approach: /\b(approach|strategy|algorithm|method|idea|plan|first|then|next|iterate|loop|hash|set|map|array)\b/i.test(allContent),
    alternatives: /\b(alternative|another way|different approach|could also|other option|instead of|trade-?off|brute force|optimiz)\b/i.test(allContent),
    edgeCases: /\b(edge case|corner case|empty|null|negative|zero|duplicate|boundary|special case|what if|overflow)\b/i.test(allContent)
  }

  // Suspicious pattern detection
  const wordCount = allContent.split(/\s+/).filter(w => w.length > 0).length
  const uniqueWords = new Set(allContent.split(/\s+/).filter(w => w.length > 2))
  const uniqueRatio = uniqueWords.size / Math.max(1, wordCount)

  // Gibberish detection: very low unique word ratio suggests repetition/nonsense
  const possibleGibberish = wordCount > 20 && uniqueRatio < 0.3

  // Keyword stuffing: high keyword density without substance
  const keywordCount = Object.values(hasKeywords).filter(Boolean).length
  const keywordStuffing = keywordCount >= 3 && avgLength < 50 && wordCount < 30

  return {
    hasContent: candidateMessages.length > 0 && totalLength > 10,
    candidateMessageCount: candidateMessages.length,
    avgMessageLength: avgLength,
    hasKeywords,
    suspiciousPatterns: {
      tooShort: avgLength < 20,
      possibleGibberish,
      keywordStuffing
    }
  }
}

/**
 * STEP 2: AI validation of conversation quality
 * Only called if pre-screening passes basic checks
 * Returns structured validation that algorithm uses for scoring
 */
async function validateConversationWithAI(
  transcript: Array<{ role: string; content: string }>,
  code: string,
  actualComplexity: { time: string; space: string } | null
): Promise<ConversationValidation> {
  // Prepare conversation for AI (truncate to save tokens)
  const recentMessages = transcript.slice(-15) // Last 15 messages max
  const conversationText = recentMessages.map(m =>
    `[${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}${m.content.length > 300 ? '...' : ''}`
  ).join('\n')

  // Count interviewer questions
  const interviewerQuestions = transcript.filter(m =>
    m.role === 'interviewer' && m.content.includes('?')
  ).length

  const validationPrompt = `Analyze this coding interview conversation and return ONLY valid JSON.

CONVERSATION:
${conversationText}

CANDIDATE'S CODE (for complexity verification):
\`\`\`
${code.slice(0, 1000)}
\`\`\`

ACTUAL CODE COMPLEXITY: Time=${actualComplexity?.time || 'unknown'}, Space=${actualComplexity?.space || 'unknown'}

Analyze and return this exact JSON structure (no markdown, no explanation):
{
  "isCoherent": true/false,
  "responsesRelevant": true/false,
  "approachExplained": true/false,
  "approachQuality": "none|poor|basic|good|excellent",
  "complexityDiscussed": true/false,
  "complexityAccurate": true/false,
  "statedComplexity": "O(n)" or null,
  "questionsAsked": ${interviewerQuestions},
  "questionsAnswered": number,
  "edgeCasesConsidered": true/false,
  "alternativesDiscussed": true/false,
  "communicationScore": 0-100
}

VALIDATION RULES:
- isCoherent: false if responses are gibberish, random words, or nonsensical
- responsesRelevant: false if candidate responses don't relate to questions asked
- complexityAccurate: ONLY true if stated complexity matches actual code complexity
- communicationScore: 0-30 if incoherent, 30-50 if minimal, 50-70 if basic, 70-85 if good, 85-100 if excellent

Return ONLY the JSON object, nothing else.`

  try {
    const response = await generateAIResponse(
      'You are a technical interview evaluator. Return only valid JSON, no markdown.',
      validationPrompt,
      [],
      { complexity: 'simple', temperature: 0.1 } // Low temp for consistent JSON
    )

    // Parse AI response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        isCoherent: Boolean(parsed.isCoherent),
        responsesRelevant: Boolean(parsed.responsesRelevant),
        approachExplained: Boolean(parsed.approachExplained),
        approachQuality: parsed.approachQuality || 'none',
        complexityDiscussed: Boolean(parsed.complexityDiscussed),
        complexityAccurate: Boolean(parsed.complexityAccurate),
        statedComplexity: parsed.statedComplexity || null,
        questionsAsked: Number(parsed.questionsAsked) || interviewerQuestions,
        questionsAnswered: Number(parsed.questionsAnswered) || 0,
        edgeCasesConsidered: Boolean(parsed.edgeCasesConsidered),
        alternativesDiscussed: Boolean(parsed.alternativesDiscussed),
        communicationScore: Math.min(100, Math.max(0, Number(parsed.communicationScore) || 50))
      }
    }
  } catch (error) {
    console.error('AI validation parsing error:', error)
  }

  // Fallback if AI validation fails
  return getDefaultValidation()
}

/**
 * Default validation when AI call fails or is skipped
 */
function getDefaultValidation(): ConversationValidation {
  return {
    isCoherent: true, // Assume coherent if we can't validate
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: 'none',
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 40
  }
}

/**
 * SYSTEM DESIGN SCORING - focused on architecture and discussion quality
 * No test pass rate since system design is discussion-based
 */
function calculateSystemDesignScores(
  preScreen: ReturnType<typeof preScreenConversation>,
  aiValidation: ConversationValidation
): {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
} {
  // System design evaluation criteria (based on industry standards):
  // - Requirements Gathering: Did they ask clarifying questions?
  // - Architecture: Did they propose clear components?
  // - Scalability: Did they discuss scaling concerns?
  // - Trade-offs: Did they explain pros/cons of choices?
  // - Communication: Did they communicate clearly?

  // UNDERSTANDING = Requirements gathering + approach explanation
  let understanding = 40 // Base score for system design
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 40,
      'good': 30,
      'basic': 15,
      'poor': 5,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(95, understanding + approachBonus)
  }

  // PROBLEM-SOLVING = Architecture quality + alternatives discussed
  let problemSolving = 40 // Base score
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(90, problemSolving + 25)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 20)
  }

  // CODE QUALITY = For system design, this becomes "Design Quality"
  // Based on discussion depth and coherence
  let codeQuality = 50 // Base score (no actual code for system design)
  if (aiValidation.isCoherent && preScreen.hasContent) {
    // Reward depth of discussion
    const messageCount = preScreen.candidateMessageCount || 0
    if (messageCount >= 10) codeQuality = Math.min(90, codeQuality + 30)
    else if (messageCount >= 5) codeQuality = Math.min(80, codeQuality + 20)
    else if (messageCount >= 2) codeQuality = Math.min(70, codeQuality + 10)
  }

  // COMMUNICATION = Most important for system design interviews
  let communication = 30 // Base
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  } else if (!aiValidation.responsesRelevant) {
    communication = Math.min(40, aiValidation.communicationScore)
  } else {
    communication = aiValidation.communicationScore
    // Bonus for answering interviewer questions
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.8) communication = Math.min(95, communication + 10)
      else if (answerRate >= 0.5) communication = Math.min(90, communication + 5)
    }
  }

  // System design weighting: Communication is most important
  const overall = Math.round(
    understanding * 0.20 +      // Requirements & understanding
    problemSolving * 0.30 +     // Architecture & scalability
    codeQuality * 0.20 +        // Design depth
    communication * 0.30        // Critical for system design
  )

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall
  }
}

/**
 * BUG FIX SCORING - emphasize debugging process and root cause analysis
 */
function calculateBugFixScores(
  passRate: number,
  preScreen: ReturnType<typeof preScreenConversation>,
  aiValidation: ConversationValidation
): {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
} {
  // Bug fix evaluation criteria:
  // - Did they find the bug? (test pass rate is key indicator)
  // - Did they explain the root cause?
  // - Did they fix it cleanly?
  // - Did they consider edge cases?

  // UNDERSTANDING = Bug identification + root cause explanation
  let understanding = 20
  if (passRate >= 80) {
    understanding = Math.min(85, passRate) // Found and fixed the bug
  } else if (passRate >= 50) {
    understanding = passRate + 10 // Partial fix
  } else {
    understanding = Math.max(20, passRate + 15) // Base for attempting
  }

  // Bonus for explaining the bug
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 15,
      'good': 10,
      'basic': 5,
      'poor': 2,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(98, understanding + approachBonus)
  }

  // PROBLEM-SOLVING = Debugging approach + fix quality
  let problemSolving = Math.round(passRate * 0.7 + 15) // Base on fix success
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 10)
  }
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  // CODE QUALITY = Clean fix, not hacky workaround
  const codeQuality = Math.min(100, Math.round(passRate * 0.8 + 20))

  // COMMUNICATION = Explaining the debugging process
  let communication = 30
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  } else {
    communication = aiValidation.communicationScore
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.7) communication = Math.min(95, communication + 5)
    }
  }

  // Bug fix weighting: Understanding the bug is most important
  const overall = Math.round(
    understanding * 0.35 +      // Finding + explaining the bug
    problemSolving * 0.25 +     // Debugging approach
    codeQuality * 0.20 +        // Clean fix
    communication * 0.20        // Explaining process
  )

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall
  }
}

/**
 * STEP 3: Calculate final scores using both algorithmic signals and AI validation
 */
function calculateValidatedScores(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number } | undefined,
  preScreen: ReturnType<typeof preScreenConversation>,
  aiValidation: ConversationValidation,
  scenarioType?: string
): {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
} {
  // SYSTEM DESIGN SCORING - conversation-based, no test pass rate
  if (scenarioType === 'system-design') {
    return calculateSystemDesignScores(preScreen, aiValidation)
  }

  // BUG FIX SCORING - emphasize debugging process
  if (scenarioType === 'bugfix') {
    return calculateBugFixScores(passRate, preScreen, aiValidation)
  }

  // DSA SCORING (default) - test pass rate + code quality
  // === UNDERSTANDING SCORE (30%) ===
  // Primary: test pass rate (proves they understood the problem)
  // Secondary: approach explanation quality
  let understanding = 0
  if (passRate >= 80) {
    understanding = Math.min(85, passRate)
  } else if (passRate >= 50) {
    understanding = passRate + 5
  } else {
    understanding = Math.max(20, passRate)
  }

  // Bonus for explaining approach (only if AI validated as real explanation)
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 12,
      'good': 8,
      'basic': 4,
      'poor': 2,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(98, understanding + approachBonus)
  }

  // Bonus for ACCURATE complexity discussion (not just mentioning it)
  if (aiValidation.complexityDiscussed && aiValidation.complexityAccurate) {
    understanding = Math.min(98, understanding + 5)
  } else if (aiValidation.complexityDiscussed && !aiValidation.complexityAccurate) {
    // Penalty for wrong complexity claim
    understanding = Math.max(20, understanding - 5)
  }

  // === PROBLEM-SOLVING SCORE (25%) ===
  // Primary: test pass rate + code efficiency
  // Secondary: edge cases and alternatives discussed
  const effScore = efficiencyMetrics?.efficiencyScore || 50
  let problemSolving = Math.round((passRate * 0.6) + (effScore * 0.4))

  // Bonus only if AI validated these as real discussions (not keyword stuffing)
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 5)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  // === CODE QUALITY SCORE (25%) ===
  // Purely algorithmic - based on test results and efficiency
  // This CAN'T be gamed through conversation
  const codeQuality = Math.min(100, Math.round(
    passRate * 0.50 +
    effScore * 0.30 +
    50 * 0.20
  ))

  // === COMMUNICATION SCORE (20%) ===
  // This is where AI validation matters most
  let communication = 30 // Base

  // If AI detected incoherence or gibberish, cap severely
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  }
  // If responses weren't relevant to questions, penalize
  else if (!aiValidation.responsesRelevant) {
    communication = Math.min(40, aiValidation.communicationScore)
  }
  // If pre-screening detected suspicious patterns (keyword stuffing), cap
  else if (preScreen.suspiciousPatterns.keywordStuffing) {
    communication = Math.min(35, aiValidation.communicationScore)
  }
  // Otherwise use AI's communication score
  else {
    communication = aiValidation.communicationScore

    // Small bonus if they answered most interviewer questions
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.8) {
        communication = Math.min(95, communication + 5)
      }
    }
  }

  // Floor for candidates who at least had a real conversation
  if (preScreen.hasContent && preScreen.candidateMessageCount >= 2 && aiValidation.isCoherent) {
    communication = Math.max(40, communication)
  }

  // === OVERALL SCORE ===
  const overall = Math.round(
    understanding * 0.30 +
    problemSolving * 0.25 +
    codeQuality * 0.25 +
    communication * 0.20
  )

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall
  }
}

/**
 * Apply score floors for correct solutions
 * A perfect, optimal solution should never get a failing grade
 */
function applyScoreFloors(
  scores: ReturnType<typeof calculateValidatedScores>,
  passRate: number,
  efficiencyScore: number | undefined,
  aiValidation: ConversationValidation
): ReturnType<typeof calculateValidatedScores> {
  const isOptimal = (efficiencyScore || 0) >= 80
  const hasGoodComm = aiValidation.communicationScore >= 60 && aiValidation.isCoherent

  let overall = scores.overall

  if (passRate >= 100 && isOptimal && hasGoodComm) {
    overall = Math.max(85, overall) // A range
  } else if (passRate >= 100 && isOptimal) {
    overall = Math.max(78, overall) // B+ range
  } else if (passRate >= 100) {
    overall = Math.max(72, overall) // B range
  } else if (passRate >= 90) {
    overall = Math.max(68, overall) // B- range
  } else if (passRate >= 80) {
    overall = Math.max(62, overall) // C+ range
  }

  return { ...scores, overall }
}



/**
 * Parse structured sections from feedback
 */
function parseFeedbackSections(feedback: string): Partial<StructuredFeedback> {
  const sections: Partial<StructuredFeedback> = {}

  // Extract TL;DR
  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([^\n*]+)/i)
  if (tldrMatch) {
    sections.tldr = tldrMatch[1].trim()
  }

  // Extract What Worked (bullet points)
  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[\s\S]*?((?:-[^\n]+\n?)+)/i)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  // Extract Fix Next
  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[\s\S]*?((?:-[^\n]+\n?)+)/i)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  // Extract Action Plan
  const actionMatch = feedback.match(/\*\*Action Plan\*\*[\s\S]*?((?:\d+\.[^\n]+\n?)+)/i)
  if (actionMatch) {
    sections.actionPlan = actionMatch[1]
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  // Extract AI Watchlist
  const watchlistMatch = feedback.match(/\*\*AI\s*(?:&|and)?\s*Communication Watchlist\*\*[:\s]*([^\n]+(?:\n[^*\n]+)*)/i)
  if (watchlistMatch) {
    sections.aiWatchlist = watchlistMatch[1].trim()
  }

  return sections
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget)
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const startTime = Date.now()

  try {
    const { code, scenarioTitle, scenarioType, testResults, language, timeSpent, aiCollaborationMetrics, interactionMetrics, efficiencyMetrics, conversationTranscript, sessionId, userId } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    // Calculate collaboration message count
    const collaborationMessages = (aiCollaborationMetrics?.partnerMessagesSent || 0) +
      (interactionMetrics?.interviewerQuestionsAnswered || 0)

    // Calculate test metrics
    const testsPassed = testResults?.filter((t: any) => t.passed).length || 0
    const testsTotal = testResults?.length || 0

    // Simplified system instruction - AI generates narrative only, scores are algorithmic
    const systemInstruction = `You are a senior interviewer delivering a focused technical debrief. Be direct and constructive.

IMPORTANT: Scores are PRE-CALCULATED. Just reference them in your feedback. Focus on actionable narrative.

## OUTPUT FORMAT

**TL;DR** – One sentence: what they did well + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Understanding: X/100 – brief justification
- Problem-Solving: X/100 – brief justification
- Code Quality: X/100 – brief justification
- Communication: X/100 – brief justification
- Overall: X/100

**What Worked** (max 3 bullets)
- specific strength with evidence

**Fix Next** (max 3 bullets, prioritized)
- specific improvement with concrete action

**Action Plan** (3 numbered steps)
1. Immediate action
2. Short-term practice
3. Long-term skill development

RULES:
- ~200 words max. Be concise.
- Reference actual data (tests passed, complexity, time).
- Never praise if tests fail. Address failures first.
- Focus on actionable improvements.
`

    const testResultsSummary = testResults && Array.isArray(testResults)
      ? `\n\nTEST RESULTS:\n- Total tests: ${testsTotal}\n- Passed: ${testsPassed}\n- Failed: ${testsTotal - testsPassed}\n`
      : ""

    const timeInfo = timeSpent ? `TIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds` : ""

    // Simplified efficiency info (removed redundant verbose metrics)
    const efficiencyInfo = efficiencyMetrics ? `
CODE EFFICIENCY ANALYSIS:
- Lines of code: ${efficiencyMetrics.linesOfCode || 'N/A'}
- Code complexity level: ${efficiencyMetrics.complexity || 'N/A'}
- Estimated time complexity: ${efficiencyMetrics.estimatedTimeComplexity || 'N/A'}
- Optimal time complexity: ${efficiencyMetrics.optimalTimeComplexity || 'N/A'}
- Estimated space complexity: ${efficiencyMetrics.estimatedSpaceComplexity || 'N/A'}
- Optimal space complexity: ${efficiencyMetrics.optimalSpaceComplexity || 'N/A'}
- Efficiency score: ${efficiencyMetrics.efficiencyScore || 'N/A'}/100
- Time complexity match: ${efficiencyMetrics.estimatedTimeComplexity === efficiencyMetrics.optimalTimeComplexity ? 'YES - Optimal' : 'NO - Suboptimal'}
- Space complexity match: ${efficiencyMetrics.estimatedSpaceComplexity === efficiencyMetrics.optimalSpaceComplexity ? 'YES - Optimal' : 'NO - Suboptimal'}
` : `
CODE EFFICIENCY ANALYSIS:
- No efficiency data available
`

    // HYBRID VALIDATION FLOW:
    // Step 1: Fast algorithmic pre-screening
    // Step 2: AI semantic validation (only if pre-screening passes)
    // Step 3: Calculate scores using both signals
    // Step 4: Apply score floors for correct solutions

    const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0

    // Step 1: Pre-screen conversation (fast, no AI)
    const preScreen = preScreenConversation(conversationTranscript)

    // Step 2: AI validation (only if there's real content to validate)
    // Skip AI call if: no content, gibberish detected, or keyword stuffing
    const shouldValidateWithAI = preScreen.hasContent &&
      !preScreen.suspiciousPatterns.possibleGibberish &&
      !preScreen.suspiciousPatterns.keywordStuffing &&
      preScreen.candidateMessageCount >= 1

    const aiValidation = shouldValidateWithAI
      ? await validateConversationWithAI(
          conversationTranscript,
          code,
          efficiencyMetrics ? {
            time: efficiencyMetrics.estimatedTimeComplexity || 'unknown',
            space: efficiencyMetrics.estimatedSpaceComplexity || 'unknown'
          } : null
        )
      : getDefaultValidation()

    // Step 3: Calculate validated scores using both algorithmic + AI signals
    // Different scoring models for different scenario types
    const validatedScores = calculateValidatedScores(
      passRate,
      efficiencyMetrics,
      preScreen,
      aiValidation,
      scenarioType // Pass scenario type for specialized scoring
    )

    // Step 4: Apply score floors for correct solutions
    const algorithmicScores = applyScoreFloors(
      validatedScores,
      passRate,
      efficiencyMetrics?.efficiencyScore,
      aiValidation
    )

    // Send validated summary to AI for narrative generation
    const conversationSummary = `
COMMUNICATION ANALYSIS (hybrid validated):
- Coherent responses: ${aiValidation.isCoherent ? 'YES' : 'NO - possible gibberish detected'}
- Responses relevant to questions: ${aiValidation.responsesRelevant ? 'YES' : 'NO'}
- Approach explained: ${aiValidation.approachExplained ? `YES (${aiValidation.approachQuality})` : 'NO'}
- Complexity discussed: ${aiValidation.complexityDiscussed ? 'YES' : 'NO'}
- Complexity accurate: ${aiValidation.complexityAccurate ? 'YES' : 'NO - stated: ' + (aiValidation.statedComplexity || 'none')}
- Edge cases considered: ${aiValidation.edgeCasesConsidered ? 'YES' : 'NO'}
- Alternatives discussed: ${aiValidation.alternativesDiscussed ? 'YES' : 'NO'}
- Questions answered: ${aiValidation.questionsAnswered}/${aiValidation.questionsAsked}
- Communication score: ${aiValidation.communicationScore}/100
- Total candidate messages: ${preScreen.candidateMessageCount}

PRE-CALCULATED SCORES (use these as your scores):
- Understanding: ${algorithmicScores.understanding}/100
- Problem-Solving: ${algorithmicScores.problemSolving}/100
- Code Quality: ${algorithmicScores.codeQuality}/100
- Communication: ${algorithmicScores.communication}/100
- Overall: ${algorithmicScores.overall}/100
`

    const prompt = `Generate interview feedback narrative using the pre-calculated scores below.

PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType})` : ''}
LANGUAGE: ${language || 'JavaScript'}
${timeInfo}
${testResultsSummary}
${efficiencyInfo}
${conversationSummary}

SOLUTION CODE:
\`\`\`${language || 'javascript'}
${code.length > 2000 ? code.slice(0, 2000) + '\n// ... [truncated]' : code}
\`\`\`
${testResults && testResults.filter((t: any) => !t.passed).length > 0 ? `
FAILED TESTS (first 3):
${testResults.filter((t: any) => !t.passed).slice(0, 3).map((t: any) =>
      `- ${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`
    ).join('\n')}
` : ''}

IMPORTANT: Use the PRE-CALCULATED SCORES above exactly. Focus on generating helpful narrative feedback, not recalculating scores.`

    // Use AI provider abstraction for narrative feedback only
    const aiResponse = await generateFeedbackResponse(
      systemInstruction,
      prompt,
      [] // No history needed for feedback
    )

    const feedback = aiResponse.text

    // USE ALGORITHMIC SCORES as primary (deterministic, token-efficient)
    // AI-generated narrative is just for user-facing feedback text
    const scores: FeedbackScores = {
      understanding: algorithmicScores.understanding,
      problemSolving: algorithmicScores.problemSolving,
      codeQuality: algorithmicScores.codeQuality,
      communication: algorithmicScores.communication,
      // Legacy scores for backward compatibility
      correctness: algorithmicScores.codeQuality,
      efficiency: efficiencyMetrics?.efficiencyScore || 50,
      reasoningExplanation: algorithmicScores.communication,
      aiCollaboration: collaborationMessages > 0 ? 70 : 50,
      overall: algorithmicScores.overall,
    }

    // Parse structured sections from AI narrative
    const sections = parseFeedbackSections(feedback)

    // Build structured response
    const structuredFeedback: StructuredFeedback = {
      scores,
      tldr: sections.tldr || 'Feedback generated successfully.',
      whatWorked: sections.whatWorked || [],
      fixNext: sections.fixNext || [],
      actionPlan: sections.actionPlan || [],
      aiWatchlist: sections.aiWatchlist || 'No watchlist items captured.',
      rawFeedback: feedback,
    }

    // Track feedback generation
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    if (sessionId) {
      trackFeedbackGenerationServer({
        sessionId,
        userId,
        scenarioType: scenarioType || 'unknown',
        performanceScore: scores.overall,
        durationMinutes,
      }).catch(err => console.error("Analytics tracking error:", err))
    }

    return NextResponse.json({
      feedback: feedback,
      performanceScore: scores.overall,
      scores: scores, // Full score breakdown
      structured: structuredFeedback, // Full structured data
      provider: aiResponse.provider,
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error) {
    console.error("Feedback generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    )
  }
}
