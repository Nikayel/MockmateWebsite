/**
 * AI code overlap detection.
 *
 * Compares the candidate's final code against AI Partner code blocks to
 * detect high-overlap submissions that may not reflect independent work.
 */

import type { AICodeOverlapResult } from "./types"

/**
 * Extract code blocks from AI Partner conversation.
 */
export function extractCodeFromPartnerMessages(
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
 * Normalize code for comparison.
 */
export function normalizeCode(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/["'`]/g, '"')
    .toLowerCase()
    .trim()
}

/**
 * Calculate similarity between two code strings using substring or n-gram overlap.
 */
export function calculateCodeSimilarity(code1: string, code2: string): number {
  const s1 = normalizeCode(code1)
  const s2 = normalizeCode(code2)

  if (s1.length === 0 || s2.length === 0) return 0

  if (s1.length > 500 || s2.length > 500) {
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

  const minLen = Math.min(s1.length, s2.length)
  let matchingChars = 0

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
 * Analyze if candidate code heavily copies AI Partner suggestions.
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

  let maxOverlap = 0
  const copiedSnippets: string[] = []

  for (const aiCode of aiCodeBlocks) {
    const similarity = calculateCodeSimilarity(finalCode, aiCode)
    if (similarity > maxOverlap) {
      maxOverlap = similarity
    }
    if (similarity >= 70) {
      copiedSnippets.push(aiCode.substring(0, 100) + (aiCode.length > 100 ? "..." : ""))
    }
  }

  const normalizedFinal = normalizeCode(finalCode)
  const allAINormalized = aiCodeBlocks.map(normalizeCode).join(" ")
  const modificationsMade =
    normalizedFinal.length !== allAINormalized.length || normalizedFinal !== allAINormalized

  return {
    hasHighOverlap: maxOverlap >= 70,
    overlapPercentage: Math.round(maxOverlap),
    copiedSnippets,
    modificationsMade,
  }
}
