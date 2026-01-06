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

  // Try different bullet patterns in order of preference
  const bulletPatterns = [
    /\n[-•*]\s*/, // Standard bullets: -, •, *
    /\n\d+\.\s*/, // Numbered: 1., 2., etc.
  ]

  // Try pattern based on preference
  const pattern = preferNumbered ? bulletPatterns[1] : bulletPatterns[0]
  let items = trimmed
    .split(pattern)
    .map((s) => s.trim())
    .filter((s) => s && s.length > 0)

  // If no items found with primary pattern, try the other
  if (items.length <= 1) {
    const altPattern = preferNumbered ? bulletPatterns[0] : bulletPatterns[1]
    items = trimmed
      .split(altPattern)
      .map((s) => s.trim())
      .filter((s) => s && s.length > 0)
  }

  // If still no items, try splitting by lines that start with bullet chars
  if (items.length <= 1) {
    const lines = trimmed.split("\n")
    items = lines
      .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((s) => s && s.length > 5) // Filter out very short lines
  }

  // Final fallback: if text is just paragraphs, split by sentences
  if (items.length === 0) {
    const sentences = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s && s.length > 10 && !s.startsWith("**"))
    if (sentences.length > 0) {
      items = sentences.slice(0, 5) // Max 5 items from sentence fallback
    }
  }

  // Remove any items that are just section headers or empty-looking
  return items.filter(
    (item) =>
      item.length > 3 && !item.startsWith("**") && !item.match(/^(What|Fix|To|Action|Score)/)
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
      sections.scores.overall = Math.round(
        sections.scores.understanding * 0.3 +
          sections.scores.problemSolving * 0.25 +
          sections.scores.codeQuality * 0.25 +
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

  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (whatWorkedMatch) {
    sections.whatWorked = parseBulletList(whatWorkedMatch[1])
  }

  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (fixNextMatch) {
    sections.fixNext = parseBulletList(fixNextMatch[1])
  }

  // Also try "To Improve" as an alternative header
  if (sections.fixNext.length === 0) {
    const toImproveMatch = feedback.match(/\*\*To Improve\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
    if (toImproveMatch) {
      sections.fixNext = parseBulletList(toImproveMatch[1])
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
 * Parse structured sections from feedback (legacy)
 * @deprecated Use parseFeedback instead
 */
export function parseFeedbackSections(feedback: string): Partial<FeedbackSection> {
  const sections: Partial<FeedbackSection> = {}

  // Extract TL;DR
  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([^\n*]+)/i)
  if (tldrMatch) {
    sections.tldr = tldrMatch[1].trim()
  }

  // Extract What Worked (bullet points)
  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[\s\S]*?((?:-[^\n]+\n?)+)/i)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1]
      .split("\n")
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter((line) => line.length > 0)
  }

  // Extract Fix Next
  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[\s\S]*?((?:-[^\n]+\n?)+)/i)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1]
      .split("\n")
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter((line) => line.length > 0)
  }

  // Extract Action Plan
  const actionMatch = feedback.match(/\*\*Action Plan\*\*[\s\S]*?((?:\d+\.[^\n]+\n?)+)/i)
  if (actionMatch) {
    sections.actionPlan = actionMatch[1]
      .split("\n")
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 0)
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
