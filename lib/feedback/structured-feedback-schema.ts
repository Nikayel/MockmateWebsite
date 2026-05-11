import { z } from "zod"
import type { FeedbackScores, StructuredFeedback } from "./types"
import { parseFeedbackSections } from "./parsers"

const stringArraySchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) return value
    if (typeof value === "string") return [value]
    return []
  }, z.array(z.string()))
  .default([])
  .transform((items) => items.map((item) => item.trim()).filter((item) => item.length > 0))

export const feedbackSectionsSchema = z.object({
  tldr: z.string().optional().default(""),
  whatWorked: stringArraySchema,
  fixNext: stringArraySchema,
  actionPlan: stringArraySchema,
})

export const structuredFeedbackSchema = feedbackSectionsSchema.extend({
  scores: z.custom<FeedbackScores>(),
  aiWatchlist: z.string().optional().default(""),
  rawFeedback: z.string().optional().default(""),
})

export interface FeedbackSectionDefaults {
  rawFeedback?: string
  scenarioTitle?: string
  testsPassed?: number
  testsTotal?: number
  overallScore?: number
}

function buildFallbackSections(options: FeedbackSectionDefaults) {
  const testsPassed = options.testsPassed ?? 0
  const testsTotal = options.testsTotal ?? 0
  const hasTests = testsTotal > 0
  const solved = testsTotal > 0 && testsPassed === testsTotal
  const attempted = !hasTests || testsPassed > 0
  const subject = options.scenarioTitle ? ` on ${options.scenarioTitle}` : ""

  return {
    tldr:
      options.overallScore !== undefined
        ? `Interview score: ${Math.round(options.overallScore)}%.`
        : "Feedback generated successfully.",
    whatWorked: solved
      ? [`Passed all ${testsTotal} test cases${subject}`, "Completed the core solution requirements"]
      : !hasTests
        ? ["Completed the interview submission", "Created material for the evaluator to review"]
      : attempted
        ? [
            `Made progress with ${testsPassed}/${testsTotal} tests passing`,
            "Worked through the problem instead of leaving it blank",
          ]
        : ["Started the interview and submitted an attempt"],
    fixNext: solved
      ? [
          "Explain the approach and trade-offs clearly before final submission",
          "Call out edge cases and complexity explicitly",
        ]
      : [
          "Trace the failing cases to find the first broken assumption",
          "Break the solution into smaller verified steps before submitting",
        ],
    actionPlan: [
      "Review the final solution against the problem constraints",
      "Practice narrating the approach, complexity, and edge cases out loud",
    ],
  }
}

export function completeFeedbackSections(
  input: Partial<z.input<typeof feedbackSectionsSchema>>,
  options: FeedbackSectionDefaults = {}
) {
  const parsed = feedbackSectionsSchema.parse(input)
  const markdownSections = options.rawFeedback ? parseFeedbackSections(options.rawFeedback) : {}
  const fallback = buildFallbackSections(options)

  return {
    tldr: parsed.tldr || markdownSections.tldr || fallback.tldr,
    whatWorked:
      parsed.whatWorked.length > 0
        ? parsed.whatWorked
        : markdownSections.whatWorked && markdownSections.whatWorked.length > 0
          ? markdownSections.whatWorked
          : fallback.whatWorked,
    fixNext:
      parsed.fixNext.length > 0
        ? parsed.fixNext
        : markdownSections.fixNext && markdownSections.fixNext.length > 0
          ? markdownSections.fixNext
          : fallback.fixNext,
    actionPlan:
      parsed.actionPlan.length > 0
        ? parsed.actionPlan
        : markdownSections.actionPlan && markdownSections.actionPlan.length > 0
          ? markdownSections.actionPlan
          : fallback.actionPlan,
  }
}

export function completeStructuredFeedback(
  input: Partial<StructuredFeedback> & { scores: FeedbackScores },
  options: FeedbackSectionDefaults = {}
): StructuredFeedback {
  const parsed = structuredFeedbackSchema.parse(input)
  const sections = completeFeedbackSections(parsed, {
    ...options,
    rawFeedback: options.rawFeedback ?? parsed.rawFeedback,
    overallScore: options.overallScore ?? parsed.scores.overall,
  })

  return {
    scores: parsed.scores,
    ...sections,
    aiWatchlist: parsed.aiWatchlist || "No watchlist items captured.",
    rawFeedback: parsed.rawFeedback,
  }
}
