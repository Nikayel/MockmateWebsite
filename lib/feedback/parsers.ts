/**
 * Feedback parsing utilities
 *
 * This module parses structured sections from AI-generated feedback text.
 */

import type { FeedbackScores } from "./types"

export interface FeedbackSection {
  tldr: string
  scores: FeedbackScores & {
    correctness: number
    efficiency: number
    reasoning: number
    aiCollaboration: number
  }
  scoreJustifications: {
    understanding?: string
    problemSolving?: string
    codeQuality?: string
    communication?: string
    correctness?: string
    efficiency?: string
    reasoning?: string
    aiCollaboration?: string
    overall?: string
  }
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  aiWatchlist: string
}

/**
 * Parse score with optional justification from feedback text
 */
function parseScoreWithJustification(label: string, scoreText: string, is100: boolean = true) {
  const regexWithJustification = new RegExp(
    `[-•]?\\s*${label}[:\s–-]*(\\d+)\\s*\\/\\s*${is100 ? "100" : "10"}[–-\\s]+(.+?)(?=\\n|$)`,
    "i"
  )
  const matchWithJustification = scoreText.match(regexWithJustification)
  if (matchWithJustification && matchWithJustification[2]?.trim()) {
    const score = parseInt(matchWithJustification[1], 10)
    const justification = matchWithJustification[2].trim()
    return { score: is100 ? score : score * 10, justification }
  }
  const regexWithoutJustification = new RegExp(
    `[-•]?\\s*${label}[:\s–-]*(\\d+)\\s*\\/\\s*${is100 ? "100" : "10"}`,
    "i"
  )
  const matchWithoutJustification = scoreText.match(regexWithoutJustification)
  if (matchWithoutJustification) {
    return {
      score: is100
        ? parseInt(matchWithoutJustification[1], 10)
        : parseInt(matchWithoutJustification[1], 10) * 10,
      justification: "",
    }
  }
  return { score: 0, justification: "" }
}

/**
 * Parse bullet list from text, handling multiple formats:
 * - Hyphen bullets (- item)
 * - Unicode bullets (• item)
 * - Asterisk bullets (* item)
 * - Numbered lists (1. item)
 * - Plain text fallback (sentences)
 */
function parseBulletList(text: string, preferNumbered: boolean = false): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  // BEST approach: Extract lines that look like bullet points directly
  // This handles all formats: "- item", "• item", "* item", "1. item"
  // Use matchAll with multiline to properly extract bullets even when not at line start
  const bulletLineRegex = /^[\s]*[-•*]\s+(.+)$/gm
  const numberedLineRegex = /^[\s]*\d+[.)]\s+(.+)$/gm

  // Try bullet points first (unless preferNumbered)
  if (!preferNumbered) {
    const bulletMatches = [...trimmed.matchAll(bulletLineRegex)]
    if (bulletMatches.length > 0) {
      const items = bulletMatches.map((m) => m[1].trim()).filter((s) => s && s.length > 3)
      if (items.length > 0) {
        return filterHeaderLines(items)
      }
    }
  }

  // Try numbered lists
  const numberedMatches = [...trimmed.matchAll(numberedLineRegex)]
  if (numberedMatches.length > 0) {
    const items = numberedMatches.map((m) => m[1].trim()).filter((s) => s && s.length > 3)
    if (items.length > 0) {
      return filterHeaderLines(items)
    }
  }

  // Try bullet points if we preferred numbered but found none
  if (preferNumbered) {
    const bulletMatches = [...trimmed.matchAll(bulletLineRegex)]
    if (bulletMatches.length > 0) {
      const items = bulletMatches.map((m) => m[1].trim()).filter((s) => s && s.length > 3)
      if (items.length > 0) {
        return filterHeaderLines(items)
      }
    }
  }

  // NEW: Try extracting bullets that may not have leading newlines
  // This handles cases like "**What Worked**\n- Item 1- Item 2" where bullets run together
  // or "- Item 1 - Item 2" on a single line
  const inlineBulletRegex = /(?:^|[^-])[-•*]\s+([^-•*\n]+?)(?=\s*[-•*]\s+|$)/g
  const inlineMatches = [...trimmed.matchAll(inlineBulletRegex)]
  if (inlineMatches.length > 0) {
    const items = inlineMatches.map((m) => m[1].trim()).filter((s) => s && s.length > 3)
    if (items.length > 0) {
      return filterHeaderLines(items)
    }
  }

  // Fallback: split by lines and clean up bullet prefixes
  const lines = trimmed.split("\n")
  let items = lines
    .map((line) => line.replace(/^[\s]*[-•*\d.)\s]+/, "").trim())
    .filter((s) => s && s.length > 5)

  if (items.length > 0) {
    return filterHeaderLines(items)
  }

  // Final fallback: split on inline bullet patterns (handles "text - item1 - item2")
  items = trimmed
    .split(/\s+[-*•]\s+/)
    .map((s) => s.trim())
    .filter((s) => s && s.length > 10)

  if (items.length > 0) {
    return filterHeaderLines(items)
  }

  // Last resort: split by sentences
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && s.length > 10 && !s.startsWith("**"))

  if (sentences.length > 0) {
    return filterHeaderLines(sentences.slice(0, 5))
  }

  return []
}

/**
 * Filter out section headers and other non-content lines
 */
function filterHeaderLines(items: string[]): string[] {
  return items.filter(
    (item) =>
      item.length > 3 &&
      !item.startsWith("**") &&
      !item.match(/^(What Worked|Fix Next|To Improve|Action Plan|Score Snapshot)/i)
  )
}

/**
 * Parse complete feedback with scores and sections
 */
export function parseFeedback(feedback: string): FeedbackSection {
  const sections: FeedbackSection = {
    tldr: "",
    scores: {
      understanding: 0,
      problemSolving: 0,
      codeQuality: 0,
      communication: 0,
      correctness: 0,
      efficiency: 0,
      reasoning: 0,
      reasoningExplanation: 0,
      aiCollaboration: 0,
      overall: 0,
    },
    scoreJustifications: {},
    whatWorked: [],
    fixNext: [],
    actionPlan: [],
    aiWatchlist: "",
  }

  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (tldrMatch) sections.tldr = tldrMatch[1].trim()

  const scoreSection = feedback.match(/\*\*Score Snapshot\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/i)
  if (scoreSection) {
    const scoreText = scoreSection[1]

    const understanding = parseScoreWithJustification("Understanding", scoreText, true)
    if (understanding.score === 0) {
      const alt = parseScoreWithJustification("Understanding", scoreText, false)
      sections.scores.understanding = alt.score
      if (alt.justification) sections.scoreJustifications.understanding = alt.justification
    } else {
      sections.scores.understanding = understanding.score
      if (understanding.justification)
        sections.scoreJustifications.understanding = understanding.justification
    }

    const problemSolving = parseScoreWithJustification("Problem[-\\s]?Solving", scoreText, true)
    if (problemSolving.score === 0) {
      const alt = parseScoreWithJustification("Problem[-\\s]?Solving", scoreText, false)
      sections.scores.problemSolving = alt.score
    } else {
      sections.scores.problemSolving = problemSolving.score
    }

    const codeQuality = parseScoreWithJustification("Code\\s+Quality", scoreText, true)
    if (codeQuality.score === 0) {
      const alt = parseScoreWithJustification("Code\\s+Quality", scoreText, false)
      sections.scores.codeQuality = alt.score
    } else {
      sections.scores.codeQuality = codeQuality.score
    }

    const communication = parseScoreWithJustification("Communication", scoreText, true)
    if (communication.score === 0) {
      const alt = parseScoreWithJustification("Communication", scoreText, false)
      sections.scores.communication = alt.score
    } else {
      sections.scores.communication = communication.score
    }

    const correctness = parseScoreWithJustification("Correctness", scoreText, true)
    sections.scores.correctness =
      correctness.score === 0
        ? parseScoreWithJustification("Correctness", scoreText, false).score
        : correctness.score

    const efficiency = parseScoreWithJustification("Efficiency", scoreText, true)
    sections.scores.efficiency =
      efficiency.score === 0
        ? parseScoreWithJustification("Efficiency", scoreText, false).score
        : efficiency.score

    const reasoning = parseScoreWithJustification(
      "Reasoning(?:\\s+&\\s+Explanation)?",
      scoreText,
      true
    )
    sections.scores.reasoning =
      reasoning.score === 0
        ? parseScoreWithJustification("Reasoning(?:\\s+&\\s+Explanation)?", scoreText, false).score
        : reasoning.score
    sections.scores.reasoningExplanation = sections.scores.reasoning

    if (sections.scores.communication === 0 && sections.scores.reasoning > 0) {
      sections.scores.communication = sections.scores.reasoning
    }

    const aiCollaboration = parseScoreWithJustification("AI\\s+Collaboration", scoreText, true)
    sections.scores.aiCollaboration =
      aiCollaboration.score === 0
        ? parseScoreWithJustification("AI\\s+Collaboration", scoreText, false).score
        : aiCollaboration.score

    if (sections.scores.understanding === 0 && sections.scores.correctness > 0) {
      sections.scores.understanding = Math.round(
        (sections.scores.correctness + sections.scores.reasoning) / 2
      )
    }
    if (sections.scores.problemSolving === 0 && sections.scores.efficiency > 0) {
      sections.scores.problemSolving = sections.scores.efficiency
    }

    const hasNewScores =
      sections.scores.understanding > 0 ||
      sections.scores.problemSolving > 0 ||
      sections.scores.codeQuality > 0 ||
      sections.scores.communication > 0

    if (hasNewScores) {
      // Use canonical weights from lib/scoring/types.ts SCORE_WEIGHTS.performance
      // Understanding: 25%, Problem-Solving: 25%, Code Quality: 30%, Communication: 20%
      sections.scores.overall = Math.round(
        sections.scores.understanding * 0.25 +
          sections.scores.problemSolving * 0.25 +
          sections.scores.codeQuality * 0.3 +
          sections.scores.communication * 0.2
      )
    } else {
      sections.scores.overall = Math.round(
        (sections.scores.correctness +
          sections.scores.efficiency +
          sections.scores.codeQuality +
          sections.scores.reasoning +
          sections.scores.aiCollaboration) /
          5
      )
    }
  }

  // Try multiple patterns for "What Worked" section (handles different markdown formats)
  const whatWorkedPatterns = [
    /\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /##\s*What Worked[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /###\s*What Worked[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /What Worked[:\s]*\n([\s\S]+?)(?=\n\*\*|\n##|\n###|Fix Next|To Improve|Action Plan|$)/i,
  ]
  for (const pattern of whatWorkedPatterns) {
    const match = feedback.match(pattern)
    if (match && match[1].trim()) {
      sections.whatWorked = parseBulletList(match[1])
      if (sections.whatWorked.length > 0) break
    }
  }

  // Try multiple patterns for "Fix Next" / "To Improve" section
  const fixNextPatterns = [
    /\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /\*\*To Improve\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /##\s*Fix Next[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /##\s*To Improve[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /###\s*Fix Next[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /###\s*To Improve[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /(?:Fix Next|To Improve)[:\s]*\n([\s\S]+?)(?=\n\*\*|\n##|\n###|Action Plan|What Worked|$)/i,
  ]
  for (const pattern of fixNextPatterns) {
    const match = feedback.match(pattern)
    if (match && match[1].trim()) {
      sections.fixNext = parseBulletList(match[1])
      if (sections.fixNext.length > 0) break
    }
  }

  const actionPlanMatch = feedback.match(/\*\*Action Plan\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (actionPlanMatch) {
    sections.actionPlan = parseBulletList(actionPlanMatch[1], true)
  }

  const aiWatchlistMatch = feedback.match(
    /\*\*AI & Communication Watchlist\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/
  )
  if (aiWatchlistMatch) sections.aiWatchlist = aiWatchlistMatch[1].trim()

  return sections
}

/**
 * Inject/replace scores in feedback text to ensure consistency with authoritative scores.
 * This is critical because AI-generated feedback or Constitutional AI revisions
 * may contain different scores than the algorithmically calculated ones.
 */
export function injectScoresIntoFeedback(
  feedback: string,
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  },
  scenarioType?: string
): string {
  let result = feedback

  // Replace scores in Score Snapshot section with correct values
  // Handle different label formats: "- Label:", "• Label:", "Label:", etc.
  // The pattern matches optional bullet (-, •, *) followed by label and score
  const bulletPrefix = "[-•*]?\\s*"

  if (scenarioType === "system-design") {
    result = result.replace(
      new RegExp(`(${bulletPrefix}Requirements:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.understanding}$2`
    )
    result = result.replace(
      new RegExp(`(${bulletPrefix}Architecture:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.problemSolving}$2`
    )
    result = result.replace(
      new RegExp(`(${bulletPrefix}Scalability:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.codeQuality}$2`
    )
  } else if (scenarioType === "bugfix") {
    result = result.replace(
      new RegExp(`(${bulletPrefix}Bug Found:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.understanding}$2`
    )
    result = result.replace(
      new RegExp(`(${bulletPrefix}Root Cause:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.problemSolving}$2`
    )
    result = result.replace(
      new RegExp(`(${bulletPrefix}Fix Quality:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.codeQuality}$2`
    )
  } else {
    // Default DSA format
    result = result.replace(
      new RegExp(`(${bulletPrefix}Understanding:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.understanding}$2`
    )
    result = result.replace(
      new RegExp(`(${bulletPrefix}Problem[-\\s]?Solving:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.problemSolving}$2`
    )
    result = result.replace(
      new RegExp(`(${bulletPrefix}Code\\s*Quality:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
      `$1${scores.codeQuality}$2`
    )
  }

  // Communication and Overall are common across all types
  result = result.replace(
    new RegExp(`(${bulletPrefix}Communication:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
    `$1${scores.communication}$2`
  )
  result = result.replace(
    new RegExp(`(${bulletPrefix}Overall:?\\s*)\\d+(\\s*/\\s*100)`, "gi"),
    `$1${scores.overall}$2`
  )

  return result
}

/**
 * Parse structured sections from feedback (legacy)
 * Now uses the improved parseBulletList function for better bullet extraction
 */
export function parseFeedbackSections(feedback: string): Partial<FeedbackSection> {
  const sections: Partial<FeedbackSection> = {}

  // Extract TL;DR - handle multiple formats
  const tldrPatterns = [
    /\*\*TL;DR\*\*[:\s–-]*([^\n*]+)/i,
    /##\s*TL;DR[:\s–-]*([^\n#]+)/i,
    /TL;DR[:\s–-]*([^\n*#]+)/i,
  ]
  for (const pattern of tldrPatterns) {
    const match = feedback.match(pattern)
    if (match && match[1].trim()) {
      sections.tldr = match[1].trim()
      break
    }
  }

  // Extract What Worked - use multiple patterns and parseBulletList
  const whatWorkedPatterns = [
    /\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /##\s*What Worked[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /###\s*What Worked[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /What Worked[:\s]*\n([\s\S]+?)(?=\n\*\*|\n##|\n###|Fix Next|To Improve|Action Plan|$)/i,
  ]
  for (const pattern of whatWorkedPatterns) {
    const match = feedback.match(pattern)
    if (match && match[1].trim()) {
      sections.whatWorked = parseBulletList(match[1])
      if (sections.whatWorked.length > 0) break
    }
  }

  // Extract Fix Next / To Improve - use multiple patterns and parseBulletList
  const fixNextPatterns = [
    /\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /\*\*To Improve\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /##\s*Fix Next[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /##\s*To Improve[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /###\s*Fix Next[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /###\s*To Improve[:\s]*([\s\S]+?)(?=\n\*\*|\n##|\n###|$)/i,
    /(?:Fix Next|To Improve)[:\s]*\n([\s\S]+?)(?=\n\*\*|\n##|\n###|Action Plan|What Worked|$)/i,
  ]
  for (const pattern of fixNextPatterns) {
    const match = feedback.match(pattern)
    if (match && match[1].trim()) {
      sections.fixNext = parseBulletList(match[1])
      if (sections.fixNext.length > 0) break
    }
  }

  // Extract Action Plan - use parseBulletList with numbered preference
  const actionPatterns = [
    /\*\*Action Plan\*\*[:\s]*([\s\S]+?)(?=\n\*\*|\n##|$)/i,
    /##\s*Action Plan[:\s]*([\s\S]+?)(?=\n\*\*|\n##|$)/i,
    /###\s*Action Plan[:\s]*([\s\S]+?)(?=\n\*\*|\n##|$)/i,
  ]
  for (const pattern of actionPatterns) {
    const match = feedback.match(pattern)
    if (match && match[1].trim()) {
      sections.actionPlan = parseBulletList(match[1], true)
      if (sections.actionPlan.length > 0) break
    }
  }

  // Extract AI Watchlist
  const watchlistMatch = feedback.match(
    /\*\*AI\s*(?:&|and)?\s*Communication Watchlist\*\*[:\s]*([^\n]+(?:\n[^*\n]+)*)/i
  )
  if (watchlistMatch) {
    sections.aiWatchlist = watchlistMatch[1].trim()
  }

  return sections
}
