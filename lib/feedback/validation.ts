/**
 * Code validation and AI overlap detection
 *
 * This module provides functions to analyze code similarity and detect
 * if candidates have blindly copied AI Partner suggestions without understanding.
 */

import type { AICodeOverlapResult, ConversationValidation } from './types'
import { generateAIResponse } from '@/lib/ai-providers'
import { logger } from '@/lib/logger'

// ============================================================================
// CODE EXTRACTION AND SIMILARITY
// ============================================================================

/**
 * Extract code blocks from AI Partner conversation
 */
export function extractCodeFromPartnerMessages(messages: Array<{ role: string; content: string }> | undefined): string[] {
  if (!messages || !Array.isArray(messages)) return []

  const codeBlocks: string[] = []
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g

  for (const msg of messages) {
    // Only look at AI Partner (model) responses
    if (msg.role !== 'model' && msg.role !== 'assistant') continue

    let match
    while ((match = codeBlockRegex.exec(msg.content)) !== null) {
      const code = match[1].trim()
      if (code.length > 20) { // Ignore tiny snippets
        codeBlocks.push(code)
      }
    }
  }

  return codeBlocks
}

/**
 * Normalize code for comparison (remove whitespace, comments, variable names don't matter)
 */
export function normalizeCode(code: string): string {
  return code
    .replace(/\/\/.*$/gm, '')           // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove multi-line comments
    .replace(/#.*$/gm, '')              // Remove Python comments
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .replace(/["'`]/g, '"')             // Normalize quotes
    .toLowerCase()
    .trim()
}

/**
 * Calculate similarity between two code strings using longest common subsequence
 */
export function calculateCodeSimilarity(code1: string, code2: string): number {
  const s1 = normalizeCode(code1)
  const s2 = normalizeCode(code2)

  if (s1.length === 0 || s2.length === 0) return 0

  // Use a simple character-level LCS ratio for efficiency
  // For longer strings, we use n-gram comparison
  if (s1.length > 500 || s2.length > 500) {
    // Use 4-gram comparison for longer code
    const ngrams1 = new Set<string>()
    const ngrams2 = new Set<string>()

    for (let i = 0; i <= s1.length - 4; i++) {
      ngrams1.add(s1.substring(i, i + 4))
    }
    for (let i = 0; i <= s2.length - 4; i++) {
      ngrams2.add(s2.substring(i, i + 4))
    }

    let matches = 0
    for (const ng of ngrams1) {
      if (ngrams2.has(ng)) matches++
    }

    const maxSize = Math.max(ngrams1.size, ngrams2.size)
    return maxSize > 0 ? (matches / maxSize) * 100 : 0
  }

  // For shorter code, use exact substring matching
  const minLen = Math.min(s1.length, s2.length)
  let matchingChars = 0

  // Sliding window to find longest matching substring
  for (let windowSize = Math.floor(minLen * 0.8); windowSize >= 10; windowSize -= 5) {
    for (let i = 0; i <= s1.length - windowSize; i++) {
      const substr = s1.substring(i, i + windowSize)
      if (s2.includes(substr)) {
        matchingChars = Math.max(matchingChars, windowSize)
        break
      }
    }
    if (matchingChars > 0) break
  }

  return (matchingChars / minLen) * 100
}

/**
 * Analyze if candidate code heavily copies AI Partner suggestions
 */
export function analyzeAICodeOverlap(
  finalCode: string,
  partnerMessages: Array<{ role: string; content: string }> | undefined
): AICodeOverlapResult {
  if (!finalCode || !partnerMessages || partnerMessages.length === 0) {
    return {
      hasHighOverlap: false,
      overlapPercentage: 0,
      copiedSnippets: [],
      modificationsMade: true,
    }
  }

  const aiCodeBlocks = extractCodeFromPartnerMessages(partnerMessages)
  if (aiCodeBlocks.length === 0) {
    return {
      hasHighOverlap: false,
      overlapPercentage: 0,
      copiedSnippets: [],
      modificationsMade: true,
    }
  }

  // Calculate similarity with each AI code block
  let maxOverlap = 0
  const copiedSnippets: string[] = []

  for (const aiCode of aiCodeBlocks) {
    const similarity = calculateCodeSimilarity(finalCode, aiCode)
    if (similarity > maxOverlap) {
      maxOverlap = similarity
    }
    if (similarity >= 70) {
      copiedSnippets.push(aiCode.substring(0, 100) + (aiCode.length > 100 ? '...' : ''))
    }
  }

  // Check if any modifications were made (compare normalized lengths)
  const normalizedFinal = normalizeCode(finalCode)
  const allAINormalized = aiCodeBlocks.map(normalizeCode).join(' ')
  const modificationsMade = normalizedFinal.length !== allAINormalized.length ||
    normalizedFinal !== allAINormalized

  return {
    hasHighOverlap: maxOverlap >= 70,
    overlapPercentage: Math.round(maxOverlap),
    copiedSnippets,
    modificationsMade,
  }
}

// ============================================================================
// AI CONVERSATION VALIDATION
// ============================================================================

/**
 * STEP 2: AI validation of conversation quality
 * Only called if pre-screening passes basic checks
 * Returns structured validation that algorithm uses for scoring
 */
export async function validateConversationWithAI(
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
- approachExplained: true ONLY if they explicitly described their algorithm/strategy BEFORE or WHILE coding (e.g., "I'll use a hashmap to...", "My approach is..."). Just saying "let me try" or typing code silently does NOT count.
- approachQuality:
  * "none" - No explanation at all, just coded silently
  * "poor" - Single vague sentence like "I'll loop through"
  * "basic" - Mentioned the approach but no reasoning
  * "good" - Explained approach with some reasoning
  * "excellent" - Detailed explanation with trade-offs discussed
- complexityDiscussed: true ONLY if they explicitly mentioned time/space complexity (e.g., "O(n)", "linear time")
- complexityAccurate: ONLY true if stated complexity matches actual code complexity
- communicationScore: Be STRICT - silent coding is poor communication:
  * 0-20: No communication - typed code without talking
  * 20-40: Minimal - answered one question briefly, no approach explanation
  * 40-60: Basic - explained approach OR answered questions, not both
  * 60-80: Good - explained approach AND engaged with questions AND discussed complexity
  * 80-100: Excellent - proactive communication, discussed trade-offs, complexity, edge cases

CRITICAL: If candidate message count < 3 OR average message length < 30 characters, communication score should be < 40.
Solving a problem correctly but SILENTLY is a communication FAILURE in real interviews.

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
    logger.error('AI validation parsing error', { error })
  }

  // Fallback if AI validation fails
  return getDefaultValidation()
}

/**
 * Default validation when AI call fails or is skipped
 * Defaults are CONSERVATIVE - assume no communication happened
 */
export function getDefaultValidation(): ConversationValidation {
  return {
    isCoherent: true,
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
    communicationScore: 25 // Low default - must earn through actual communication
  }
}
