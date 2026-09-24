import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BugfixEvidenceSummary, BugfixScoreBreakdown } from "../types"

const mocks = vi.hoisted(() => ({
  generateAIResponseEdge: vi.fn(),
}))

vi.mock("@/lib/ai-providers-edge", () => ({
  generateAIResponseEdge: mocks.generateAIResponseEdge,
}))

import {
  BUGFIX_SEMANTIC_MAX_TOKENS,
  scoreBugfixSemantics,
} from "../semantic-scorer"

const deterministicSubScores: Omit<BugfixScoreBreakdown, "overall"> = {
  reproductionDiscipline: 100,
  codebaseNavigation: 100,
  evidenceGathering: 100,
  hypothesisQuality: 50,
  minimalFixQuality: 100,
  verificationDiscipline: 100,
  overEditControl: 100,
  rootCauseUnderstanding: 50,
  regressionPrevention: 50,
  aiCollaborationQuality: 90,
  communication: 50,
}

const evidenceSummary: BugfixEvidenceSummary = {
  reproducedBeforeEditing: true,
  inspectedFiles: ["matcher.ts"],
  inspectedTestOrDocs: ["matcher.test.ts"],
  editedFiles: ["matcher.ts"],
  expectedTouchedFiles: ["matcher.ts"],
  overEditedFiles: [],
  hypothesisCount: 1,
  visibleTestsRun: 2,
  finalPassRate: 100,
  preventionExplained: true,
  rootCauseExplained: true,
  aiShortcutCount: 0,
  aiPartnerUseCount: 1,
  hypothesisText: "",
  rootCauseText: "",
  preventionText: "",
}

describe("scoreBugfixSemantics provider configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateAIResponseEdge.mockResolvedValue({
      text: JSON.stringify({
        hypothesisQuality: 90,
        rootCauseAccuracy: 95,
        preventionQuality: 85,
        communicationScore: 90,
      }),
      provider: "openai",
      latencyMs: 100,
    })
  })

  it("gives primary GPT enough budget for medium reasoning before fallback", async () => {
    const onUsage = vi.fn()

    await scoreBugfixSemantics(
      {
        deterministicSubScores,
        evidenceSummary,
        rootCauseRubric: ["Explain the duplicate settlement match"],
        bugDescription: "Settled adjustments are matched twice",
        conversationExcerpt: "candidate: The matcher is not excluding settled adjustments.",
      },
      onUsage
    )

    expect(BUGFIX_SEMANTIC_MAX_TOKENS).toBe(1024)
    expect(mocks.generateAIResponseEdge).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      {
        maxTokens: 1024,
        temperature: 0,
        reasoningEffort: "medium",
        onUsage,
      }
    )
  })
})
