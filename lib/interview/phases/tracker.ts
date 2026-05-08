import {
  extractComplexityFromText,
  extractEdgeCases,
  normalizeComplexity,
} from "../shared-patterns"
import type { ConversationTracker, SilentNote, SilentNoteType } from "./types"

export function createEmptyTracker(): ConversationTracker {
  return {
    approachExplained: false,
    approachType: "none",
    timeComplexityMentioned: false,
    timeComplexityValue: null,
    spaceComplexityMentioned: false,
    spaceComplexityValue: null,
    complexityExplanationGiven: false,
    edgeCasesMentioned: [],
    edgeCasesAskedByInterviewer: [],
    hasStartedCoding: false,
    hasRunTests: false,
    wasAskedToOptimize: false,
    didOptimize: false,
    bugsMade: 0,
    bugsSelfCorrected: 0,
    hintsGiven: 0,
    silentNotes: [],
  }
}

export function addSilentNote(
  tracker: ConversationTracker,
  note: Omit<SilentNote, "timestamp">
): ConversationTracker {
  return {
    ...tracker,
    silentNotes: [
      ...(tracker.silentNotes || []),
      {
        ...note,
        timestamp: Date.now(),
      },
    ],
  }
}

export function getSilentNoteDescription(type: SilentNoteType): string {
  const descriptions: Record<SilentNoteType, string> = {
    wrong_complexity: "Incorrect complexity analysis",
    wrong_edge_case: "Wrong answer for edge case",
    missed_edge_case: "Missed important edge case",
    wrong_optimality: "Incorrect optimality assessment",
    confused_approach: "Confused different approaches",
    incomplete_answer: "Incomplete or vague answer",
    deflection: "Deflected interviewer question",
  }
  return descriptions[type] || type
}

export function updateTrackerFromMessage(
  tracker: ConversationTracker,
  message: string,
  role: "user" | "interviewer"
): ConversationTracker {
  const updated = { ...tracker }
  const lowerMessage = message.toLowerCase()

  if (role === "user") {
    if (
      lowerMessage.includes("approach") ||
      lowerMessage.includes("i would") ||
      lowerMessage.includes("i'll use") ||
      lowerMessage.includes("my plan") ||
      lowerMessage.includes("thinking")
    ) {
      updated.approachExplained = true
    }

    const extractedComplexity = extractComplexityFromText(message)

    if (extractedComplexity) {
      if (lowerMessage.includes("space") || lowerMessage.includes("memory")) {
        updated.spaceComplexityMentioned = true
        updated.spaceComplexityValue = extractedComplexity
      } else {
        updated.timeComplexityMentioned = true
        updated.timeComplexityValue = extractedComplexity
      }
    }

    if (
      !extractedComplexity &&
      (lowerMessage.includes("linear") ||
        lowerMessage.includes("constant") ||
        lowerMessage.includes("quadratic") ||
        lowerMessage.includes("logarithmic") ||
        lowerMessage.includes("exponential"))
    ) {
      updated.timeComplexityMentioned = true
      updated.timeComplexityValue = normalizeComplexity(lowerMessage)
    }

    if (
      updated.timeComplexityMentioned &&
      (lowerMessage.includes("because") ||
        lowerMessage.includes("since") ||
        lowerMessage.includes("due to") ||
        lowerMessage.includes("loop") ||
        lowerMessage.includes("iterate") ||
        lowerMessage.includes("through"))
    ) {
      updated.complexityExplanationGiven = true
    }

    const mentionedEdgeCases = extractEdgeCases(message)
    mentionedEdgeCases.forEach((keyword) => {
      if (!updated.edgeCasesMentioned.includes(keyword)) {
        updated.edgeCasesMentioned.push(keyword)
      }
    })

    if (
      lowerMessage.includes("brute force") ||
      lowerMessage.includes("nested loop") ||
      lowerMessage.includes("n squared") ||
      lowerMessage.includes("n^2")
    ) {
      updated.approachType = "brute_force"
    } else if (
      lowerMessage.includes("hash") ||
      lowerMessage.includes("map") ||
      lowerMessage.includes("set") ||
      lowerMessage.includes("optimize") ||
      lowerMessage.includes("better")
    ) {
      if (updated.approachType === "brute_force") {
        updated.didOptimize = true
      }
      updated.approachType = "optimized"
    }
  }

  if (role === "interviewer") {
    if (
      lowerMessage.includes("optimize") ||
      lowerMessage.includes("better approach") ||
      lowerMessage.includes("improve")
    ) {
      updated.wasAskedToOptimize = true
    }

    const askedEdgeCases = extractEdgeCases(message)
    askedEdgeCases.forEach((keyword) => {
      if (!updated.edgeCasesAskedByInterviewer.includes(keyword)) {
        updated.edgeCasesAskedByInterviewer.push(keyword)
      }
    })

    if (
      lowerMessage.includes("hint") ||
      lowerMessage.includes("consider") ||
      lowerMessage.includes("think about") ||
      lowerMessage.includes("what if")
    ) {
      updated.hintsGiven++
    }
  }

  return updated
}

export function buildTrackingContext(tracker: ConversationTracker): string {
  const sections: string[] = []

  if (tracker.approachExplained) {
    sections.push(`CANDIDATE HAS EXPLAINED APPROACH: ${tracker.approachType}`)
    if (tracker.approachType === "brute_force" && !tracker.wasAskedToOptimize) {
      sections.push(`-> ACTION: Ask if they can optimize`)
    }
    if (tracker.wasAskedToOptimize && tracker.didOptimize) {
      sections.push(`-> Candidate improved from brute force to optimized (GOOD SIGNAL)`)
    }
  } else {
    sections.push(`CANDIDATE HAS NOT YET EXPLAINED APPROACH`)
  }

  if (tracker.timeComplexityMentioned) {
    sections.push(
      `TIME COMPLEXITY DISCUSSED: ${tracker.timeComplexityValue}${tracker.complexityExplanationGiven ? " (with explanation)" : " (no explanation given)"}`
    )
    if (!tracker.complexityExplanationGiven) {
      sections.push(`-> ACTION: Ask them to walk through their reasoning`)
    }
  }
  if (tracker.spaceComplexityMentioned) {
    sections.push(`SPACE COMPLEXITY DISCUSSED: ${tracker.spaceComplexityValue}`)
  }

  if (tracker.edgeCasesMentioned.length > 0) {
    sections.push(`EDGE CASES CANDIDATE MENTIONED: ${tracker.edgeCasesMentioned.join(", ")}`)
    sections.push(`-> DO NOT say they didn't mention edge cases - they did!`)
  }
  if (tracker.edgeCasesAskedByInterviewer.length > 0) {
    sections.push(
      `EDGE CASES YOU ALREADY ASKED ABOUT: ${tracker.edgeCasesAskedByInterviewer.join(", ")}`
    )
    sections.push(`-> DO NOT ask about these again`)
  }

  if (tracker.hintsGiven > 0) {
    sections.push(`HINTS GIVEN SO FAR: ${tracker.hintsGiven}`)
  }

  return sections.length > 0
    ? `\nCONVERSATION TRACKING (what has already been covered):\n${sections.join("\n")}\n`
    : ""
}
