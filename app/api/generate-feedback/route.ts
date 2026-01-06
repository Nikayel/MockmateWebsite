import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { generateFeedbackResponse, generateAIResponse } from "@/lib/ai-providers"
import { trackFeedbackGenerationServer } from "@/lib/analytics-server"
import { buildFeedbackContext } from "@/lib/rag/context-builder"
import { getPatternKnowledge, patternKnowledgeToDocument } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { getUserPerformanceProfile, getUserRecommendations } from "@/lib/rag/user-performance-rag"
import { embedAndStoreSolution } from "@/lib/rag"
import { updateLearningStateAfterSession, completeSessionWithMastery } from "@/lib/learning-state"
import { analyzeAndTrackMisconceptions } from "@/lib/rag/misconception-detection"
import { logger } from "@/lib/logger"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

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
 * AI Partner code overlap analysis
 * Detects if candidate blindly copied AI suggestions without understanding
 */
interface AICodeOverlapResult {
  hasHighOverlap: boolean           // True if >70% of code matches AI suggestions
  overlapPercentage: number         // 0-100
  copiedSnippets: string[]          // Specific snippets that were copied
  modificationsMade: boolean        // Did they modify the AI suggestions at all?
}

/**
 * Extract code blocks from AI Partner conversation
 */
function extractCodeFromPartnerMessages(messages: Array<{ role: string; content: string }> | undefined): string[] {
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
function normalizeCode(code: string): string {
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
function calculateCodeSimilarity(code1: string, code2: string): number {
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
function analyzeAICodeOverlap(
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
function getDefaultValidation(): ConversationValidation {
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

/**
 * Detect if a DSA solution is incomplete/stub code
 * This catches cases where user only wrote base case but no actual algorithm
 *
 * Examples of incomplete solutions:
 * - Just a null check with `pass`
 * - Only base cases, no recursive/iterative logic
 * - Contains `pass`, `...`, `TODO`, `NotImplementedError`
 * - Returns only for edge cases, no main logic
 */
interface IncompleteSolutionAnalysis {
  isIncomplete: boolean
  reason: string
  hasBaseCase: boolean
  hasActualLogic: boolean
  stubPatterns: string[]
}

function analyzeCodeCompleteness(code: string, language: string = 'python'): IncompleteSolutionAnalysis {
  if (!code || !code.trim()) {
    return {
      isIncomplete: true,
      reason: 'Empty solution submitted',
      hasBaseCase: false,
      hasActualLogic: false,
      stubPatterns: ['empty']
    }
  }

  const trimmedCode = code.trim()
  const lines = trimmedCode.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const stubPatterns: string[] = []

  // Detect common stub/placeholder patterns
  const stubIndicators = {
    python: [
      { pattern: /^\s*pass\s*$/m, name: 'pass statement' },
      { pattern: /^\s*\.\.\.\s*$/m, name: 'ellipsis placeholder' },
      { pattern: /raise\s+NotImplementedError/i, name: 'NotImplementedError' },
      { pattern: /#\s*TODO/i, name: 'TODO comment' },
      { pattern: /#\s*FIXME/i, name: 'FIXME comment' },
      { pattern: /#\s*your\s+code\s+here/i, name: 'placeholder comment' },
      { pattern: /#\s*implement\s+here/i, name: 'implement comment' },
    ],
    javascript: [
      { pattern: /throw\s+new\s+Error\s*\(\s*['"]not\s+implemented/i, name: 'not implemented error' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /\/\/\s*FIXME/i, name: 'FIXME comment' },
      { pattern: /\/\/\s*your\s+code\s+here/i, name: 'placeholder comment' },
      { pattern: /return\s*;\s*$/m, name: 'empty return' },
    ],
    typescript: [
      { pattern: /throw\s+new\s+Error\s*\(\s*['"]not\s+implemented/i, name: 'not implemented error' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /\/\/\s*FIXME/i, name: 'FIXME comment' },
      { pattern: /return\s*;\s*$/m, name: 'empty return' },
    ],
    java: [
      { pattern: /throw\s+new\s+UnsupportedOperationException/i, name: 'unsupported operation' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /return\s+null\s*;\s*$/m, name: 'null return only' },
    ]
  }

  const indicators = stubIndicators[language as keyof typeof stubIndicators] || stubIndicators.python
  for (const indicator of indicators) {
    if (indicator.pattern.test(trimmedCode)) {
      stubPatterns.push(indicator.name)
    }
  }

  // Detect base case patterns (null checks, empty checks)
  const baseCasePatterns = [
    /if\s+.*(?:is\s+None|==\s*None|===?\s*null|\.length\s*===?\s*0|==\s*0)\s*:/i,  // Python/JS null checks
    /if\s*\(\s*!?\w+\s*(?:===?\s*null|===?\s*undefined|\.length\s*===?\s*0)\s*\)/i, // JS null checks
    /if\s+(?:not\s+)?(?:root|head|node|arr|nums|s|str)\s*:/i,  // Common variable null checks
    /if\s+len\s*\(\s*\w+\s*\)\s*==\s*0/i,  // Python length check
    /return\s+(?:None|null|undefined|\[\]|\{\})\s*$/m,  // Early return for edge cases
  ]

  let hasBaseCase = false
  for (const pattern of baseCasePatterns) {
    if (pattern.test(trimmedCode)) {
      hasBaseCase = true
      break
    }
  }

  // Detect actual algorithm implementation patterns
  const algorithmPatterns = [
    // Recursion
    /def\s+(\w+).*:[\s\S]*\1\s*\(/,  // Python recursive call
    /function\s+(\w+)[\s\S]*\1\s*\(/,  // JS recursive call
    // Loops
    /for\s+\w+\s+in\s+/,  // Python for-in
    /for\s*\([^)]+\)/,    // JS/Java for loop
    /while\s*[\(:].*:/,   // While loops
    // Data structure operations
    /\.append\s*\(/,
    /\.push\s*\(/,
    /\.pop\s*\(/,
    /\.insert\s*\(/,
    /\[\w+\]\s*=/,        // Array/dict assignment
    // Tree/Node operations
    /\.left\s*=/,
    /\.right\s*=/,
    /\.next\s*=/,
    /\.val\s*=/,
    // Common algorithm patterns
    /left.*right|right.*left/i,  // Two pointer or tree swap
    /temp\s*=|swap/i,            // Swap operation
    /result\s*[+=]/,             // Building result
    /stack\s*[.=\[]|queue\s*[.=\[]/i,  // Stack/Queue usage
    /\bmap\s*\(|\breduce\s*\(|\bfilter\s*\(/,  // Functional patterns
    /return\s+\[.*for.*in/,      // List comprehension return
  ]

  let hasActualLogic = false
  for (const pattern of algorithmPatterns) {
    if (pattern.test(trimmedCode)) {
      hasActualLogic = true
      break
    }
  }

  // Special case: Very short code with only base case and no logic
  // e.g., "if root is None: return None\n    pass"
  const nonCommentLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('//'))
  const isVeryShort = nonCommentLines.length <= 5

  // Check for "base case + pass/return" pattern (incomplete implementation)
  const baseCasePlusStub = /if\s+.*(?:None|null|0)\s*:[\s\S]{0,50}(?:return|pass)[\s\S]{0,20}(?:pass|\.\.\.|$)/i

  // Determine if solution is incomplete
  let isIncomplete = false
  let reason = ''

  if (stubPatterns.length > 0 && !hasActualLogic) {
    isIncomplete = true
    reason = `Solution contains stub patterns (${stubPatterns.join(', ')}) without actual implementation`
  } else if (hasBaseCase && !hasActualLogic && isVeryShort) {
    isIncomplete = true
    reason = 'Solution only handles base/edge cases without implementing the main algorithm'
  } else if (baseCasePlusStub.test(trimmedCode)) {
    isIncomplete = true
    reason = 'Solution has base case check but then just pass/return without actual logic'
  } else if (nonCommentLines.length <= 2 && hasBaseCase) {
    isIncomplete = true
    reason = 'Solution is too short to contain meaningful implementation'
  }

  return {
    isIncomplete,
    reason,
    hasBaseCase,
    hasActualLogic,
    stubPatterns
  }
}

/**
 * Detect if design notes are just the blank template (not filled in)
 * This is CRITICAL for scoring - empty submissions should get low scores
 */
function isBlankDesignTemplate(designNotes: string): boolean {
  if (!designNotes || !designNotes.trim()) {
    return true
  }

  const notes = designNotes.trim()

  // Known template placeholder patterns - these are NOT user content
  const templatePlaceholders = [
    /\/\/\s*-\s*$/m,                           // "// -" (blank bullet point)
    /\/\/\s*$/m,                               // "//" (blank comment line)
    /\/\/\s*\d+\.\s*$/m,                       // "// 1." "// 2." "// 3." (blank numbered items)
    /\/\/\s*POST\s+\/api\/\.{3}/i,             // "// POST /api/..." (template endpoint)
    /\/\/\s*GET\s+\/api\/\.{3}/i,              // "// GET /api/..." (template endpoint)
    /\/\/\s*-\s*Scale:\s*$/im,                 // "// - Scale:" (blank)
    /\/\/\s*-\s*Latency:\s*$/im,               // "// - Latency:" (blank)
    /\/\/\s*-\s*Availability:\s*$/im,          // "// - Availability:" (blank)
    /\/\/\s*Functional:\s*$/im,                // "// Functional:" (section header)
    /\/\/\s*Non-Functional:\s*$/im,            // "// Non-Functional:" (section header)
    /\/\/\s*Key Components:\s*$/im,            // "// Key Components:" (section header)
    /\/\/\s*Tables\/Collections:\s*$/im,       // "// Tables/Collections:" (section header)
    /\/\/\s*Endpoints:\s*$/im,                 // "// Endpoints:" (section header)
    /\/\/\s*DESIGN NOTES:/i,                   // "// DESIGN NOTES:" (header)
    /\/\/\s*Use this space to document/i,      // Template instruction
    /\/\*\s*=+\s*$/m,                          // "/* ===" divider start
    /\s*=+\s*\*\//m,                           // "==== */" divider end
    /^\s*\d+\.\s*(REQUIREMENTS|HIGH-LEVEL|DATA MODEL|API DESIGN|SCALING)/im, // Section titles
  ]

  // Count how many template patterns exist in the notes
  const templatePatternMatches = templatePlaceholders.filter(p => p.test(notes)).length

  // Extract lines and analyze for REAL user content
  const lines = notes.split('\n')

  let realContentLines = 0
  let totalUserAddedChars = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Skip divider blocks (/* === */)
    if (trimmed.startsWith('/*') || trimmed.startsWith('*/') || /^[=\s*\/]+$/.test(trimmed)) {
      continue
    }

    // Skip section headers (numbers followed by section names)
    if (/^\d+\.\s*(REQUIREMENTS|HIGH-LEVEL|DATA MODEL|API DESIGN|SCALING|ARCHITECTURE)/i.test(trimmed)) {
      continue
    }

    // For comment lines, extract actual content
    if (trimmed.startsWith('//')) {
      const content = trimmed.replace(/^\/\/\s*/, '').trim()

      // Skip if it's just a template placeholder
      if (!content || content === '-' || /^\d+\.$/.test(content)) {
        continue
      }

      // Skip known template text patterns
      const isTemplateText = [
        /^DESIGN NOTES:/i,
        /^Use this space/i,
        /^Functional:\s*$/i,
        /^Non-Functional:\s*$/i,
        /^Key Components:\s*$/i,
        /^Tables\/Collections:\s*$/i,
        /^Endpoints:\s*$/i,
        /^POST\s+\/api\/\.{3}/i,
        /^GET\s+\/api\/\.{3}/i,
        /^-\s*Scale:\s*$/i,
        /^-\s*Latency:\s*$/i,
        /^-\s*Availability:\s*$/i,
        /^-\s*$/,
      ].some(p => p.test(content))

      if (isTemplateText) continue

      // This looks like real content - count it if substantial
      if (content.length > 15) {
        realContentLines++
        totalUserAddedChars += content.length
      }
    } else {
      // Non-comment content (actual code or text)
      if (trimmed.length > 10) {
        realContentLines++
        totalUserAddedChars += trimmed.length
      }
    }
  }

  // STRICT VALIDATION:
  // Template has ~40 lines, many template patterns, and no real content
  // User who actually filled it in would have:
  // - Added content to the placeholder sections
  // - Written at least a few sentences about their design
  // - Modified the template meaningfully

  // If most of the content matches template patterns, it's blank
  if (templatePatternMatches >= 8) {
    // High template pattern count - only pass if there's substantial real content
    if (realContentLines < 5 || totalUserAddedChars < 200) {
      return true
    }
  }

  // If very little real content was added, it's essentially blank
  if (realContentLines < 3) {
    return true
  }

  // If total user-added content is minimal (less than a paragraph), it's insufficient
  if (totalUserAddedChars < 100) {
    return true
  }

  return false
}

/**
 * SYSTEM DESIGN SCORING - focused on architecture and discussion quality
 * No test pass rate since system design is discussion-based
 *
 * CRITICAL: This function must be strict about empty/minimal submissions
 * to prevent users gaming the system by not engaging.
 */
function calculateSystemDesignScores(
  preScreen: ReturnType<typeof preScreenConversation>,
  aiValidation: ConversationValidation,
  designNotes?: string
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

  // Check if design notes are blank template
  const hasBlankDesignNotes = designNotes ? isBlankDesignTemplate(designNotes) : true

  // Determine engagement level
  const hasNoConversation = !preScreen.hasContent || preScreen.candidateMessageCount === 0
  const hasMinimalConversation = preScreen.candidateMessageCount > 0 && preScreen.candidateMessageCount < 3
  const hasMinimalContent = preScreen.avgMessageLength < 30 // Very short messages
  const hasNoContent = hasNoConversation && hasBlankDesignNotes

  // CASE 1: Completely empty submission (no conversation + blank template)
  // This is a clear "didn't even try" scenario
  if (hasNoContent) {
    return {
      understanding: 5,   // No requirements gathering - they typed nothing
      problemSolving: 5,  // No architecture discussion - no engagement at all
      codeQuality: 5,     // No design - blank template
      communication: 5,   // Zero communication
      overall: 5          // Fail - did not participate
    }
  }

  // CASE 2: Blank design notes (even with some conversation)
  // Submitted without filling in any design - severely penalize
  if (hasBlankDesignNotes) {
    // Cap all scores at 20 - can't pass without documenting your design
    const maxScore = 20

    // If they didn't even have a real conversation, score even lower
    if (hasMinimalConversation || hasMinimalContent) {
      return {
        understanding: 10,
        problemSolving: 10,
        codeQuality: 10,
        communication: Math.min(15, aiValidation.communicationScore),
        overall: 11 // Clear fail
      }
    }

    // Some conversation but no design notes - partial credit but still failing
    const commScore = Math.min(maxScore, aiValidation.communicationScore)
    return {
      understanding: Math.min(maxScore, aiValidation.approachExplained ? 18 : 12),
      problemSolving: Math.min(maxScore, aiValidation.alternativesDiscussed ? 18 : 12),
      codeQuality: 10, // No design documented
      communication: commScore,
      overall: Math.round((18 + 18 + 10 + commScore) / 5) // ~14-16 range
    }
  }

  // CASE 3: Minimal conversation but some design notes
  // They wrote something but didn't engage with interviewer
  if (hasNoConversation || (hasMinimalConversation && hasMinimalContent)) {
    // Cap scores - can't get good communication score without communicating
    return {
      understanding: 25,  // Some credit for reading the problem
      problemSolving: 25, // Some credit for attempting design notes
      codeQuality: 30,    // They at least wrote something
      communication: 10,  // Did not communicate
      overall: 22         // Low D/F range - need to discuss with interviewer
    }
  }

  // CASE 4: Normal evaluation - has conversation AND design notes
  // Start with base scores and adjust based on quality

  // UNDERSTANDING = Requirements gathering + approach explanation
  let understanding = 25 // Lower base - must earn points
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 55,
      'good': 40,
      'basic': 25,
      'poor': 10,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(95, understanding + approachBonus)
  }
  // Penalize if no coherent discussion
  if (!aiValidation.isCoherent || !aiValidation.responsesRelevant) {
    understanding = Math.max(15, understanding - 25)
  }

  // PROBLEM-SOLVING = Architecture quality + alternatives discussed
  let problemSolving = 25 // Lower base
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(85, problemSolving + 35)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 25)
  }
  // Penalize if no coherent discussion
  if (!aiValidation.isCoherent || !aiValidation.responsesRelevant) {
    problemSolving = Math.max(15, problemSolving - 25)
  }

  // CODE QUALITY = For system design, this becomes "Design Quality/Scalability"
  // Based on discussion depth and coherence
  let codeQuality = 25 // Lower base
  if (aiValidation.isCoherent && preScreen.hasContent) {
    // Reward depth of discussion
    const messageCount = preScreen.candidateMessageCount || 0
    if (messageCount >= 10) codeQuality = Math.min(90, codeQuality + 45)
    else if (messageCount >= 5) codeQuality = Math.min(80, codeQuality + 35)
    else if (messageCount >= 3) codeQuality = Math.min(70, codeQuality + 25)
    else codeQuality = Math.min(55, codeQuality + 15)
  } else {
    codeQuality = Math.max(15, codeQuality - 15)
  }

  // COMMUNICATION = Most important for system design interviews
  let communication = aiValidation.communicationScore

  // Ensure communication score reflects actual engagement
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, communication)
  } else if (!aiValidation.responsesRelevant) {
    communication = Math.min(35, communication)
  }

  // Bonus for answering interviewer questions (only if coherent)
  if (aiValidation.isCoherent && aiValidation.questionsAsked > 0) {
    const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
    if (answerRate >= 0.8) communication = Math.min(95, communication + 10)
    else if (answerRate >= 0.5) communication = Math.min(90, communication + 5)
  }

  // Ensure minimum conversation depth for good communication score
  if (preScreen.candidateMessageCount < 3) {
    communication = Math.min(40, communication)
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
  efficiencyMetrics: { efficiencyScore?: number; difficulty?: string } | undefined,
  preScreen: ReturnType<typeof preScreenConversation>,
  aiValidation: ConversationValidation,
  scenarioType?: string,
  code?: string
): {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
} {
  // SYSTEM DESIGN SCORING - conversation-based, no test pass rate
  if (scenarioType === 'system-design') {
    return calculateSystemDesignScores(preScreen, aiValidation, code)
  }

  // BUG FIX SCORING - emphasize debugging process
  if (scenarioType === 'bugfix') {
    return calculateBugFixScores(passRate, preScreen, aiValidation)
  }

  // DSA SCORING (default) - test pass rate + code quality

  // CRITICAL: Check if solution is incomplete/stub code FIRST
  // This prevents giving credit for edge case handling when the actual algorithm is missing
  const codeCompleteness = code ? analyzeCodeCompleteness(code, 'python') : { isIncomplete: false, reason: '', hasBaseCase: false, hasActualLogic: true, stubPatterns: [] }

  // If solution is incomplete AND has very low pass rate, cap all scores severely
  // This catches cases like: only base case check with 'pass', getting 1 test to pass
  const isIncompleteSolution = codeCompleteness.isIncomplete
  const hasOnlyBaseCasePassing = passRate > 0 && passRate < 30 && codeCompleteness.hasBaseCase && !codeCompleteness.hasActualLogic
  const maxScoreForIncomplete = 25 // Cap at 25% for incomplete solutions

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
  // BUT: Only give complexity bonus if the solution actually works (passRate >= 50)
  // No credit for discussing complexity of a non-working solution
  if (aiValidation.complexityDiscussed && aiValidation.complexityAccurate && passRate >= 50) {
    understanding = Math.min(98, understanding + 5)
  } else if (aiValidation.complexityDiscussed && !aiValidation.complexityAccurate) {
    // Penalty for wrong complexity claim
    understanding = Math.max(20, understanding - 5)
  }

  // CRITICAL: Cap understanding for incomplete solutions
  // Can't claim to "understand" the problem if you didn't implement the solution
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    understanding = Math.min(maxScoreForIncomplete, understanding)
  }

  // === PROBLEM-SOLVING SCORE (25%) ===
  // Primary: test pass rate + code efficiency
  // Secondary: edge cases and alternatives discussed
  const effScore = efficiencyMetrics?.efficiencyScore || 50
  let problemSolving = Math.round((passRate * 0.6) + (effScore * 0.4))

  // Bonus only if AI validated these as real discussions (not keyword stuffing)
  // AND solution has actual implementation
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent && !isIncompleteSolution) {
    problemSolving = Math.min(95, problemSolving + 5)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent && !isIncompleteSolution) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  // CRITICAL: Cap problem-solving for incomplete solutions
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    problemSolving = Math.min(maxScoreForIncomplete, problemSolving)
  }

  // === CODE QUALITY SCORE (25%) ===
  // Purely algorithmic - based on test results and efficiency
  // This CAN'T be gamed through conversation
  let codeQuality = Math.min(100, Math.round(
    passRate * 0.50 +
    effScore * 0.30 +
    50 * 0.20
  ))

  // CRITICAL: Cap code quality for incomplete solutions
  // Stub code with a passing edge case test is NOT quality code
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    codeQuality = Math.min(maxScoreForIncomplete, codeQuality)
  }

  // === COMMUNICATION SCORE (20%) ===
  // CRITICAL: Real interviews require explaining your approach BEFORE coding
  // Passing tests without explanation is NOT good communication
  let communication = 35 // Lower base - must earn through actual communication

  // If AI detected incoherence or gibberish, cap severely
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  }
  // If responses weren't relevant to questions, penalize
  else if (!aiValidation.responsesRelevant) {
    communication = Math.min(45, aiValidation.communicationScore)
  }
  // If pre-screening detected suspicious patterns (keyword stuffing), cap
  else if (preScreen.suspiciousPatterns.keywordStuffing) {
    communication = Math.min(35, aiValidation.communicationScore)
  }
  // Otherwise use AI's communication score
  else {
    communication = aiValidation.communicationScore

    // Bonus if they answered most interviewer questions
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.8) {
        communication = Math.min(90, communication + 5)
      }
    }
  }

  // APPROACH EXPLANATION IS CRITICAL
  // In real interviews, you MUST explain your approach before coding
  const isOptimalSolution = passRate >= 100 && (effScore || 0) >= 80
  const isCorrectSolution = passRate >= 100

  // NO difficulty bonus - easy problems still require communication
  if (aiValidation.approachExplained && aiValidation.isCoherent && aiValidation.approachQuality !== 'none') {
    // Explained approach = this is what we want
    // But quality matters - just saying "I'll loop" isn't enough
    const qualityBonus = {
      'excellent': 20,
      'good': 12,
      'basic': 5,
      'poor': 0,
      'none': 0
    }[aiValidation.approachQuality] || 0

    if (isOptimalSolution) {
      communication = Math.min(95, communication + qualityBonus)
    } else if (isCorrectSolution) {
      communication = Math.min(85, communication + qualityBonus)
    } else {
      communication = Math.min(70, communication + Math.floor(qualityBonus / 2))
    }
  } else {
    // DID NOT explain approach - this is a problem even if solution is correct
    // Real interviewers care about thought process, not just the answer
    if (isCorrectSolution) {
      // Correct but silent = poor communication, cap at 45
      communication = Math.min(45, communication)
    } else {
      // Wrong AND silent = very poor communication
      communication = Math.min(35, communication)
    }
  }

  // Minimum floor only if they actually had MEANINGFUL conversation
  // Requires: 3+ messages, approach explained with at least basic quality
  // NOTE: This floor is HIGHER than silent solution caps - that's intentional
  // The difference is whether they EXPLAINED their approach, not just chatted
  if (preScreen.hasContent &&
      preScreen.candidateMessageCount >= 3 &&
      preScreen.avgMessageLength >= 50 && // Raised from 40 to require more substance
      aiValidation.isCoherent &&
      aiValidation.approachExplained &&
      aiValidation.approachQuality !== 'none' &&
      aiValidation.approachQuality !== 'poor') {
    // Only apply floor if they actually explained approach well
    const qualityFloor = {
      'excellent': 65,
      'good': 55,
      'basic': 45,
      'poor': 35,
      'none': 25
    }[aiValidation.approachQuality] || 35
    communication = Math.max(qualityFloor, communication)
  }

  // For incomplete solutions, communication can stay higher IF they discussed well
  // BUT overall will still be capped due to other components being low

  // === OVERALL SCORE ===
  let overall = Math.round(
    understanding * 0.30 +
    problemSolving * 0.25 +
    codeQuality * 0.25 +
    communication * 0.20
  )

  // FINAL CAP: Incomplete solutions CANNOT pass (cap at 30%)
  // Even with good communication, an incomplete solution is a fail
  // We use 30 as absolute max - but in practice components are already capped at 25
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    overall = Math.min(28, overall) // Hard cap at 28% - this is a failing grade
  }

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
 * A correct solution should get at least a passing grade for code quality
 * BUT communication score should NOT be boosted if they didn't explain approach
 * Silent solutions are PENALIZED - this is an interview, not just coding
 *
 * PHILOSOPHY: Real FAANG interviews require explaining your thought process.
 * A silent optimal solution is a C at best - you solved the problem but failed
 * to demonstrate the communication skills that interviews are designed to assess.
 */
function applyScoreFloors(
  scores: ReturnType<typeof calculateValidatedScores>,
  passRate: number,
  efficiencyScore: number | undefined,
  aiValidation: ConversationValidation
): ReturnType<typeof calculateValidatedScores> & { silentSolution: boolean } {
  const isOptimal = (efficiencyScore || 0) >= 80
  // Only boost if they actually explained with at least basic quality
  const explainedApproach = aiValidation.approachExplained &&
    aiValidation.isCoherent &&
    aiValidation.approachQuality !== 'none' &&
    aiValidation.approachQuality !== 'poor'
  const hasGoodComm = aiValidation.communicationScore >= 60 && explainedApproach

  // Detect silent solutions - correct but no communication
  const isSilentSolution = passRate >= 80 && !explainedApproach

  let overall = scores.overall
  let communication = scores.communication

  // Score floors - silent solutions get SIGNIFICANTLY LOWER floors
  // This matches real interview expectations where communication is critical
  if (passRate >= 100 && isOptimal && hasGoodComm) {
    overall = Math.max(85, overall) // A range - optimal + explained well
    communication = Math.max(70, communication)
  } else if (passRate >= 100 && isOptimal && explainedApproach) {
    overall = Math.max(78, overall) // B+ range - optimal + some explanation
    communication = Math.max(55, communication)
  } else if (passRate >= 100 && isOptimal) {
    // Optimal but SILENT - penalize significantly
    // In real interviews, this is a major red flag - they can code but can't communicate
    overall = Math.max(55, overall) // D+ range - good code but failed interview communication
    // DO NOT boost communication - cap it low
    communication = Math.min(35, communication)
  } else if (passRate >= 100 && explainedApproach) {
    overall = Math.max(72, overall) // B- range - correct + explained
  } else if (passRate >= 100) {
    // Correct but SILENT - significant penalty
    overall = Math.max(52, overall) // D range - solved it but didn't interview well
    communication = Math.min(40, communication)
  } else if (passRate >= 90) {
    overall = Math.max(50, overall) // D range
  } else if (passRate >= 80) {
    overall = Math.max(45, overall) // D- range
  }

  return { ...scores, overall, communication, silentSolution: isSilentSolution }
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

/**
 * Build RAG-enhanced context for feedback generation
 * Retrieves pattern knowledge, similar solutions, and user performance insights
 */
async function buildRAGFeedbackContext(options: {
  problemText: string
  userCode: string
  testResults: { passed: number; total: number }
  scenarioPattern?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  userId?: string
}): Promise<string> {
  const ragParts: string[] = []

  try {
    // 1. Get pattern-specific feedback criteria
    if (options.scenarioPattern) {
      const patternKnowledge = getPatternKnowledge(options.scenarioPattern as DSAPattern)
      if (patternKnowledge) {
        ragParts.push(`
## Pattern-Specific Evaluation: ${patternKnowledge.displayName}

### Expected Approach
${patternKnowledge.keyInsights.slice(0, 3).map(i => `- ${i}`).join('\n')}

### Common Mistakes to Check For
${patternKnowledge.commonMistakes.slice(0, 3).map(m => `- ${m}`).join('\n')}

### Expected Complexity
- Optimal Time: ${patternKnowledge.timeComplexity.typical}
- Optimal Space: ${patternKnowledge.spaceComplexity.typical}
- Better Than Brute Force: ${(patternKnowledge.timeComplexity as any).bruteForce || 'N/A'}
`)
      }
    }

    // 2. Build feedback context from RAG
    const feedbackContext = await buildFeedbackContext({
      problemText: options.problemText,
      userCode: options.userCode,
      testResults: options.testResults,
      pattern: options.scenarioPattern as DSAPattern,
      difficulty: options.difficulty,
    })

    if (feedbackContext.retrievedDocs.length > 0) {
      ragParts.push(`
## Reference Solutions (${feedbackContext.retrievedDocs.length} found)

${feedbackContext.retrievedDocs.slice(0, 2).map((doc, i) => `
### Reference ${i + 1} (Relevance: ${Math.round(doc.finalScore * 100)}%)
${doc.text.substring(0, 300)}${doc.text.length > 300 ? '...' : ''}
`).join('\n')}
`)
    }

    // 3. Get user performance profile for personalized feedback
    if (options.userId) {
      const userProfile = await getUserPerformanceProfile(options.userId)
      if (userProfile) {
        const patternStrength = options.scenarioPattern
          ? (userProfile.patternProficiency as any)[options.scenarioPattern as DSAPattern]
          : null

        ragParts.push(`
## User Performance Context

- Average Score: ${Math.round(userProfile.averageScore)}%
- Sessions Completed: ${userProfile.totalSessions}
- Trend: ${userProfile.recentTrend}
${patternStrength ? `- Proficiency in ${options.scenarioPattern}: ${patternStrength.level} (${patternStrength.successRate}% success rate)` : ''}

### Strengths
${userProfile.strengths.slice(0, 2).map(s => `- ${s}`).join('\n')}

### Areas for Improvement
${userProfile.weaknesses.slice(0, 2).map(w => `- ${w}`).join('\n')}
`)

        // Get personalized recommendations
        const recommendations = await getUserRecommendations(options.userId)
        if (recommendations && recommendations.length > 0) {
          ragParts.push(`
### Personalized Recommendations
${recommendations.slice(0, 2).map((rec, i) => `${i + 1}. ${rec.reason || (rec as any).scenario?.title || 'Practice similar problems'}`).join('\n')}
`)
        }
      }
    }
  } catch (error) {
    logger.error('[Feedback API] RAG context build error', { error })
    // Continue without RAG context - don't fail the feedback generation
  }

  if (ragParts.length === 0) {
    return ''
  }

  return `
=== RAG-ENHANCED FEEDBACK CONTEXT ===
${ragParts.join('\n')}
=== END RAG CONTEXT ===
`
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
    const { code, scenarioTitle, scenarioType, scenarioId, scenarioDifficulty, scenarioPattern, testResults, language, timeSpent, aiCollaborationMetrics, interactionMetrics, efficiencyMetrics, conversationTranscript, partnerMessages, sessionId, userId } = await request.json()

    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    // Calculate collaboration message count
    const collaborationMessages = (aiCollaborationMetrics?.partnerMessagesSent || 0) +
      (interactionMetrics?.interviewerQuestionsAnswered || 0)

    // Calculate test metrics
    const testsPassed = testResults?.filter((t: any) => t.passed).length || 0
    const testsTotal = testResults?.length || 0

    // Scenario-specific system instruction - AI generates narrative only, scores are algorithmic
    const getSystemInstruction = () => {
      const baseRules = `
IMPORTANT: Scores are PRE-CALCULATED. Just reference them in your feedback. Focus on actionable narrative.

RULES:
- ~200 words max. Be concise.
- Focus on actionable improvements.
- Reference the conversation and discussion quality.
`

      if (scenarioType === 'system-design') {
        return `You are a brutally honest senior system design interviewer at a FAANG company. Be direct—if they didn't try, call it out.

${baseRules}

## CRITICAL: HANDLE LOW SCORES APPROPRIATELY
If overall score is below 25:
- TL;DR must explicitly state they did NOT engage or participate meaningfully
- "What Worked" should say "The candidate opened the problem" or similar minimal acknowledgment
- "Fix Next" must lead with: "CRITICAL: You must actually participate in the interview"
- Be blunt: "You submitted without discussing anything" / "You typed nothing" / "Zero engagement"

## OUTPUT FORMAT FOR SYSTEM DESIGN

**TL;DR** – One sentence: If score < 25, state clearly they did not participate. Otherwise: what they did well + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Requirements: X/100 – Did they clarify functional & non-functional requirements?
- Architecture: X/100 – Did they propose clear components and data flow?
- Scalability: X/100 – Did they address scaling, caching, trade-offs?
- Communication: X/100 – Did they explain decisions clearly?
- Overall: X/100

**What Worked** (max 3 bullets)
- If score >= 30: specific design strength with evidence from discussion
- If score < 30: "The candidate opened the design template" (be honest - don't fabricate positives)

**Fix Next** (max 3 bullets, prioritized)
- If score < 25: Start with "ENGAGE WITH THE INTERVIEWER - system design is a CONVERSATION, not a silent exercise"
- specific improvement for system design interviews

**Action Plan** (3 numbered steps)
1. If score < 25: "IMMEDIATE: Understand that system design interviews require active discussion. Practice explaining your thoughts out loud."
2. Short-term: concepts to study
3. Long-term: projects to build

SYSTEM DESIGN FOCUS:
- Evaluate requirements gathering, not code
- Focus on architecture decisions and trade-offs
- Value clear communication and collaboration
- Consider: Did they ask clarifying questions? Discuss alternatives? Handle scale?
- BE HONEST: If they didn't engage, don't pretend they did. Call it out directly.
`
      }

      if (scenarioType === 'bugfix') {
        return `You are a senior debugging expert delivering focused feedback on bug fix performance. Be direct and constructive.

${baseRules}

## OUTPUT FORMAT FOR BUG FIX

**TL;DR** – One sentence: bug identification success + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Bug Found: X/100 – Did they correctly identify the bug?
- Root Cause: X/100 – Did they explain why the bug occurred?
- Fix Quality: X/100 – Was the fix clean and correct?
- Communication: X/100 – Did they explain their debugging process?
- Overall: X/100

**What Worked** (max 3 bullets)
- specific debugging strength with evidence

**Fix Next** (max 3 bullets, prioritized)
- specific improvement for debugging skills

**Action Plan** (3 numbered steps)
1. Immediate debugging technique to practice
2. Short-term: debugging patterns to learn
3. Long-term: codebase understanding to build

BUG FIX FOCUS:
- Evaluate the debugging process, not just the fix
- Value root cause analysis
- Consider: Did they explain their hypothesis? Test incrementally?
`
      }

      // Default DSA instruction
      return `You are a senior interviewer delivering a focused, constructive technical debrief. Be HONEST about gaps, but RECOGNIZE ACHIEVEMENTS - if someone solved the problem correctly, acknowledge that accomplishment.

${baseRules}

## CRITICAL: HANDLING INCOMPLETE/STUB SOLUTIONS
If the code analysis shows "INCOMPLETE SOLUTION DETECTED":
- This means the candidate wrote only base case checks (like null checks) but NO actual algorithm
- Examples: "if root is None: return None" with "pass", or just edge case handling
- TL;DR MUST state: "Solution is incomplete - only edge cases handled, no actual algorithm implemented"
- "What Worked" should ONLY say: "Identified the base case" - nothing more. Do NOT praise code structure or efficiency for non-existent code.
- "Fix Next" MUST lead with: "CRITICAL: You must actually IMPLEMENT the algorithm, not just write the base case"
- Do NOT mention "optimal complexity" for incomplete solutions - there IS no working algorithm to analyze
- Be blunt: "You submitted a skeleton without the actual solution"

## HANDLING LOW TEST PASS RATES
If tests passed < 50%:
- Lead with what's broken, not what works
- "What Worked" should be minimal - don't fabricate positives
- Focus feedback on fixing the failing cases

## HANDLING POOR COMMUNICATION (CRITICAL)
If communication score < 60 or "Approach explained: NO" in the analysis:
- This is a MAJOR issue even if the solution is correct
- In real FAANG interviews, you MUST explain your approach before coding
- TL;DR must mention: "...but needs to explain approach before coding"
- "Fix Next" MUST include: "EXPLAIN YOUR APPROACH before writing code - interviewers need to understand your thought process"
- Communication score justification should state: "Did not explain approach before coding"
- Even with a correct solution, call this out: "You got the right answer, but in a real interview, coding silently is a red flag"

## OUTPUT FORMAT

**TL;DR** – One sentence: If incomplete, state clearly "Solution incomplete - only base case, no algorithm." Otherwise: what they did well + biggest gap.

**Score Snapshot** (use the PRE-CALCULATED SCORES provided)
- Understanding: X/100 – If incomplete, state "Cannot demonstrate understanding without implementing solution"
- Problem-Solving: X/100 – If incomplete, state "No problem-solving demonstrated - base case only"
- Code Quality: X/100 – If incomplete, state "Incomplete code cannot be evaluated for quality"
- Communication: X/100 – brief justification
- Overall: X/100

**What Worked** (max 3 bullets)
- If incomplete/failing: ONLY mention trivial things like "Identified base case" - nothing more
- If working: specific strength with evidence

**Fix Next** (max 3 bullets, prioritized)
- If incomplete: "IMPLEMENT THE COMPLETE ALGORITHM - base case alone is not a solution"
- specific improvement with concrete action

**Action Plan** (3 numbered steps)
1. If incomplete: "IMMEDIATE: Write the complete solution, not just edge case handling"
2. Short-term practice
3. Long-term skill development

DSA FOCUS:
- Reference actual data (tests passed, complexity, time).
- Never praise if tests fail. Address failures first.
- NEVER mention "optimal complexity" or efficiency for solutions that don't work or are incomplete.
- Be honest: a null check is NOT "good code structure" - it's the bare minimum that everyone writes.
`
    }

    const systemInstruction = getSystemInstruction()

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

    // Step 2: AI validation
    // For system design, always validate with AI (even minimal conversations) to get accurate feedback
    // For other types, skip AI call if: no content, gibberish detected, or keyword stuffing
    const shouldValidateWithAI = scenarioType === 'system-design' 
      ? true // Always validate system design to analyze what was discussed (or not discussed)
      : (preScreen.hasContent &&
        !preScreen.suspiciousPatterns.possibleGibberish &&
        !preScreen.suspiciousPatterns.keywordStuffing &&
        preScreen.candidateMessageCount >= 1)

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
    
    // For system design with no/minimal conversation, ensure validation reflects reality
    // (Blank design notes are handled in scoring logic, not here - we still want to analyze conversation if it exists)
    if (scenarioType === 'system-design' && !preScreen.hasContent) {
      // Override default validation to reflect that nothing was discussed
      aiValidation.isCoherent = false
      aiValidation.responsesRelevant = false
      aiValidation.approachExplained = false
      aiValidation.approachQuality = 'none'
      aiValidation.complexityDiscussed = false
      aiValidation.edgeCasesConsidered = false
      aiValidation.alternativesDiscussed = false
      aiValidation.communicationScore = 10 // Very low score for no communication
      aiValidation.questionsAsked = 0
      aiValidation.questionsAnswered = 0
    }

    // Step 2.5: AI Code Overlap Detection
    // Check if candidate blindly copied AI Partner suggestions
    const aiCodeOverlap = analyzeAICodeOverlap(code, partnerMessages)
    const hasBlindCopying = aiCodeOverlap.hasHighOverlap && !aiCodeOverlap.modificationsMade

    // Step 3: Calculate validated scores using both algorithmic + AI signals
    // Different scoring models for different scenario types
    const validatedScores = calculateValidatedScores(
      passRate,
      efficiencyMetrics,
      preScreen,
      aiValidation,
      scenarioType, // Pass scenario type for specialized scoring
      code // Pass code/design notes for system design blank template detection
    )

    // Apply AI copying penalty if detected
    // If they blindly copied >70% of their code from AI, penalize understanding
    if (hasBlindCopying && scenarioType !== 'system-design') {
      validatedScores.understanding = Math.min(
        validatedScores.understanding,
        Math.max(30, validatedScores.understanding - 25) // Cap at 30 or reduce by 25
      )
      logger.info('AI copying penalty applied', {
        sessionId,
        overlapPercentage: aiCodeOverlap.overlapPercentage,
        originalUnderstanding: validatedScores.understanding + 25,
        newUnderstanding: validatedScores.understanding,
      })
    }

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
${scenarioType === 'system-design' ? `- Requirements: ${algorithmicScores.understanding}/100
- Architecture: ${algorithmicScores.problemSolving}/100
- Scalability: ${algorithmicScores.codeQuality}/100
- Communication: ${algorithmicScores.communication}/100` : scenarioType === 'bugfix' ? `- Bug Found: ${algorithmicScores.understanding}/100
- Root Cause: ${algorithmicScores.problemSolving}/100
- Fix Quality: ${algorithmicScores.codeQuality}/100
- Communication: ${algorithmicScores.communication}/100` : `- Understanding: ${algorithmicScores.understanding}/100
- Problem-Solving: ${algorithmicScores.problemSolving}/100
- Code Quality: ${algorithmicScores.codeQuality}/100
- Communication: ${algorithmicScores.communication}/100`}
- Overall: ${algorithmicScores.overall}/100
`

    // Build scenario-specific prompt
    const buildPrompt = () => {
      const baseInfo = `PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ''}
${timeInfo}
${conversationSummary}`

      if (scenarioType === 'system-design') {
        // System design: focus on discussion, not code
        const hasDiscussion = preScreen.candidateMessageCount > 0
        const hasMinimalDiscussion = preScreen.candidateMessageCount > 0 && preScreen.candidateMessageCount < 3
        const hasBlankNotes = code ? isBlankDesignTemplate(code) : true

        // Determine engagement level for AI context
        let engagementContext: string
        if (!hasDiscussion && hasBlankNotes) {
          engagementContext = `
⚠️ ZERO ENGAGEMENT DETECTED ⚠️
- Candidate messages: 0
- Design notes: BLANK (only template placeholders)
- This is a FAILED submission - they did not participate at all
- Your feedback MUST reflect this: be direct that they typed nothing and engaged with nothing
- Do NOT fabricate any positives - there is nothing to praise`
        } else if (hasBlankNotes) {
          engagementContext = `
⚠️ MINIMAL ENGAGEMENT - BLANK DESIGN NOTES ⚠️
- Candidate messages: ${preScreen.candidateMessageCount}
- Design notes: BLANK (only template placeholders, no actual design written)
- They may have said a few words but did NOT document any design
- This is a failing submission - be direct about the lack of written design work`
        } else if (!hasDiscussion || hasMinimalDiscussion) {
          engagementContext = `
⚠️ MINIMAL CONVERSATION ⚠️
- Candidate messages: ${preScreen.candidateMessageCount}
- They wrote some design notes but barely discussed with the interviewer
- System design interviews REQUIRE active discussion - call this out`
        } else {
          engagementContext = `
✓ Normal engagement level
- Candidate messages: ${preScreen.candidateMessageCount}
- Average message length: ${Math.round(preScreen.avgMessageLength)} chars
- Has design content: YES`
        }

        return `Generate system design interview feedback using the pre-calculated scores below.

${baseInfo}

${engagementContext}

DESIGN NOTES SUBMITTED:
\`\`\`
${code && code.trim()
  ? (code.length > 1500 ? code.slice(0, 1500) + '\n// ... [truncated]' : code)
  : '[EMPTY - No design notes provided]'}
\`\`\`

CRITICAL INSTRUCTIONS:
- Use the PRE-CALCULATED SCORES above exactly - they reflect what actually happened
- If overall score < 20: This is a FAILED submission. Be blunt: "You submitted without doing anything" / "Zero participation"
- If overall score 20-30: They barely tried. Call out the specific failures (no discussion, blank template, etc.)
- "What Worked" for empty submissions: ONLY say "The candidate opened the design problem" - nothing more
- "Fix Next" for empty submissions: Lead with "You must actually ENGAGE in system design interviews"
- Do NOT invent positives that don't exist. If they didn't discuss requirements, don't say they "showed potential"
- Be a tough but fair interviewer - call out non-participation directly`
      }

      if (scenarioType === 'bugfix') {
        // Bug fix: focus on debugging process
        return `Generate bug fix interview feedback using the pre-calculated scores below.

${baseInfo}
${testResultsSummary}

CANDIDATE'S FIX:
\`\`\`${language || 'javascript'}
${code.length > 2000 ? code.slice(0, 2000) + '\n// ... [truncated]' : code}
\`\`\`
${testResults && testResults.filter((t: any) => !t.passed).length > 0 ? `
REMAINING ISSUES (first 3):
${testResults.filter((t: any) => !t.passed).slice(0, 3).map((t: any) =>
      `- ${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`
    ).join('\n')}
` : ''}

IMPORTANT:
- Evaluate the DEBUGGING PROCESS, not just whether the fix works
- Use the PRE-CALCULATED SCORES above exactly
- Focus on: bug identification, root cause analysis, fix quality, communication`
      }

      // Default DSA prompt - analyze code completeness first
      const codeAnalysis = code ? analyzeCodeCompleteness(code, language || 'python') : { isIncomplete: true, reason: 'No code submitted', hasBaseCase: false, hasActualLogic: false, stubPatterns: ['empty'] }

      // Build completeness context for AI
      let completenessContext = ''
      if (codeAnalysis.isIncomplete) {
        completenessContext = `
⚠️ INCOMPLETE SOLUTION DETECTED ⚠️
- Reason: ${codeAnalysis.reason}
- Has base case only: ${codeAnalysis.hasBaseCase ? 'YES' : 'NO'}
- Has actual algorithm logic: ${codeAnalysis.hasActualLogic ? 'YES' : 'NO'}
${codeAnalysis.stubPatterns.length > 0 ? `- Stub patterns found: ${codeAnalysis.stubPatterns.join(', ')}` : ''}
- This is a FAILING submission - the solution is not complete
- Your feedback MUST reflect this: be direct that they only wrote edge case handling, no actual solution
- Do NOT praise complexity or efficiency - there is no working algorithm to analyze
- "What Worked" should ONLY mention "Identified the base case" at most
`
      } else if (passRate < 30) {
        completenessContext = `
⚠️ LOW PASS RATE (${Math.round(passRate)}%) ⚠️
- Most tests are failing
- Focus on what's broken, not minor positives
- Do NOT mention "optimal complexity" if the solution doesn't work
`
      } else if (passRate < 50) {
        completenessContext = `
⚠️ PARTIAL SOLUTION (${Math.round(passRate)}% passing) ⚠️
- Less than half of tests pass
- Lead with fixing failures before praising what works
`
      }

      return `Generate interview feedback narrative using the pre-calculated scores below.

${baseInfo}
${testResultsSummary}
${efficiencyInfo}
${completenessContext}

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

CRITICAL INSTRUCTIONS:
- Use the PRE-CALCULATED SCORES above exactly - they reflect what actually happened
- If "INCOMPLETE SOLUTION DETECTED" above: Be blunt that the solution is not complete. Do NOT fabricate positives.
- If pass rate < 50%: Lead with failures, minimize "What Worked"
- NEVER say "optimal complexity achieved" for incomplete or failing solutions
- A base case check (like null check) is NOT praiseworthy - it's the minimum everyone writes
- Be a tough but fair interviewer - honesty helps candidates improve`
    }

    const prompt = buildPrompt()

    // Build RAG-enhanced context for better feedback (non-blocking)
    let ragFeedbackContext = ''
    try {
      ragFeedbackContext = await buildRAGFeedbackContext({
        problemText: scenarioTitle || '',
        userCode: code || '',
        testResults: { passed: testsPassed, total: testsTotal },
        scenarioPattern: efficiencyMetrics?.problemPattern, // Pattern from efficiency analysis
        difficulty: efficiencyMetrics?.difficulty as 'easy' | 'medium' | 'hard',
        userId,
      })
    } catch (error) {
      logger.warn('[Feedback API] RAG context failed, continuing without', { error })
    }

    // Combine system instruction with RAG context
    const enhancedSystemInstruction = ragFeedbackContext
      ? systemInstruction + '\n\n' + ragFeedbackContext
      : systemInstruction

    // Use AI provider abstraction for narrative feedback only
    const aiResponse = await generateFeedbackResponse(
      enhancedSystemInstruction,
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
      }).catch(err => logger.error("Analytics tracking error", { error: err }))
    }

    // Update learning state for spaced repetition email reminders
    // Also update problem-level mastery for enhanced SM-2 spaced repetition
    // Use scenarioId (e.g., 'dsa-two-sum') for spaced repetition tracking, not sessionId (Firebase session UUID)
    if (userId && scenarioTitle && scenarioId) {
      try {
        // Use canonical values from frontend, with fallbacks
        const pattern = (scenarioPattern || efficiencyMetrics?.problemPattern || 'arrays-hashing') as DSAPattern
        const difficulty = (scenarioDifficulty || efficiencyMetrics?.difficulty || 'medium') as 'easy' | 'medium' | 'hard'

        // Update both topic-level (legacy) and problem-level mastery
        await completeSessionWithMastery(userId, {
          scenarioId: scenarioId,
          title: scenarioTitle,
          pattern,
          difficulty,
          performanceScore: scores.overall,
          timeSpentMinutes: timeSpent ? Math.round(timeSpent / 60) : undefined,
          hintsUsed: interactionMetrics?.hintsUsed || 0,
          completedAt: new Date().toISOString(),
        })
      } catch (err) {
        // Non-blocking - don't fail feedback if learning state update fails
        logger.error("Learning state update error", { error: err })
      }
    }

    // Store solution in RAG vector store for future similarity matching
    if (userId && sessionId && code) {
      try {
        await embedAndStoreSolution(userId, sessionId, code, {
          problemTitle: scenarioTitle,
          language: language || 'javascript',
          passed: scores.overall >= 70,
          score: scores.overall,
          problemType: scenarioType || 'dsa',
        })
      } catch (err) {
        // Non-blocking - don't fail feedback if RAG storage fails
        logger.error("RAG solution storage error", { error: err })
      }
    }

    // Analyze code for misconceptions and track them (non-blocking)
    // Only analyze DSA problems where we can detect pattern-specific errors
    if (userId && code && scenarioType === 'dsa' && (scenarioPattern || efficiencyMetrics?.problemPattern)) {
      try {
        const pattern = (scenarioPattern || efficiencyMetrics?.problemPattern) as DSAPattern
        await analyzeAndTrackMisconceptions(userId, code, pattern, {
          passed: testsPassed,
          total: testsTotal,
          failingTests: testResults
            ?.filter((t: any) => !t.passed)
            ?.slice(0, 5)
            ?.map((t: any) => `${t.description}: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(t.actual)}`) || [],
        })
      } catch (err) {
        // Non-blocking - don't fail feedback if misconception analysis fails
        logger.error("Misconception analysis error", { error: err })
      }
    }

    return NextResponse.json({
      feedback: feedback,
      performanceScore: scores.overall,
      scores: scores, // Full score breakdown
      structured: structuredFeedback, // Full structured data
      // Flags for frontend warnings
      silentSolution: algorithmicScores.silentSolution || false, // True if solved correctly but didn't explain approach
      incompleteSolution: code ? analyzeCodeCompleteness(code, language || 'python').isIncomplete : false,
      aiCopyingDetected: hasBlindCopying, // True if >70% code copied from AI Partner
      aiOverlapPercentage: aiCodeOverlap.overlapPercentage, // How much code matches AI suggestions
      provider: aiResponse.provider,
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error) {
    logger.error("Feedback generation error", { error, endpoint: '/api/generate-feedback' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    )
  }
}
