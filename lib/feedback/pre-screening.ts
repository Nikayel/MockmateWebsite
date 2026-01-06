/**
 * Pre-screening conversation analysis
 *
 * This module performs fast, algorithmic analysis of conversation transcripts
 * to detect basic patterns without AI calls. Used for initial filtering.
 */

import type { PreScreenResult } from './types'

/**
 * STEP 1: Basic algorithmic pre-screening (fast, no AI)
 * Detects obvious signals and filters out empty/minimal conversations
 */
export function preScreenConversation(transcript: Array<{ role: string; content: string }> | undefined): PreScreenResult {
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
