import { describe, expect, it, vi } from "vitest"
import { getComplexityRank } from "@/lib/interview/shared-patterns"
import { buildComplexitySilentNotes } from "@/lib/interview/conversation-extraction/silent-notes"
import type { ExtractionResult } from "@/lib/interview/conversation-extraction/types"
import type { ConversationTracker } from "@/lib/interview/interview-phases"

// The edge analyzer imports the Edge AI provider at module scope; the semantic
// pass never runs in these fixtures (2 candidate messages), so stub it out.
vi.mock("@/lib/ai-providers-edge", () => ({
  generateAIResponseEdge: vi.fn(),
}))

import {
  analyzeTranscriptForMistakesEdge,
  type ProblemContext,
} from "@/lib/feedback/transcript-analysis-edge"

/**
 * wrong_complexity false-positive regression (session 2Iz2oYpGQxs6UNo6s7Hd).
 *
 * On Course Schedule the candidate's stated "O(n + n), n being the number of
 * courses and prerequisites" is O(V + E) in substance, but O(V + E) had no
 * complexity rank (unknown -> 50) while the stated form ranked linear (40), so
 * the "stated < optimal - 1" underclaim guard fired and recorded a mistake
 * against a correct candidate - for both time and space.
 */

describe("getComplexityRank graph/multi-variable forms", () => {
  it("ranks the O(V+E) family as linear", () => {
    expect(getComplexityRank("O(V + E)")).toBe(40)
    expect(getComplexityRank("O(n + m)")).toBe(40)
    expect(getComplexityRank("O(E)")).toBe(40)
    expect(getComplexityRank("O(V)")).toBe(40)
    expect(getComplexityRank("O(n + n)")).toBe(40)
  })

  it("keeps existing classifications unchanged", () => {
    expect(getComplexityRank("O(n log n)")).toBe(60)
    expect(getComplexityRank("O(n^2)")).toBe(80)
    expect(getComplexityRank("O(1)")).toBe(10)
    expect(getComplexityRank("O(x * y)")).toBe(50) // unknown fallback preserved
  })
})

describe("edge transcript analysis on graph problems", () => {
  const problemContext: ProblemContext = {
    title: "Course Schedule",
    optimalTimeComplexity: "O(V + E)",
    optimalSpaceComplexity: "O(V + E)",
    criticalEdgeCases: [],
  }

  it("does not flag a linear claim against an O(V + E) optimum", async () => {
    const result = await analyzeTranscriptForMistakesEdge(
      [
        { role: "candidate", content: "I'll model it as a graph and detect cycles with DFS." },
        { role: "interviewer", content: "Okay." },
        {
          role: "candidate",
          content:
            "The time complexity of my solution is O(n) counting courses plus prerequisites, and space is O(n) as well.",
        },
      ],
      problemContext
    )

    expect(result.silentNotes.filter((n) => n.type === "wrong_complexity")).toEqual([])
  })

  it("still flags a genuine underclaim", async () => {
    const result = await analyzeTranscriptForMistakesEdge(
      [
        { role: "candidate", content: "I'll scan with two nested loops." },
        { role: "interviewer", content: "Okay." },
        { role: "candidate", content: "The time complexity of my solution is O(1)." },
      ],
      { ...problemContext, optimalTimeComplexity: "O(n)", optimalSpaceComplexity: "O(n)" }
    )

    expect(result.silentNotes.some((n) => n.type === "wrong_complexity")).toBe(true)
  })
})

describe("live-tracker complexity silent notes on graph problems", () => {
  function createTracker(): ConversationTracker {
    return {
      approachExplained: true,
      approachType: "optimized",
      timeComplexityMentioned: true,
      timeComplexityValue: null,
      spaceComplexityMentioned: true,
      spaceComplexityValue: null,
      complexityExplanationGiven: true,
      edgeCasesMentioned: [],
      edgeCasesAskedByInterviewer: [],
      hasStartedCoding: true,
      hasRunTests: false,
      wasAskedToOptimize: false,
      didOptimize: false,
      bugsMade: 0,
      bugsSelfCorrected: 0,
      hintsGiven: 0,
      silentNotes: [],
    }
  }

  function createExtraction(time: string, space: string): ExtractionResult {
    return {
      approachExplained: true,
      approachType: "optimized",
      approachQuality: "specific",
      timeComplexityMentioned: true,
      timeComplexityValue: time,
      dominantComplexity: time,
      spaceComplexityMentioned: true,
      spaceComplexityValue: space,
      complexityExplanationGiven: true,
      edgeCasesMentioned: [],
      clarifyingQuestionsAsked: false,
      answeredInterviewerQuestions: 0,
    }
  }

  const optimal = { optimalTimeComplexity: "O(V + E)", optimalSpaceComplexity: "O(V + E)" }

  it("does not record notes for linear claims against O(V + E)", () => {
    const notes = buildComplexitySilentNotes(
      createExtraction("O(n + n)", "O(n)"),
      createTracker(),
      optimal
    )
    expect(notes).toBeUndefined()
  })

  it("still records a genuine underclaim", () => {
    const notes = buildComplexitySilentNotes(createExtraction("O(1)", "O(1)"), createTracker(), {
      optimalTimeComplexity: "O(n)",
      optimalSpaceComplexity: "O(n)",
    })
    expect(notes?.some((n) => n.type === "wrong_complexity")).toBe(true)
  })
})
