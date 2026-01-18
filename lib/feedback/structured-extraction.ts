/**
 * Structured Extraction for Feedback Generation
 *
 * Extracts concrete evidence from the conversation transcript BEFORE
 * generating feedback. This prevents hallucination and ensures feedback
 * is grounded in what actually happened.
 *
 * DRY: Uses shared-patterns.ts for complexity and edge case detection.
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import {
  getComplexityRank,
  findDominantComplexity,
  EDGE_CASE_KEYWORDS,
} from "@/lib/interview/shared-patterns"

// =============================================================================
// EXTRACTION TYPES
// =============================================================================

export interface ExtractedEvidence {
  // Approach discussion
  approach: {
    explained: boolean
    type: 'brute_force' | 'optimized' | 'unclear' | 'none'
    quote: string | null  // Exact quote from transcript
    messageIndex: number | null
  }

  // Complexity discussion
  timeComplexity: {
    mentioned: boolean
    value: string | null  // e.g., "O(n)"
    explanationGiven: boolean
    quote: string | null
    messageIndex: number | null
    isCorrect: boolean | null  // null if not verifiable
  }

  spaceComplexity: {
    mentioned: boolean
    value: string | null
    quote: string | null
    messageIndex: number | null
    isCorrect: boolean | null
  }

  // Edge cases
  edgeCases: {
    mentionedByCandidate: string[]  // List with quotes
    mentionedAfterPrompt: string[]  // Edge cases only mentioned after interviewer asked
    missedCritical: string[]  // Critical edge cases never mentioned
  }

  // Problem-solving progression
  progression: {
    startedWithBruteForce: boolean
    improvedAfterPrompt: boolean
    selfCorrectedBugs: boolean
    bugQuotes: string[]  // Quotes of bug corrections
  }

  // Questions and answers
  interviewerQuestions: {
    question: string
    answered: boolean
    answerQuality: 'good' | 'partial' | 'poor' | 'unanswered'
    quote: string | null
  }[]

  // Communication quality
  communication: {
    explainedWhileCoding: boolean
    askedClarifyingQuestions: boolean
    respondedToFeedback: boolean
    quotes: string[]  // Key communication quotes
  }

  // Hints and help
  hints: {
    totalGiven: number
    usedEffectively: boolean
    copiedBlindly: boolean
  }
}

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

interface TranscriptMessage {
  role: 'user' | 'interviewer' | 'assistant'
  content: string
  timestamp?: number
}

/**
 * Extract structured evidence from conversation transcript
 */
export async function extractConversationEvidence(
  transcript: TranscriptMessage[],
  problemContext: {
    title: string
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    criticalEdgeCases: string[]
  }
): Promise<ExtractedEvidence> {
  // First, do algorithmic extraction for things we can detect programmatically
  const algorithmicEvidence = extractAlgorithmically(transcript, problemContext)

  // Then, use AI for semantic extraction that requires understanding
  const semanticEvidence = await extractSemantically(transcript, problemContext)

  // Merge both, preferring algorithmic evidence where available
  return mergeEvidence(algorithmicEvidence, semanticEvidence)
}

// NOTE: getComplexityRank and findDominantComplexity are now imported from shared-patterns.ts
// This ensures consistent complexity ranking across all modules (DRY principle)

/**
 * Algorithmic extraction - fast, no AI needed
 */
function extractAlgorithmically(
  transcript: TranscriptMessage[],
  problemContext: {
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    criticalEdgeCases: string[]
  }
): Partial<ExtractedEvidence> {
  const evidence: Partial<ExtractedEvidence> = {
    approach: { explained: false, type: 'none', quote: null, messageIndex: null },
    timeComplexity: { mentioned: false, value: null, explanationGiven: false, quote: null, messageIndex: null, isCorrect: null },
    spaceComplexity: { mentioned: false, value: null, quote: null, messageIndex: null, isCorrect: null },
    edgeCases: { mentionedByCandidate: [], mentionedAfterPrompt: [], missedCritical: [...problemContext.criticalEdgeCases] },
    progression: { startedWithBruteForce: false, improvedAfterPrompt: false, selfCorrectedBugs: false, bugQuotes: [] },
    interviewerQuestions: [],
    communication: { explainedWhileCoding: false, askedClarifyingQuestions: false, respondedToFeedback: false, quotes: [] },
    hints: { totalGiven: 0, usedEffectively: false, copiedBlindly: false },
  }

  let interviewerAskedEdgeCase = false

  // Track pending questions to match with answers
  let pendingQuestions: { question: string; messageIndex: number }[] = []

  transcript.forEach((msg, index) => {
    const content = msg.content.toLowerCase()
    const originalContent = msg.content

    if (msg.role === 'user') {
      // ANSWER DETECTION: If there are pending questions and user responds with substance,
      // mark them as answered. A substantive response is > 20 chars (not just "ok" or "yes")
      if (pendingQuestions.length > 0 && originalContent.length > 20) {
        pendingQuestions.forEach(pq => {
          // Find the question in our evidence and mark it answered
          const questionEntry = evidence.interviewerQuestions!.find(
            q => q.question === pq.question
          )
          if (questionEntry) {
            questionEntry.answered = true
            questionEntry.answerQuality = originalContent.length > 100 ? 'good' : 'partial'
            questionEntry.quote = originalContent.substring(0, 150)
          }
        })
        // Clear pending questions after processing
        pendingQuestions = []
      }

      // Check for complexity mentions - find DOMINANT complexity, not just first
      const complexityMatches = originalContent.match(/O\([^)]+\)/gi)
      if (complexityMatches && complexityMatches.length > 0) {
        // Get ALL complexity values and find the dominant one
        const allComplexities = complexityMatches.map(c => c.toUpperCase())
        const dominantComplexity = findDominantComplexity(allComplexities)

        // Also check for non-O(...) keywords like "n squared", "quadratic", etc.
        // These often represent the actual time complexity
        let keywordComplexity: string | null = null
        if (content.includes('n squared') || content.includes('n^2') || content.includes('quadratic')) {
          keywordComplexity = 'O(N²)'
        } else if (content.includes('n log n')) {
          keywordComplexity = 'O(N LOG N)'
        } else if (content.includes('linear') && !content.includes('log')) {
          keywordComplexity = 'O(N)'
        }

        // Use keyword complexity if it's "bigger" than the O(...) matches
        // This handles "sorting is O(n log n) but overall is n squared"
        const finalComplexity = keywordComplexity &&
          getComplexityRank(keywordComplexity) > getComplexityRank(dominantComplexity)
          ? keywordComplexity
          : dominantComplexity

        // Determine if time or space based on context
        if (content.includes('time') || content.includes('runtime') || content.includes('overall') || !evidence.timeComplexity!.mentioned) {
          evidence.timeComplexity = {
            mentioned: true,
            value: finalComplexity,
            explanationGiven: content.includes('because') || content.includes('loop') || content.includes('iterate'),
            quote: originalContent.substring(0, 200),
            messageIndex: index,
            isCorrect: finalComplexity === problemContext.optimalTimeComplexity.toUpperCase(),
          }
        }

        if (content.includes('space') || content.includes('memory')) {
          evidence.spaceComplexity = {
            mentioned: true,
            value: dominantComplexity, // For space, use the raw match
            quote: originalContent.substring(0, 200),
            messageIndex: index,
            isCorrect: dominantComplexity === problemContext.optimalSpaceComplexity.toUpperCase(),
          }
        }
      }

      // Check for approach explanation
      if (
        content.includes("i'll use") ||
        content.includes("i would") ||
        content.includes('my approach') ||
        content.includes('thinking') ||
        content.includes('plan is')
      ) {
        evidence.approach = {
          explained: true,
          type: detectApproachType(content),
          quote: originalContent.substring(0, 200),
          messageIndex: index,
        }
      }

      // Check for edge case mentions - use shared keywords from shared-patterns.ts
      EDGE_CASE_KEYWORDS.forEach(keyword => {
        if (content.includes(keyword)) {
          const quote = `"${originalContent.substring(0, 100)}..."`
          if (interviewerAskedEdgeCase) {
            if (!evidence.edgeCases!.mentionedAfterPrompt.includes(quote)) {
              evidence.edgeCases!.mentionedAfterPrompt.push(quote)
            }
          } else {
            if (!evidence.edgeCases!.mentionedByCandidate.includes(quote)) {
              evidence.edgeCases!.mentionedByCandidate.push(quote)
            }
          }

          // Remove from missed if mentioned
          evidence.edgeCases!.missedCritical = evidence.edgeCases!.missedCritical.filter(
            ec => !ec.toLowerCase().includes(keyword)
          )
        }
      })

      // Check for clarifying questions
      if (content.includes('?') && (
        content.includes('what if') ||
        content.includes('should i') ||
        content.includes('can i') ||
        content.includes('do we')
      )) {
        evidence.communication!.askedClarifyingQuestions = true
      }

      // Check for brute force progression
      if (content.includes('brute force') || content.includes('n squared') || content.includes('nested loop')) {
        evidence.progression!.startedWithBruteForce = true
      }

      // Check for optimization after brute force
      if (evidence.progression!.startedWithBruteForce && (
        content.includes('optimize') ||
        content.includes('better') ||
        content.includes('hash') ||
        content.includes('improve')
      )) {
        evidence.progression!.improvedAfterPrompt = true
      }

      // Check for bug self-correction
      if (
        content.includes('wait') ||
        content.includes('actually') ||
        content.includes('mistake') ||
        content.includes('bug') ||
        content.includes('fix')
      ) {
        evidence.progression!.selfCorrectedBugs = true
        evidence.progression!.bugQuotes.push(`"${originalContent.substring(0, 100)}..."`)
      }
    }

    if (msg.role === 'interviewer' || msg.role === 'assistant') {
      // Track interviewer questions and add to pending queue
      if (content.includes('?')) {
        const questionMatch = originalContent.match(/[^.!?]*\?/g)
        if (questionMatch) {
          questionMatch.forEach(q => {
            const questionText = q.trim()
            // Skip very short questions (likely rhetorical) or confirmations
            if (questionText.length < 15 || questionText.toLowerCase().includes('right?')) {
              return
            }
            evidence.interviewerQuestions!.push({
              question: questionText,
              answered: false,  // Will be updated when user responds
              answerQuality: 'unanswered',
              quote: null,
            })
            // Add to pending questions for next user message to match
            pendingQuestions.push({ question: questionText, messageIndex: index })
          })
        }
      }

      // Track if interviewer asked about edge cases
      if (
        content.includes('edge case') ||
        content.includes('empty') ||
        content.includes('what if') ||
        content.includes('what happens')
      ) {
        interviewerAskedEdgeCase = true
      }

      // Track hints given
      if (
        content.includes('hint') ||
        content.includes('consider') ||
        content.includes('think about') ||
        content.includes('what if you')
      ) {
        evidence.hints!.totalGiven++
      }
    }
  })

  return evidence
}

function detectApproachType(content: string): 'brute_force' | 'optimized' | 'unclear' {
  if (content.includes('brute force') || content.includes('nested') || content.includes('n squared') || content.includes('n^2')) {
    return 'brute_force'
  }
  if (content.includes('hash') || content.includes('map') || content.includes('set') || content.includes('o(n)') || content.includes('single pass')) {
    return 'optimized'
  }
  return 'unclear'
}

/**
 * Semantic extraction - uses AI for nuanced understanding
 */
async function extractSemantically(
  transcript: TranscriptMessage[],
  problemContext: {
    title: string
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    criticalEdgeCases: string[]
  }
): Promise<Partial<ExtractedEvidence>> {
  const transcriptText = transcript
    .map((m, i) => `[${i}] ${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const extractionPrompt = `Analyze this interview transcript and extract specific evidence.

PROBLEM: ${problemContext.title}
OPTIMAL TIME: ${problemContext.optimalTimeComplexity}
OPTIMAL SPACE: ${problemContext.optimalSpaceComplexity}
CRITICAL EDGE CASES: ${problemContext.criticalEdgeCases.join(', ')}

TRANSCRIPT:
${transcriptText.substring(0, 8000)}

EXTRACT THE FOLLOWING (use EXACT quotes from transcript):

1. INTERVIEWER QUESTIONS: For each question the interviewer asked, was it answered? Quote the answer.
2. COMMUNICATION: Did candidate explain their thinking while coding? Quote examples.
3. ANSWER QUALITY: Rate each answer as good/partial/poor/unanswered.

Return JSON:
{
  "interviewerQuestions": [
    {
      "question": "exact question from transcript",
      "answered": true/false,
      "answerQuality": "good|partial|poor|unanswered",
      "quote": "exact quote of answer or null"
    }
  ],
  "communicationQuotes": ["quote1", "quote2"],
  "explainedWhileCoding": true/false,
  "respondedToFeedback": true/false
}

RULES:
- Only include REAL questions (not rhetorical)
- Only quote ACTUAL text from transcript
- If uncertain, mark as "unanswered" not "good"
- Maximum 10 questions to analyze`

  try {
    const response = await generateAIResponse(
      "You are a transcript analyzer. Return only valid JSON, no markdown.",
      extractionPrompt,
      [],
      { complexity: "critique", temperature: 0.1 }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        interviewerQuestions: parsed.interviewerQuestions || [],
        communication: {
          explainedWhileCoding: parsed.explainedWhileCoding || false,
          askedClarifyingQuestions: false,  // Already handled algorithmically
          respondedToFeedback: parsed.respondedToFeedback || false,
          quotes: parsed.communicationQuotes || [],
        },
      }
    }
  } catch (error) {
    logger.error("[Structured Extraction] Semantic extraction failed", { error })
  }

  return {}
}

/**
 * Merge algorithmic and semantic evidence
 */
function mergeEvidence(
  algorithmic: Partial<ExtractedEvidence>,
  semantic: Partial<ExtractedEvidence>
): ExtractedEvidence {
  return {
    approach: algorithmic.approach || { explained: false, type: 'none', quote: null, messageIndex: null },
    timeComplexity: algorithmic.timeComplexity || { mentioned: false, value: null, explanationGiven: false, quote: null, messageIndex: null, isCorrect: null },
    spaceComplexity: algorithmic.spaceComplexity || { mentioned: false, value: null, quote: null, messageIndex: null, isCorrect: null },
    edgeCases: algorithmic.edgeCases || { mentionedByCandidate: [], mentionedAfterPrompt: [], missedCritical: [] },
    progression: algorithmic.progression || { startedWithBruteForce: false, improvedAfterPrompt: false, selfCorrectedBugs: false, bugQuotes: [] },
    // Prefer semantic for questions (more nuanced)
    interviewerQuestions: semantic.interviewerQuestions?.length
      ? semantic.interviewerQuestions
      : algorithmic.interviewerQuestions || [],
    // Merge communication
    communication: {
      explainedWhileCoding: semantic.communication?.explainedWhileCoding || algorithmic.communication?.explainedWhileCoding || false,
      askedClarifyingQuestions: algorithmic.communication?.askedClarifyingQuestions || false,
      respondedToFeedback: semantic.communication?.respondedToFeedback || false,
      quotes: [
        ...(algorithmic.communication?.quotes || []),
        ...(semantic.communication?.quotes || []),
      ],
    },
    hints: algorithmic.hints || { totalGiven: 0, usedEffectively: false, copiedBlindly: false },
  }
}

// =============================================================================
// EVIDENCE SUMMARY FOR FEEDBACK
// =============================================================================

/**
 * Build a summary of evidence for the feedback generation prompt
 */
export function buildEvidenceSummary(evidence: ExtractedEvidence): string {
  const sections: string[] = []

  // Approach
  sections.push(`## APPROACH`)
  if (evidence.approach.explained) {
    sections.push(`- Candidate explained approach: YES (${evidence.approach.type})`)
    if (evidence.approach.quote) {
      sections.push(`- Quote: ${evidence.approach.quote}`)
    }
  } else {
    sections.push(`- Candidate explained approach: NO`)
  }

  // Complexity
  sections.push(`\n## COMPLEXITY DISCUSSION`)
  if (evidence.timeComplexity.mentioned) {
    sections.push(`- Time complexity discussed: YES - ${evidence.timeComplexity.value}`)
    sections.push(`- Explanation given: ${evidence.timeComplexity.explanationGiven ? 'YES' : 'NO'}`)
    sections.push(`- Correct: ${evidence.timeComplexity.isCorrect === null ? 'Unknown' : evidence.timeComplexity.isCorrect ? 'YES' : 'NO'}`)
    if (evidence.timeComplexity.quote) {
      sections.push(`- Quote: ${evidence.timeComplexity.quote}`)
    }
  } else {
    sections.push(`- Time complexity discussed: NO`)
  }

  if (evidence.spaceComplexity.mentioned) {
    sections.push(`- Space complexity discussed: YES - ${evidence.spaceComplexity.value}`)
  }

  // Edge cases
  sections.push(`\n## EDGE CASES`)
  if (evidence.edgeCases.mentionedByCandidate.length > 0) {
    sections.push(`- Mentioned BEFORE interviewer asked: ${evidence.edgeCases.mentionedByCandidate.join(', ')}`)
    sections.push(`  -> DO NOT say "didn't mention edge cases" - they did!`)
  }
  if (evidence.edgeCases.mentionedAfterPrompt.length > 0) {
    sections.push(`- Mentioned AFTER interviewer asked: ${evidence.edgeCases.mentionedAfterPrompt.join(', ')}`)
  }
  if (evidence.edgeCases.missedCritical.length > 0) {
    sections.push(`- Missed critical edge cases: ${evidence.edgeCases.missedCritical.join(', ')}`)
  }

  // Progression
  sections.push(`\n## PROBLEM-SOLVING PROGRESSION`)
  if (evidence.progression.startedWithBruteForce) {
    sections.push(`- Started with brute force: YES`)
    if (evidence.progression.improvedAfterPrompt) {
      sections.push(`- Improved to optimal: YES (POSITIVE SIGNAL - give credit!)`)
    }
  }
  if (evidence.progression.selfCorrectedBugs) {
    sections.push(`- Self-corrected bugs: YES (POSITIVE SIGNAL!)`)
    evidence.progression.bugQuotes.forEach(q => sections.push(`  - ${q}`))
  }

  // Questions answered
  sections.push(`\n## QUESTIONS ANSWERED`)
  const answered = evidence.interviewerQuestions.filter(q => q.answered)
  const total = evidence.interviewerQuestions.length
  sections.push(`- ${answered.length}/${total} interviewer questions answered`)
  evidence.interviewerQuestions.slice(0, 5).forEach(q => {
    sections.push(`- Q: "${q.question.substring(0, 50)}..." -> ${q.answerQuality}`)
  })

  // Communication
  sections.push(`\n## COMMUNICATION`)
  sections.push(`- Explained while coding: ${evidence.communication.explainedWhileCoding ? 'YES' : 'NO'}`)
  sections.push(`- Asked clarifying questions: ${evidence.communication.askedClarifyingQuestions ? 'YES' : 'NO'}`)
  sections.push(`- Responded to feedback: ${evidence.communication.respondedToFeedback ? 'YES' : 'NO'}`)

  // Hints
  sections.push(`\n## HINTS`)
  sections.push(`- Total hints given: ${evidence.hints.totalGiven}`)

  return sections.join('\n')
}

/**
 * Build context for Constitutional AI with full evidence
 */
export function buildConstitutionalContext(
  evidence: ExtractedEvidence,
  scores: { understanding: number; problemSolving: number; codeQuality: number; communication: number; overall: number },
  problemContext: { title: string; optimalTimeComplexity: string; optimalSpaceComplexity: string }
): string {
  return `
CONSTITUTIONAL AI REVIEW CONTEXT
================================

PROBLEM: ${problemContext.title}
OPTIMAL COMPLEXITY: Time ${problemContext.optimalTimeComplexity}, Space ${problemContext.optimalSpaceComplexity}

INITIAL SCORES:
- Understanding: ${scores.understanding}/100
- Problem-Solving: ${scores.problemSolving}/100
- Code Quality: ${scores.codeQuality}/100
- Communication: ${scores.communication}/100
- Overall: ${scores.overall}/100

EXTRACTED EVIDENCE FROM TRANSCRIPT:
${buildEvidenceSummary(evidence)}

FAIRNESS CHECK GUIDELINES:
1. If candidate mentioned edge cases (see evidence), don't penalize communication for "not mentioning edge cases"
2. If candidate started with brute force but improved, give credit for progression
3. If candidate self-corrected bugs, this is a POSITIVE signal, not negative
4. Questions answered ratio should match the evidence, not be made up
5. If complexity was discussed with explanation, don't say "didn't explain complexity"

YOUR TASK:
Review the scores against the evidence. Flag any scores that contradict the evidence.
`
}
